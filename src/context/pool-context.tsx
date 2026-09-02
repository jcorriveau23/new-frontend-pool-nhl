/*
Module that share context related to the selected pool.
*/
"use client";
import {
  DailyRosterPoints,
  DraftPickUndoneResponse,
  PlayerDraftedResponse,
  Pool,
  PoolUser,
  RosterModifiedResponse,
} from "@/data/pool/model";
import { apiGet } from "@/lib/client-api";
import { planScoreFetch } from "@/lib/pool-score-cache";
import {
  findLastScoredDate,
  getPlayersOwner,
  getProtectedPlayers,
  hasPoolPrivilege,
} from "@/lib/pool-roster";
import {
  applyDraftPickUndone,
  applyPlayerDrafted,
  applyRosterModified,
} from "@/lib/draft-delta";
import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "@/i18n/routing";
import { db } from "@/db";
import { format } from "date-fns";
import { useDateContext } from "./date-context";
import { useSearchParams } from "next/navigation";
import { useUser } from "./useUserData";
import {
  GoalieDailyInfo,
  SkaterDailyInfo,
  TotalDailyPoints,
  getDailyGoaliesStatsWithCumulative,
  getDailySkatersStatsWithCumulative,
} from "@/lib/scoring";

export interface DailyPoolPointsMade {
  // Daily pool information.
  dateOfInterest: string;
  cumulated: boolean;
  forwardsDailyStats: Record<string, SkaterDailyInfo[]>;
  defendersDailyStats: Record<string, SkaterDailyInfo[]>;
  goaliesDailyStats: Record<string, GoalieDailyInfo[]>;
  totalDailyPoints: TotalDailyPoints[];
}

export interface PoolContextProps {
  // keeps the information of which participant is selected across the pool.
  selectedParticipant: string;
  selectedPoolUser: PoolUser;
  updateSelectedParticipant: (participant: string) => void;

  // The participant the connected user plays as in this pool, when they are
  // one of them. Null for a visitor, and for the poolers a pool owner manages
  // on behalf of somebody else. It stays null until Hanko has validated the
  // session, which happens after the first render.
  userPoolUser: PoolUser | null;

  // The last pool date stored into the pool.
  lastFormatDate: string | null;

  // The day (yyyy-MM-dd) the pool information is being displayed for. This is
  // the selected date, or the last day of the pool when none is selected.
  dateOfInterest: string;

  // The start Date and selected of the pool (This must be in the pool season time range!)
  poolStartDate: Date;
  poolSelectedEndDate: Date;

  // Map the player id to its pool owner name.
  playersOwner: Record<number, string>;
  protectedPlayers: Record<number, string> | null;

  poolInfo: Pool;
  updatePoolInfo: (newPoolInfo: Pool) => void;

  // Applies a draft socket delta (a single pick, or its undo) to the pool.
  // Falls back to refetching the pool when the delta cannot be applied, which
  // means this client missed an earlier update.
  applyDraftDelta: (
    delta:
      | { PlayerDrafted: PlayerDraftedResponse }
      | { DraftPickUndone: DraftPickUndoneResponse }
      | { RosterModified: RosterModifiedResponse }
  ) => void;

  // Drop the local copy of the pool and take the server's. Needed on every
  // socket reconnect: the room only republishes its user list on JoinRoom, so
  // anything that happened while the socket was down is not replayed.
  resyncPoolInfo: () => void;

  dictUsers: Record<string, PoolUser>;

  dailyPointsMade: DailyPoolPointsMade | null;
}

const PoolContext = createContext<PoolContextProps | undefined>(undefined);

export const usePoolContext = (): PoolContextProps => {
  const context = useContext(PoolContext);
  if (!context) {
    throw new Error("usePoolContext must be used within a DateProvider");
  }
  return context;
};

interface PoolContextProviderProps {
  children: ReactNode;
  pool: Pool;
}

const getPoolDictUsers = (pool: Pool) =>
  pool.participants.reduce((acc: Record<string, PoolUser>, user) => {
    acc[user.id] = user;
    return acc;
  }, {});

// Re-exported from `@/lib/pool-roster`, where it is tested. Kept on this
// module because that is where the rest of the app already imports it from.
export { hasPoolPrivilege };

const mergeScoreByDay = (mergedPoolInfo: Pool, poolDb: Pool) => {
  // Merge score_by_day field. The pool database fields are being overided by the pool information.
  if (mergedPoolInfo.context === null) {
    mergedPoolInfo.context = poolDb.context;
    return;
  }

  mergedPoolInfo.context.score_by_day = {
    ...poolDb.context?.score_by_day,
    ...mergedPoolInfo.context.score_by_day,
  };
};

