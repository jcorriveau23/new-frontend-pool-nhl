"use client";

/*
The pick screen: the teams playing a Saturday, and the one you are backing.

The teams you have already used are shown rather than hidden. Deep into a
season "why can I not pick Toronto" is the question the screen most has to
answer, and an absent tile answers nothing.

What is open to you comes from the backend, which decides it with the same
function it validates the pick against — so a tile being enabled and the pick
being accepted cannot disagree.

The teams are laid out as the games they are playing, which is how somebody
decides: "who is Buffalo up against" is the question behind the pick. A date
whose games do not account for exactly the eligible teams falls back to a plain
grid — see `matchupsCoverTeams`.

A live game shows its score and refetches while it is on. It is deliberately
never marked with a winner: the leader after two periods is not a result, and
the pool has settled nothing until the game is over.
*/

import * as React from "react";
import { Check, Lock, TriangleAlert, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamLogo } from "@/components/team-logo";
import team_info from "@/lib/teams";
import { cn } from "@/lib/utils";
import {
  SurvivorGame,
  SurvivorPickOptions,
  SurvivorPool,
  SurvivorUser,
  SurvivorWeek,
} from "@/data/survivor/model";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GameStatus,
  displayScore,
  gameStatus,
  hasLiveGame,
  hasSurvivorPrivilege,
  matchupsCoverTeams,
  orderMatchups,
  pickBlockedReasonKey,
  splitTeamChoices,
  winnerOf,
} from "@/lib/survivor";
import { fetchPickOptions, makeSurvivorPick } from "@/lib/survivor-api";
import { useSession } from "@/context/useSessionData";
import { useUser } from "@/context/useUserData";

interface Props {
  pool: SurvivorPool;
  week: SurvivorWeek;
  participant: SurvivorUser | null;
}

const teamName = (teamId: number) =>
  team_info[teamId]?.fullName ?? `#${teamId}`;

/*
How often a date with a live game is refetched.

Matched to the backend's own cache for a day in play, so a tick either finds a
fresh answer or causes exactly one upstream read shared by everybody watching.
Polling faster would only add requests answered from the same cached copy.

Three minutes: this is a pick screen, not a play-by-play. Somebody following a
game closely has the game on.
*/
const LIVE_REFRESH_MS = 3 * 60 * 1000;

function TeamTile({
  teamId,
  state,
  result,
  onPick,
  disabled,
  className,
}: {
  teamId: number;
  state: "picked" | "open" | "used";
  // Whether the team won or lost its game. Set only once the game is over —
  // a team leading at the second intermission has won nothing.
  result?: "won" | "lost" | null;
  onPick: () => void;
  disabled: boolean;
  className?: string;
}) {
  const t = useTranslations();
  const name = teamName(teamId);

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled || state === "used"}
      aria-pressed={state === "picked"}
      aria-label={
        result === "won"
          ? t("SurvivorTeamWonLabel", { team: name })
          : state === "used"
            ? t("SurvivorTeamUsedLabel", { team: name })
            : name
      }
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        state === "picked" && "border-primary bg-primary/10",
        state === "open" && "hover:bg-accent cursor-pointer",
        // A used team stays legible but visibly out of play, and says why on
        // hover rather than vanishing from the grid.
        state === "used" && "cursor-not-allowed opacity-40",
        disabled && state !== "picked" && "cursor-not-allowed opacity-60",
        // The team that won a finished game, which is not the same as the team
        // this participant picked — hence a ring rather than the picked border.
        result === "won" &&
          "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500",
        // The loser is pushed back rather than hidden: a date is read as a
        // whole, and half of each matchup is the team that went out.
        result === "lost" && "opacity-50 grayscale",
        className,
      )}
      title={state === "used" ? t("SurvivorTeamAlreadyUsed") : name}
    >
      <TeamLogo teamId={teamId} width={40} height={40} alt={name} />
      <span className="line-clamp-2 text-xs leading-tight">{name}</span>
      {state === "picked" ? (
        <Check className="text-primary absolute top-1 right-1 size-4" />
      ) : null}
      {state === "used" ? (
        <Lock className="text-muted-foreground absolute top-1 right-1 size-3" />
      ) : null}
      {result === "won" ? (
        <span className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
          <Trophy className="size-2.5" />
          {t("SurvivorWon")}
        </span>
      ) : null}
    </button>
  );
}

/*
A game's status line: the clock while it is on, "Final" once it is not.

A live game is marked as live rather than left to be inferred from a score
being present, because a score with no label is read as a result.
*/
function GameStatusLine({ status }: { status: GameStatus }) {
  const t = useTranslations();

  if (status.kind === "live") {
    return (
      <span className="flex items-center justify-end gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
        <span className="size-1.5 animate-pulse rounded-full bg-red-600 dark:bg-red-400" />
        {status.inIntermission
          ? t("SurvivorIntermission", { period: status.period ?? 0 })
          : t("SurvivorPeriodClock", {
              period: status.period ?? 0,
              clock: status.timeRemaining ?? "",
            })}
      </span>
    );
  }

  if (status.kind === "final") {
    return (
      <span className="text-muted-foreground text-xs">
        {status.wentPastRegulation === null
          ? t("SurvivorGameFinal")
          : t("SurvivorGameFinalPast", { period: status.wentPastRegulation })}
      </span>
    );
  }

  if (status.kind === "abandoned") {
    return (
      <span className="text-muted-foreground text-xs">
        {t("SurvivorGameCalledOff")}
      </span>
    );
  }

  if (status.startTimeUtc === null) {
    return null;
  }

  return (
    <span className="text-muted-foreground text-xs">
      {/*
      The viewer's own zone, which is the only one that answers "when can I
      watch this". Rendered from the instant the league gave rather than a
      preformatted string so it follows the device.
      */}
      {new Date(status.startTimeUtc).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })}
    </span>
  );
}

