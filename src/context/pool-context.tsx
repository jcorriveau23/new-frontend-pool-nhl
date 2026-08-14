/*
Module that share context related to the selected pool.
*/
"use client";
import { DailyRosterPoints, Pool, PoolUser } from "@/data/pool/model";
import { apiGet } from "@/lib/client-api";
import React, { createContext, useContext, ReactNode, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { db } from "@/db";
import { format } from "date-fns";
import { useDateContext } from "./date-context";
import { useSearchParams } from "next/navigation";
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

const getPlayersOwner = (poolInfo: Pool) => {
  if (poolInfo.participants === null) {
    return {};
  }

  const playersOwner: Record<number, string> = {};
  for (let i = 0; i < poolInfo.participants.length; i += 1) {
    const participantId = poolInfo.participants[i].id;
    const participantName = poolInfo.participants[i].name;

    poolInfo.context?.pooler_roster[participantId].chosen_forwards.map(
      (playerId) => (playersOwner[playerId] = participantName)
    );
    poolInfo.context?.pooler_roster[participantId].chosen_defenders.map(
      (playerId) => (playersOwner[playerId] = participantName)
    );
    poolInfo.context?.pooler_roster[participantId].chosen_goalies.map(
      (playerId) => (playersOwner[playerId] = participantName)
    );
    poolInfo.context?.pooler_roster[participantId].chosen_reservists.map(
      (playerId) => (playersOwner[playerId] = participantName)
    );
  }

  return playersOwner;
};

const getProtectedPlayers = (
  poolInfo: Pool,
  dictUsers: Record<string, PoolUser>
): Record<number, string> | null => {
  const protectedPlayers: Record<number, string> = {};

  if (poolInfo.context?.protected_players === null) {
    return null;
  }

  for (const [userId, poolProtectedPlayers] of Object.entries(
    poolInfo.context?.protected_players ?? {}
  )) {
    for (const player of poolProtectedPlayers) {
      protectedPlayers[player] = dictUsers[userId].name;
    }
  }

  return protectedPlayers; // Return null if no user owns the player
};

const findLastDateInDb = (pool: Pool | null) => {
  // This function looks if there is a date player's stats that have already be stored in the local database.
  // If so a day will be sent to retrieve the data.
  if (!pool || !pool.context || !pool.context.score_by_day) {
    return null;
  }

  // Sort the keys (dates) in descending order
  const sortedDates = Object.keys(pool.context.score_by_day).sort((a, b) =>
    a.localeCompare(b)
  );

  return sortedDates[sortedDates.length - 1];
};

export const hasPoolPrivilege = (
  user: string | undefined,
  pool: Pool
): boolean => {
  return user === pool.owner || pool.settings.assistants.includes(user ?? "");
};

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
    const today = format(new Date(), "yyyy-MM-dd");
    const rangeEnd = today < data.season_end ? today : data.season_end;

    // Only trust cached days inside the current season range (guards against a
    // stale cache from a previous dynasty season).
    const cachedScores = poolDb?.context?.score_by_day ?? null;
    const cachedDates = cachedScores
      ? Object.keys(cachedScores)
          .filter((date) => date >= data.season_start && date <= rangeEnd)
          .sort()
      : [];
    const lastCachedDate = cachedDates[cachedDates.length - 1];
    const rangeStart = lastCachedDate ?? data.season_start;

    const scoresRes = await apiGet<
      Record<string, Record<string, DailyRosterPoints>>
    >(
      `/pool-scores/${name}/cumulative/${rangeStart}/${rangeEnd}`
    );
    const cachedByDay = Object.fromEntries(
      cachedDates.map((date) => [date, cachedScores![date]])
    );
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

  const lastFormatDate = findLastDateInDb(poolInfo);

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

  const getPoolDictUsers = (pool: Pool) =>
    pool.participants.reduce((acc: Record<string, PoolUser>, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

  const [dictUsers, setDictUsers] = useState<Record<string, PoolUser>>(
    getPoolDictUsers(pool)
  );

  const getInitialSelectedParticipant = (): string => {
    // Return the initial selected participant.
    if (poolInfo.participants === null || poolInfo.participants.length === 0)
      return "";

    const queryParams = new URLSearchParams(searchParams.toString());
    const initialSelectedParticipant = queryParams.get("selectedParticipant");

    if (
      initialSelectedParticipant === null ||
      !poolInfo.participants.some(
        (user) => user.name === initialSelectedParticipant
      )
    )
      return poolInfo.participants[0].name;

    return initialSelectedParticipant;
  };
  const router = useRouter();
  const [selectedParticipant, setSelectedParticipant] = React.useState<string>(
    getInitialSelectedParticipant()
  );
  const [selectedPoolUser, setSelectedPoolUser] = React.useState<PoolUser>(
    poolInfo.participants.find((user) => user.name === selectedParticipant) ??
      poolInfo.participants[0]
  );
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
        console.info(
          `processing daily ranking for ${dateOfInterest} using cumulative.`
        );
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

  const updatePoolInfo = (newPoolInfo: Pool) => {
    // @ts-expect-error, dexie is not typed.
    db.pools.get({ name: newPoolInfo.name }).then((poolDb) => {
      mergeScoreByDay(newPoolInfo, poolDb);
      setPoolInfo(newPoolInfo);
      newPoolInfo.id = poolDb.id;
      // @ts-expect-error, dexie is not typed.
      db.pools.put(newPoolInfo, "name");
    });
    const newDictUsers = getPoolDictUsers(newPoolInfo);
    setPlayersOwner(getPlayersOwner(newPoolInfo));
    setProtectedPlayers(getProtectedPlayers(newPoolInfo, newDictUsers));
    setDictUsers(newDictUsers);
  };

  const contextValue: PoolContextProps = {
    selectedParticipant,
    selectedPoolUser,
    updateSelectedParticipant,
    lastFormatDate,
    dateOfInterest,
    poolStartDate,
    poolSelectedEndDate,
    playersOwner,
    protectedPlayers,
    poolInfo,
    updatePoolInfo,
    dictUsers,
    dailyPointsMade,
  };

  return (
    <PoolContext.Provider value={contextValue}>{children}</PoolContext.Provider>
  );
};