/*
`name` comes from the [name] route segment and reaches this function still
percent-encoded ("Raph%20gagne"), because the next-intl rewrite in proxy.ts
does not decode the dynamic segments of the pages it rewrites. It is therefore
interpolated into the path as-is: running it through encodeURIComponent would
double-encode it and the backend would look up a pool literally named
"Raph%20gagne".
*/
export const fetchPoolInfo = async (name: string): Promise<Pool | string> => {
  // Pool metadata (participants, settings, roster, lineup events).
  const res = await apiGet<Pool>(`/pool/${name}`);
  if (!res.ok) {
    return res.error;
  }
  const data = res.data;

  // The locally cached copy of the pool (Dexie), used both to fetch only the
  // missing score days and to preserve the row id so the put() updates in place.
  // @ts-expect-error, Dexie is not typed.
  const poolDb: Pool = await db.pools.get({ name: name });

  // Scores are derived on demand server-side from the lineup events + daily
  // stats, shaped like the legacy score_by_day so the rest of the UI is
  // unchanged. Past days never change, so only fetch the days missing from the
  // local cache; the last cached day is re-fetched since it may have been
  // stored while its games were still in progress.
  if (data.context) {
    const cachedScores = poolDb?.context?.score_by_day ?? null;
    const { range, trustedCachedDates } = planScoreFetch({
      seasonStart: data.season_start,
      seasonEnd: data.season_end,
      today: format(new Date(), "yyyy-MM-dd"),
      cachedDates: cachedScores ? Object.keys(cachedScores) : [],
    });

    const cachedByDay = Object.fromEntries(
      trustedCachedDates.map((date) => [date, cachedScores![date]])
    );

    if (range === null) {
      // Before opening night there is nothing to derive; the old code sent the
      // backend a backwards range here.
      data.context.score_by_day = cachedByDay;
    } else {
      const scoresRes = await apiGet<
        Record<string, Record<string, DailyRosterPoints>>
      >(`/pool-scores/${name}/cumulative/${range.start}/${range.end}`);

      if (scoresRes.ok) {
        // Freshly derived days override the cached ones.
        data.context.score_by_day = {
          ...cachedByDay,
          ...scoresRes.data,
        };
      } else {
        // Keep whatever we had locally so the UI can still render history.
        data.context.score_by_day = cachedByDay;
        console.error(`could not fetch derived scores: ${scoresRes.error}`);
      }
    }
  }

  if (poolDb) {
    data.id = poolDb.id;
  }

  // @ts-expect-error, Dexie is not typed.
  db.pools.put(data, "name");
  return data;
};