/*
One game: the two teams, the score, and where it stands.

Away on the left and home on the right, the way a scoreboard reads it, rather
than in the order the pick is easiest to lay out.
*/
function MatchupRow({
  game,
  stateOf,
  disabled,
  onPick,
}: {
  game: SurvivorGame;
  stateOf: (teamId: number) => "picked" | "open" | "used";
  disabled: boolean;
  onPick: (teamId: number) => void;
}) {
  const t = useTranslations();
  const score = displayScore(game);
  const winner = winnerOf(game);
  const status = gameStatus(game);

  // Null for anything but a finished game, so a team leading at the second
  // intermission is shown neither as a winner nor as a loser.
  const resultOf = (teamId: number): "won" | "lost" | null => {
    if (winner === null) {
      return null;
    }
    return winner === teamId ? "won" : "lost";
  };

  const scoreTone = (teamId: number) =>
    winner === null
      ? "text-foreground"
      : winner === teamId
        ? "font-bold text-emerald-600 dark:text-emerald-400"
        : "text-muted-foreground";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-2",
        status.kind === "live" && "border-red-600/30 bg-red-600/5",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <TeamTile
          teamId={game.away_team_id}
          state={stateOf(game.away_team_id)}
          result={resultOf(game.away_team_id)}
          onPick={() => onPick(game.away_team_id)}
          disabled={disabled}
          className="w-24 shrink-0"
        />
        <span
          className="text-muted-foreground shrink-0 text-xs"
          // The glyph carries the home side, which the labels do not.
          aria-label={t("SurvivorAwayAtHome", {
            away: teamName(game.away_team_id),
            home: teamName(game.home_team_id),
          })}
        >
          @
        </span>
        <TeamTile
          teamId={game.home_team_id}
          state={stateOf(game.home_team_id)}
          result={resultOf(game.home_team_id)}
          onPick={() => onPick(game.home_team_id)}
          disabled={disabled}
          className="w-24 shrink-0"
        />
      </div>

      <div className="w-24 shrink-0 text-right">
        {score !== null ? (
          <div className="text-sm tabular-nums">
            <span className={scoreTone(game.away_team_id)}>{score.away}</span>
            <span className="text-muted-foreground mx-1">–</span>
            <span className={scoreTone(game.home_team_id)}>{score.home}</span>
          </div>
        ) : null}
        <GameStatusLine status={status} />
      </div>
    </div>
  );
}