export const PoolContextProvider: React.FC<PoolContextProviderProps> = ({
  children,
  pool,
}) => {
  const searchParams = useSearchParams();
  const [poolInfo, setPoolInfo] = useState<Pool>(pool);
  const { currentDate, querySelectedDate } = useDateContext();
  const [dailyPointsMade, setDailyPointsMade] =
    useState<DailyPoolPointsMade | null>(null);

  const lastFormatDate = findLastScoredDate(poolInfo);

  const dateOfInterest =
    querySelectedDate !== "now"
      ? querySelectedDate
      : lastFormatDate
      ? lastFormatDate
      : format(currentDate, "yyyy-MM-dd");

  // Now parse all the pool date from the start of the season to the current date.
  const poolStartDate = new Date(poolInfo.season_start + "T00:00:00");
  const poolEndDate = new Date(poolInfo.season_end + "T00:00:00");
  const endDate = new Date(dateOfInterest + "T00:00:00");

  const poolSelectedEndDate =
    endDate < poolStartDate
      ? new Date(poolInfo.season_start + "T00:00:00")
      : endDate > poolEndDate
      ? new Date(poolInfo.season_end + "T00:00:00")
      : endDate;

  const [dictUsers, setDictUsers] = useState<Record<string, PoolUser>>(
    getPoolDictUsers(pool)
  );

  const getQuerySelectedParticipant = (): string | null => {
    // The pooler asked for by the URL, when it names one of this pool's
    // participants. This is what makes a shared link land on the right pooler.
    const queryParams = new URLSearchParams(searchParams.toString());
    const queryParticipant = queryParams.get("selectedParticipant");

    return queryParticipant !== null &&
      poolInfo.participants.some((user) => user.name === queryParticipant)
      ? queryParticipant
      : null;
  };

  const getInitialSelectedParticipant = (): string => {
    // Return the initial selected participant. The connected user is not known
    // yet on this first render, so their own team is picked by the effect
    // below instead; this is only the fallback until then.
    if (poolInfo.participants === null || poolInfo.participants.length === 0)
      return "";

    return getQuerySelectedParticipant() ?? poolInfo.participants[0].name;
  };
  const router = useRouter();
  const [selectedParticipant, setSelectedParticipant] = React.useState<string>(
    getInitialSelectedParticipant()
  );

  // Whether the pooler in view was asked for — by the URL, or by a click —
  // rather than being the fallback the provider mounted with. Only the
  // fallback may be replaced by the connected user's own team below.
  const hasChosenParticipant = useRef(getQuerySelectedParticipant() !== null);
  const [selectedPoolUser, setSelectedPoolUser] = React.useState<PoolUser>(
    poolInfo.participants.find((user) => user.name === selectedParticipant) ??
      poolInfo.participants[0]
  );
  const userData = useUser();

  // The participant the connected user plays as, when they are in this pool.
  const userPoolUser = React.useMemo(
    () =>
      poolInfo.participants.find(
        (user) => user.id !== "" && user.id === userData.info?.id
      ) ?? null,
    [poolInfo.participants, userData.info?.id]
  );

  // Hanko validates the session after the first render, so the connected user
  // reaches the provider too late to seed the state above. As long as nothing
  // has been asked for, the pool opens on the user's own team rather than on
  // whoever happens to be first in the registration order.
  React.useEffect(() => {
    if (hasChosenParticipant.current || userPoolUser === null) {
      return;
    }
    hasChosenParticipant.current = true;
    setSelectedParticipant(userPoolUser.name);
    setSelectedPoolUser(userPoolUser);
  }, [userPoolUser]);

  // The pool selection is carried by the pooler's name (it is what the
  // shareable `selectedParticipant` link holds), but the owner can rename a
  // pooler at any time. Following the rename on the id keeps the pooler in view
  // selected, instead of leaving the selection on a name nobody carries anymore.
  React.useEffect(() => {
    const renamed = poolInfo.participants.find(
      (user) => user.id === selectedPoolUser?.id
    );
    if (renamed === undefined || renamed.name === selectedParticipant) {
      return;
    }
    setSelectedParticipant(renamed.name);
    setSelectedPoolUser(renamed);
  }, [poolInfo.participants, selectedPoolUser, selectedParticipant]);

  const [playersOwner, setPlayersOwner] = React.useState<
    Record<number, string>
  >(getPlayersOwner(poolInfo));
  const [protectedPlayers, setProtectedPlayers] = React.useState<Record<
    number,
    string
  > | null>(getProtectedPlayers(poolInfo, dictUsers));

  // Memoised so consumers can safely use it as an effect dependency (the
  // popstate listeners in the pool pages do) without re-subscribing on every
  // render of the provider.
  const updateSelectedParticipant = React.useCallback(
    (participant: string) => {
      hasChosenParticipant.current = true;
      setSelectedParticipant(participant);
      setSelectedPoolUser(
        poolInfo.participants.find((user) => user.name === participant) ??
          poolInfo.participants[0]
      );
      const queryParams = new URLSearchParams(searchParams.toString());
      queryParams.set("selectedParticipant", participant);
      // Keep the URL query in sync without scrolling back to the top. The UI is
      // already driven by the local state set above, so this is only for
      // shareable/reloadable URLs — use replace + scroll:false to avoid the jump.
      router.replace(`/pool/${poolInfo.name}/?${queryParams.toString()}`, {
        scroll: false,
      });
    },
    [poolInfo.participants, poolInfo.name, searchParams, router]
  );

  React.useEffect(() => {
    const dayInfo = poolInfo.context?.score_by_day?.[dateOfInterest];

    const forwardsDailyStatsTemp: Record<string, SkaterDailyInfo[]> = {};
    const defendersDailyStatsTemp: Record<string, SkaterDailyInfo[]> = {};
    const goaliesDailyStatsTemp: Record<string, GoalieDailyInfo[]> = {};
    const totalDailyPointsTemp: TotalDailyPoints[] = [];
    let cumulated = false;

    for (let i = 0; i < poolInfo.participants.length; i += 1) {
      // Parse all participants daily locked roster to query its daily stats.
      const user = poolInfo.participants[i];

      if (dayInfo && dayInfo[user.id].is_cumulated) {
        cumulated = true;
        // the information is cumulated in the pool directly get it from there since it
        // is what is being used to display the cumulative page.
        forwardsDailyStatsTemp[user.id] = getDailySkatersStatsWithCumulative(
          dayInfo[user.id].roster.F,
          poolInfo.settings.forwards_settings
        );
        defendersDailyStatsTemp[user.id] = getDailySkatersStatsWithCumulative(
          dayInfo[user.id].roster.D,
          poolInfo.settings.defense_settings
        );
        goaliesDailyStatsTemp[user.id] = getDailyGoaliesStatsWithCumulative(
          dayInfo[user.id].roster.G,
          poolInfo.settings.goalies_settings
        );
      } else {
        // No derived scores for this day yet (e.g. previewing a future roster).
        setDailyPointsMade(null);
        return;
      }
      totalDailyPointsTemp.push(
        new TotalDailyPoints(
          user.name,
          forwardsDailyStatsTemp[user.id],
          defendersDailyStatsTemp[user.id],
          goaliesDailyStatsTemp[user.id],
          poolInfo.settings
        )
      );
    }

    setDailyPointsMade({
      dateOfInterest,
      cumulated,
      forwardsDailyStats: forwardsDailyStatsTemp,
      defendersDailyStats: defendersDailyStatsTemp,
      goaliesDailyStats: goaliesDailyStatsTemp,
      totalDailyPoints: totalDailyPointsTemp,
    });
  }, [dateOfInterest, poolInfo]);

  // The always-current pool, and the reason it exists twice.
  //
  // `poolInfo` reaches React state only after the Dexie read below resolves, so
  // it lags. The draft socket cannot read it from a render closure either: the
  // message handler is installed once at mount and would forever see the pool
  // as it was on the first render. `updatePoolInfo` is the only writer of the
  // pool, so this ref — which it updates synchronously — is authoritative, and
  // the draft deltas are applied on top of it.
  const poolInfoRef = useRef(poolInfo);

  // Only ever calls state setters and the pure helpers above, so it is stable
  // for the lifetime of the provider. That matters: the draft socket installs
  // its message handler once, and the handler reaches the pool through here.
  const updatePoolInfo = useCallback((newPoolInfo: Pool) => {
    poolInfoRef.current = newPoolInfo;
    // @ts-expect-error, dexie is not typed.
    db.pools.get({ name: newPoolInfo.name }).then((poolDb) => {
      mergeScoreByDay(newPoolInfo, poolDb);
      newPoolInfo.id = poolDb.id;
      // @ts-expect-error, dexie is not typed.
      db.pools.put(newPoolInfo, "name");
      // Two picks landing back to back both reach this callback. Only the
      // newest may reach the state, otherwise the draft board flickers back to
      // the superseded pool — or stays on it, if the reads resolve out of order.
      if (poolInfoRef.current !== newPoolInfo) {
        return;
      }
      setPoolInfo(newPoolInfo);
    });
    const newDictUsers = getPoolDictUsers(newPoolInfo);
    setPlayersOwner(getPlayersOwner(newPoolInfo));
    setProtectedPlayers(getProtectedPlayers(newPoolInfo, newDictUsers));
    setDictUsers(newDictUsers);
  }, []);

  const resyncInFlight = useRef(false);

  // Drop the local copy of the pool and take the server's. Used when a draft
  // delta does not fit the pool we hold, which means we missed an update.
  const resyncPoolInfo = useCallback(
    async () => {
      // A burst of unusable deltas should trigger one refetch, not one each.
      if (resyncInFlight.current) {
        return;
      }
      resyncInFlight.current = true;
      try {
        const refreshedPool = await fetchPoolInfo(poolInfoRef.current.name);
        if (typeof refreshedPool === "string") {
          console.error(`could not resynchronize the pool: ${refreshedPool}`);
          return;
        }
        updatePoolInfo(refreshedPool);
      } finally {
        resyncInFlight.current = false;
      }
    },
    [updatePoolInfo]
  );

  const applyDraftDelta = useCallback(
    (
      delta:
        | { PlayerDrafted: PlayerDraftedResponse }
        | { DraftPickUndone: DraftPickUndoneResponse }
        | { RosterModified: RosterModifiedResponse }
    ) => {
      const currentPool = poolInfoRef.current;
      let newPoolInfo: Pool | null;
      if ("PlayerDrafted" in delta) {
        newPoolInfo = applyPlayerDrafted(currentPool, delta.PlayerDrafted);
      } else if ("DraftPickUndone" in delta) {
        newPoolInfo = applyDraftPickUndone(currentPool, delta.DraftPickUndone);
      } else {
        newPoolInfo = applyRosterModified(currentPool, delta.RosterModified);
      }

      if (newPoolInfo === null) {
        console.warn("a draft update was missed, refetching the pool.");
        void resyncPoolInfo();
        return;
      }

      updatePoolInfo(newPoolInfo);
    },
    [resyncPoolInfo, updatePoolInfo]
  );

  const contextValue: PoolContextProps = {
    selectedParticipant,
    selectedPoolUser,
    updateSelectedParticipant,
    userPoolUser,
    lastFormatDate,
    dateOfInterest,
    poolStartDate,
    poolSelectedEndDate,
    playersOwner,
    protectedPlayers,
    poolInfo,
    updatePoolInfo,
    applyDraftDelta,
    resyncPoolInfo,
    dictUsers,
    dailyPointsMade,
  };

  return (
    <PoolContext.Provider value={contextValue}>{children}</PoolContext.Provider>
  );
};