export default function PickTab(props: Props) {
  const { pool, week, participant } = props;
  const t = useTranslations();
  const userSession = useSession();
  const jwt = userSession.info?.jwt;

  const userData = useUser();
  const canPickForOthers = hasSurvivorPrivilege(pool, userData.info?.id);

  const [options, setOptions] = React.useState<SurvivorPickOptions | null>(
    null,
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [pickingTeam, setPickingTeam] = React.useState<number | null>(null);

  /*
  Whose pick the screen is filing.

  The organiser's own spot by default. They switch to one of the spots they
  keep on somebody's behalf — those people have no account, so this is the only
  way those picks ever get made. Null means "mine", so a plain participant
  never sends a participant id at all.
  */
  const [pickingFor, setPickingFor] = React.useState<string | null>(null);

  /*
  Load the screen.

  `silent` is for the refresh that follows a live game: no skeleton, because
  the screen is already filled in and flashing it on every tick would be
  unreadable, and no toast, because a scoreboard that failed to refresh is not
  worth interrupting somebody over — the next tick will have it.
  */
  const loadOptions = React.useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (!jwt) {
        setIsLoading(false);
        return;
      }
      if (!silent) {
        setIsLoading(true);
      }
      const res = await fetchPickOptions(
        pool.name,
        week.week,
        jwt,
        pickingFor ?? undefined,
      );
      if (!silent) {
        setIsLoading(false);
      }

      if (!res.ok) {
        // A visitor who is not in the pool gets a refusal here, which is not
        // worth a toast — the screen already says they are not a participant.
        if (participant !== null && silent !== true) {
          toast.error(t("SurvivorCouldNotLoadPicks", { error: res.error }));
        }
        return;
      }
      setOptions(res.data);
    },
    [jwt, pool.name, week.week, pickingFor, participant, t],
  );

  React.useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  /*
  Keep a date with a game on it up to date.

  A score fetched once is not a live score. The interval matches the backend's
  own cache for a day in play, so this costs one upstream read per tick however
  many people are watching — the backend is what holds that line, not this.
  */
  const watchingLiveGames = hasLiveGame(options?.games);

  React.useEffect(() => {
    if (!watchingLiveGames) {
      return;
    }

    const timer = setInterval(() => {
      void loadOptions({ silent: true });
    }, LIVE_REFRESH_MS);

    return () => clearInterval(timer);
  }, [watchingLiveGames, loadOptions]);

  const pick = async (teamId: number) => {
    setPickingTeam(teamId);
    const res = await makeSurvivorPick(
      pool.name,
      week.week,
      teamId,
      jwt,
      pickingFor ?? undefined,
    );
    setPickingTeam(null);

    if (!res.ok) {
      toast.error(res.error, { duration: 5000 });
      // The refusal may be a team somebody's concurrent pick took, or a date
      // that locked while this screen was open; either way what is on screen
      // is stale.
      void loadOptions();
      return;
    }

    setOptions(res.data);
    toast.success(t("SurvivorPickSaved", { team: teamName(teamId) }));
  };

  // The teams playing come from the pick endpoint, which resolves them against
  // the league's schedule. The pool's own copy of the week is only filled in
  // once the date is locked, so it would read as "no games" on every open one.
  // The spot being filed for, which is the organiser's own unless they have
  // switched. Its standing is what decides whether a pick can be made.
  const subject =
    pickingFor === null
      ? participant
      : (pool.participants.find((p) => p.id === pickingFor) ?? null);

  const blockedKey = pickBlockedReasonKey(
    week,
    subject,
    options?.eligible_team_ids ?? null,
    options?.is_blocked ?? false,
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8">
        {Array.from({ length: 16 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
    );
  }

  // Not a participant, or not signed in: the grid would have nothing to act on.
  if (options === null) {
    return (
      <Alert>
        <TriangleAlert className="size-4" />
        <AlertDescription>
          {t(blockedKey ?? "SurvivorNotAParticipant")}
        </AlertDescription>
      </Alert>
    );
  }

  const { available, used } = splitTeamChoices(
    options.eligible_team_ids,
    options.available_team_ids,
  );
  // Used teams go last, so the ones that can be acted on are not spread out
  // among the ones that cannot.
  const ordered = [...available, ...used];
  const openTeams = new Set(available);

  const stateOf = (teamId: number): "picked" | "open" | "used" => {
    if (options.current_pick === teamId) {
      return "picked";
    }
    return openTeams.has(teamId) ? "open" : "used";
  };
  const tilesDisabled =
    !options.can_pick || blockedKey !== null || pickingTeam !== null;

  // The games are shown as games when they account for exactly the teams the
  // backend called eligible, and as a plain grid when they cannot — an older
  // backend sends none, and a locked date's list comes from the pool document
  // rather than the feed.
  const matchups = matchupsCoverTeams(options.games, options.eligible_team_ids)
    ? orderMatchups(options.games ?? [], options.available_team_ids)
    : null;

  return (
    <div className="space-y-4 text-left">
      {canPickForOthers && pool.participants.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {t("SurvivorPickingFor")}
          </span>
          <Select
            value={pickingFor ?? "__me__"}
            onValueChange={(value) =>
              setPickingFor(value === "__me__" ? null : value)
            }
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__me__">{t("SurvivorMyself")}</SelectItem>
              {pool.participants
                .filter((person) => person.id !== participant?.id)
                .map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                    {person.is_owned ? "" : ` ${t("SurvivorManagedSuffix")}`}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {t("SurvivorWeekLabel", { week: week.week })}
        </Badge>
        <span className="text-muted-foreground text-sm">{week.pick_date}</span>
        {options.current_pick !== null ? (
          <Badge>
            {t("SurvivorYourPick", { team: teamName(options.current_pick) })}
          </Badge>
        ) : null}
        <span className="text-muted-foreground ml-auto text-sm">
          {t("SurvivorTeamsLeft", {
            count: options.eligible_team_ids.length - used.length,
          })}
        </span>
      </div>

      {blockedKey !== null ? (
        <Alert>
          <TriangleAlert className="size-4" />
          <AlertDescription>{t(blockedKey)}</AlertDescription>
        </Alert>
      ) : null}

      {ordered.length === 0 ? (
        <Alert>
          <AlertDescription>{t("SurvivorNoGamesThatDay")}</AlertDescription>
        </Alert>
      ) : matchups !== null ? (
        <div className="space-y-2">
          {matchups.map((game) => (
            <MatchupRow
              key={`${game.away_team_id}-${game.home_team_id}`}
              game={game}
              stateOf={stateOf}
              disabled={tilesDisabled}
              onPick={(teamId) => void pick(teamId)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8">
          {ordered.map((teamId) => (
            <TeamTile
              key={teamId}
              teamId={teamId}
              state={stateOf(teamId)}
              onPick={() => void pick(teamId)}
              disabled={tilesDisabled}
            />
          ))}
        </div>
      )}

      {used.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          {t("SurvivorUsedTeamsExplanation")}
        </p>
      ) : null}
    </div>
  );
}
