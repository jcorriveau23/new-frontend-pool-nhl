"use client";

import * as React from "react";
import {
  Player,
  Pool,
  PoolState,
  PoolUser,
  Position,
} from "@/data/pool/model";
import { apiPost } from "@/lib/client-api";
import { useLocale, useTranslations } from "next-intl";
import PlayerLink from "./player-link";
import { TeamLogo } from "./team-logo";
import PlayerSalary from "./player-salary";
import InformationIcon from "./information-box";
import { salaryFormat } from "@/app/utils/formating";
import { hasPoolPrivilege, usePoolContext } from "@/context/pool-context";
import { toast } from "sonner";
import { useSession } from "@/context/useSessionData";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarClockIcon,
  InfoIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  UnlockIcon,
} from "lucide-react";
import PlayerSearchDialog from "./search-players";
import { useUser } from "@/context/useUserData";
import { getRosterModificationWindow } from "@/lib/roster-modification";
import { Command, useOptionalSocketContext } from "@/context/socket-context";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  PoolerSelectorEntry,
  PoolerUserGlobalSelector,
} from "./pool-user-selector";
import LineupAnalysis, { LineupAnalytics } from "./lineup-analysis";

interface Lineup {
  forwards: Player[];
  defense: Player[];
  goalies: Player[];
  reservists: Player[];
}

interface Props {
  userRoster: Lineup & { user: PoolUser };
  teamSalaryCap: number | null;
  // Poolers to list in the selector, in standing order when the caller knows it.
  poolerEntries?: PoolerSelectorEntry[];
  // Production data behind the analysis charts. Absent outside of a running
  // pool, where nothing has been scored yet.
  analytics?: LineupAnalytics;
}

type StarterGroup = "forwards" | "defense" | "goalies";

const STARTER_GROUP: Record<Position, StarterGroup> = {
  [Position.F]: "forwards",
  [Position.D]: "defense",
  [Position.G]: "goalies",
};

const GROUP_TITLE: Record<StarterGroup, string> = {
  forwards: "Forwards",
  defense: "Defense",
  goalies: "Goalies",
};

const POSITION_ORDER = [Position.F, Position.D, Position.G];

const bySalary = (players: Player[]): Player[] =>
  [...players].sort((p1, p2) => (p2.salary_cap ?? 0) - (p1.salary_cap ?? 0));

// The bench mixes positions, grouping them keeps it readable.
const byPositionThenSalary = (players: Player[]): Player[] =>
  [...players].sort(
    (p1, p2) =>
      POSITION_ORDER.indexOf(p1.position) -
        POSITION_ORDER.indexOf(p2.position) ||
      (p2.salary_cap ?? 0) - (p1.salary_cap ?? 0)
  );

const toLineup = (roster: Lineup): Lineup => ({
  forwards: [...roster.forwards],
  defense: [...roster.defense],
  goalies: [...roster.goalies],
  reservists: [...roster.reservists],
});

const LINEUP_GROUPS: (keyof Lineup)[] = [
  "forwards",
  "defense",
  "goalies",
  "reservists",
];

const lineupSignature = (lineup: Lineup): string =>
  LINEUP_GROUPS.map((group) =>
    lineup[group]
      .map((player) => player.id)
      .sort((a, b) => a - b)
      .join(",")
  ).join("|");

export default function StartingRoster(props: Props) {
  const { poolInfo, updatePoolInfo, dictUsers } = usePoolContext();
  // Present on the draft page only; undefined on the in-progress tab.
  const socketContext = useOptionalSocketContext();
  const userSession = useSession();
  const userData = useUser();
  const t = useTranslations();
  const locale = useLocale();

  const [lineup, setLineup] = React.useState<Lineup>(() =>
    toLineup(props.userRoster)
  );
  const [isSaving, setIsSaving] = React.useState(false);

  // Whatever comes from the pool (a save, a player added, another participant
  // being selected) wins over the local edits, otherwise the dialog would keep
  // showing a roster that no longer exists.
  const savedSignature = lineupSignature(props.userRoster);
  const [renderedSignature, setRenderedSignature] =
    React.useState(savedSignature);
  if (renderedSignature !== savedSignature) {
    setRenderedSignature(savedSignature);
    setLineup(toLineup(props.userRoster));
  }

  const isOwnRoster = userData.info?.id === props.userRoster.user.id;
  const isPoolInProgress = poolInfo.status === PoolState.InProgress;
  const isPoolDrafting = poolInfo.status === PoolState.Draft;
  // The backend only accepts a roster modification from the pooler itself, the
  // owner or an assistant. Both a running pool and a draft in progress qualify:
  // during the draft, participants arrange the players they have picked so far.
  const canSaveLineup =
    (isPoolInProgress || isPoolDrafting) &&
    (isOwnRoster || hasPoolPrivilege(userData.info?.id, poolInfo));
  const canAddPlayer =
    isPoolInProgress && hasPoolPrivilege(userData.info?.id, poolInfo);

  // Shuffling players around costs nothing and is the whole point of looking at
  // a lineup, so anybody can try combinations. Only saving needs the rights.
  const hasBench =
    poolInfo.settings.number_reservists > 0 || lineup.reservists.length > 0;
  const canMovePlayers = hasBench;

  const modificationWindow = React.useMemo(
    () => getRosterModificationWindow(poolInfo, new Date()),
    [poolInfo]
  );

  const formatDate = (dateKey: string) =>
    new Date(`${dateKey}T00:00:00`).toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  const moveToReserves = (player: Player) =>
    setLineup((current) => ({
      ...current,
      [STARTER_GROUP[player.position]]: current[
        STARTER_GROUP[player.position]
      ].filter((p) => p.id !== player.id),
      reservists: [...current.reservists, player],
    }));

  const moveToLineup = (player: Player) =>
    setLineup((current) => ({
      ...current,
      [STARTER_GROUP[player.position]]: [
        ...current[STARTER_GROUP[player.position]],
        player,
      ],
      reservists: current.reservists.filter((p) => p.id !== player.id),
    }));

  const resetLineup = () => setLineup(toLineup(props.userRoster));

  const starters = [...lineup.forwards, ...lineup.defense, ...lineup.goalies];
  const totalSalary = starters.reduce(
    (total, player) => total + (player.salary_cap ?? 0),
    0
  );
  const isOverCap =
    props.teamSalaryCap !== null && totalSalary > props.teamSalaryCap;

  const positionLimits: Record<StarterGroup, number> = {
    forwards: poolInfo.settings.number_forwards,
    defense: poolInfo.settings.number_defenders,
    goalies: poolInfo.settings.number_goalies,
  };

  const movedPlayerCount = [
    ...new Set([
      ...lineup.reservists.map((p) => p.id),
      ...props.userRoster.reservists.map((p) => p.id),
    ]),
  ].filter(
    (playerId) =>
      lineup.reservists.some((p) => p.id === playerId) !==
      props.userRoster.reservists.some((p) => p.id === playerId)
  ).length;
  const hasUnsavedChanges = movedPlayerCount > 0;

  // Same validations as the backend, reported before the request is sent so the
  // pooler knows what to fix.
  const getBlockingIssue = (): string | null => {
    for (const [group, limit] of Object.entries(positionLimits) as [
      StarterGroup,
      number,
    ][]) {
      if (lineup[group].length > limit) {
        return t("TooManyPlayersInLineup", {
          position: t(GROUP_TITLE[group]),
          count: lineup[group].length,
          limit,
        });
      }
    }

    if (props.teamSalaryCap === null) {
      return null;
    }

    const playerWithoutContract = starters.find(
      (player) => player.salary_cap === null
    );
    if (playerWithoutContract) {
      return t("PlayerWithoutContractInLineup", {
        playerName: playerWithoutContract.name,
      });
    }

    if (totalSalary > props.teamSalaryCap) {
      return t("LineupOverSalaryCap", {
        diff: salaryFormat(totalSalary - props.teamSalaryCap),
      });
    }

    return null;
  };
  const blockingIssue = getBlockingIssue();

  const PlayerRow = (
    player: Player,
    index: number,
    isStarter: boolean,
    isTargetFull: boolean
  ) => {
    const moveLabel = isStarter
      ? t("MoveToReserves", { playerName: player.name })
      : isTargetFull
        ? t("LineupPositionFull")
        : t("MoveToLineup", { playerName: player.name });

    return (
      <li
        key={player.id}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
      >
        <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {index + 1}
        </span>
        <TeamLogo teamId={player.team} width={24} height={24} />
        <div className="min-w-0 flex-1">
          <PlayerLink
            name={player.name}
            id={player.id}
            textStyle="text-sm font-medium"
          />
          <p className="text-xs text-muted-foreground">
            {isStarter ? null : `${t(player.position)} · `}
            {player.age !== null ? t("AgeYears", { age: player.age }) : null}
            {props.teamSalaryCap !== null && player.salary_cap
              ? ` · ${t("PercentOfCapShare", {
                  percent: (
                    (player.salary_cap / props.teamSalaryCap) *
                    100
                  ).toFixed(1),
                })}`
              : null}
          </p>
        </div>
        {poolInfo.settings.salary_cap !== null ? (
          <PlayerSalary
            playerName={player.name}
            team={player.team}
            salary={player.salary_cap}
            contractExpirationSeason={player.contract_expiration_season}
            teamSalaryCap={props.teamSalaryCap}
            onBadgeClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        ) : null}
        {canMovePlayers ? (
          <Tooltip>
            {/* The trigger wraps the button instead of being it: a full bench
                spot disables the button, and a disabled button never reports
                the hover that explains why. */}
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={moveLabel}
                disabled={!isStarter && isTargetFull}
                onClick={() =>
                  isStarter ? moveToReserves(player) : moveToLineup(player)
                }
              >
                {isStarter ? (
                  <ArrowDownIcon className="size-4" />
                ) : (
                  <ArrowUpIcon className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{moveLabel}</TooltipContent>
          </Tooltip>
        ) : null}
      </li>
    );
  };

  // What a group of players weighs on the cap, and the share of the cap it eats.
  // Reservists are outside of the cap, so their share is not shown.
  const GroupSalary = (players: Player[], tooltip: string, showShare = true) => {
    if (props.teamSalaryCap === null) {
      return null;
    }

    const groupSalary = players.reduce(
      (total, player) => total + (player.salary_cap ?? 0),
      0
    );

    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <span className="text-xs tabular-nums text-muted-foreground">
            {salaryFormat(groupSalary)}
            {showShare ? (
              <span className="ml-1 opacity-70">
                {t("PercentOfCap", {
                  percent: Math.round((groupSalary / props.teamSalaryCap) * 100),
                })}
              </span>
            ) : null}
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  };

  const LineupSection = (group: StarterGroup) => {
    const players = bySalary(lineup[group]);
    const limit = positionLimits[group];
    const emptySlots = Math.max(0, limit - players.length);

    return (
      <section className="rounded-xl border bg-card">
        <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <h3 className="text-sm font-semibold">{t(GROUP_TITLE[group])}</h3>
          <div className="flex items-center gap-2">
            {GroupSalary(
              players,
              t("PositionSalaryTotal", { position: t(GROUP_TITLE[group]) })
            )}
            <Badge
              variant={
                players.length > limit
                  ? "destructive"
                  : players.length === limit
                    ? "secondary"
                    : "outline"
              }
              className="tabular-nums"
            >
              {players.length}/{limit}
            </Badge>
          </div>
        </header>
        <ul className="p-1.5">
          {players.map((player, i) => PlayerRow(player, i, true, false))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <li
              key={`empty-${group}-${i}`}
              className="m-1 flex items-center gap-2 rounded-md border border-dashed px-2 py-1.5"
            >
              <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {players.length + i + 1}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("EmptyLineupSlot")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  };

  const ReservesSection = () => {
    const players = byPositionThenSalary(lineup.reservists);

    return (
      <section className="rounded-xl border bg-card">
        <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{t("Reservists")}</h3>
            <Badge variant="outline" className="tabular-nums">
              {players.length}
            </Badge>
            {GroupSalary(players, t("ReservistsSalaryTotal"), false)}
          </div>
          {canAddPlayer ? (
            <PlayerSearchDialog
              label={t("AddPlayer")}
              variant="outline"
              size="sm"
              onPlayerSelect={(player) => onPlayerSelect(player)}
            />
          ) : null}
        </header>
        <ul className="p-1.5">
          {players.length === 0 ? (
            <li className="px-2 py-4 text-center text-xs text-muted-foreground">
              {t("NoReservist")}
            </li>
          ) : (
            players.map((player, i) =>
              PlayerRow(
                player,
                i,
                false,
                lineup[STARTER_GROUP[player.position]].length >=
                  positionLimits[STARTER_GROUP[player.position]]
              )
            )
          )}
        </ul>
      </section>
    );
  };

  const SalarySummary = (teamSalaryCap: number) => {
    const contractCount = starters.filter(
      (player) => player.salary_cap !== null
    ).length;

    return (
      <div className="rounded-xl border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{t("RosterSalaryUsed")}</span>
            <InformationIcon text={t("RosterSalaryUsedHint")} />
          </div>
          <p className="text-sm tabular-nums">
            <span
              className={cn("font-semibold", isOverCap && "text-destructive")}
            >
              {salaryFormat(totalSalary)}
            </span>
            <span className="text-muted-foreground">
              {" / "}
              {salaryFormat(teamSalaryCap)}
            </span>
          </p>
        </div>
        <Progress
          value={Math.min(100, (totalSalary / teamSalaryCap) * 100)}
          className={cn("mt-2 h-1.5", isOverCap && "bg-destructive/20")}
        />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span
            className={cn(
              "font-medium",
              isOverCap ? "text-destructive" : "text-success"
            )}
          >
            {isOverCap
              ? t("OverCap", {
                  diff: salaryFormat(totalSalary - teamSalaryCap),
                })
              : t("UnderCap", {
                  diff: salaryFormat(teamSalaryCap - totalSalary),
                })}
          </span>
          <span className="text-muted-foreground">
            {t("LineupPlayersCount", {
              playersCount: starters.length,
              contractCount,
            })}
          </span>
        </div>
      </div>
    );
  };

  const ModificationWindowBanner = () => (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3",
        modificationWindow.isOpen
          ? "border-success/40 bg-success/10"
          : "bg-muted/40"
      )}
    >
      {modificationWindow.isOpen ? (
        <UnlockIcon className="mt-0.5 size-4 shrink-0 text-success" />
      ) : (
        <CalendarClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">
          {modificationWindow.isOpen
            ? t("LineupChangesAllowed")
            : t("LineupLocked")}
        </p>
        <p className="text-xs text-muted-foreground">
          {modificationWindow.isOpen
            ? t("LineupAppliesOn", {
                date: formatDate(modificationWindow.effectiveDate),
              })
            : modificationWindow.nextOpenDate
              ? t("NextLineupModificationDate", {
                  date: formatDate(modificationWindow.nextOpenDate),
                })
              : t("NoLineupModificationDateLeft")}
        </p>
      </div>
      <InformationIcon
        className="mt-0.5"
        text={t("LineupModificationRuleHint")}
      />
    </div>
  );

  const onModifyRoster = async () => {
    setIsSaving(true);
    try {
      const modification = {
        roster_modified_user_id: props.userRoster.user.id,
        forw_list: lineup.forwards.map((p) => p.id),
        def_list: lineup.defense.map((p) => p.id),
        goal_list: lineup.goalies.map((p) => p.id),
        reserv_list: lineup.reservists.map((p) => p.id),
      };

      // During the draft the change has to reach everyone in the room, so it
      // goes through the socket and comes back as a broadcast that updates the
      // pool. Outside the draft there is no room, and the REST call returns the
      // updated pool directly.
      if (socketContext) {
        socketContext.sendSocketCommand(
          Command.ModifyRoster,
          JSON.stringify(modification)
        );
        return true;
      }

      const res = await apiPost<Pool>(
        "/modify-roster",
        { pool_name: poolInfo.name, ...modification },
        userSession.info?.jwt
      );

      if (!res.ok) {
        toast.error(
          t("CouldNotSaveRosterModification", {
            userName: dictUsers[props.userRoster.user.id].name,
            error: res.error,
          }),
          { duration: 5000 }
        );
        return false;
      }

      updatePoolInfo(res.data);
      toast.success(
        t("SuccessSaveRosterModification", {
          userName: dictUsers[props.userRoster.user.id].name,
        }),
        { duration: 2000 }
      );

      return true;
    } finally {
      setIsSaving(false);
    }
  };

  const onPlayerSelect = async (player: Player) => {
    const res = await apiPost<Pool>(
      "/add-player",
      {
        pool_name: poolInfo.name,
        added_player_user_id: props.userRoster.user.id,
        player: player,
      },
      userSession.info?.jwt
    );

    if (!res.ok) {
      toast.error(
        t("CouldNotAddPlayerToRoster", {
          playerName: player.name,
          userName: dictUsers[props.userRoster.user.id].name,
          error: res.error,
        }),
        { duration: 5000 }
      );
      return false;
    }

    updatePoolInfo(res.data);
    toast.success(
      t("SuccessAddPlayerToRoster", {
        playerName: player.name,
        userName: dictUsers[props.userRoster.user.id].name,
      }),
      { duration: 2000 }
    );

    return true;
  };

  const LineupPanel = () => (
    <div className="space-y-3">
      {canSaveLineup ? ModificationWindowBanner() : null}
      {props.teamSalaryCap !== null ? SalarySummary(props.teamSalaryCap) : null}

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <div className="space-y-3">
          {poolInfo.settings.number_forwards > 0
            ? LineupSection("forwards")
            : null}
          {poolInfo.settings.number_defenders > 0
            ? LineupSection("defense")
            : null}
          {poolInfo.settings.number_goalies > 0
            ? LineupSection("goalies")
            : null}
        </div>
        <div className="space-y-3">
          {hasBench || canAddPlayer ? ReservesSection() : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 text-left">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-[200px] flex-1">
          <PoolerUserGlobalSelector entries={props.poolerEntries} />
        </div>
        {!canSaveLineup && canMovePlayers ? (
          <Badge variant="outline" className="mb-2">
            {t("SimulationMode")}
          </Badge>
        ) : null}
      </div>

      {props.teamSalaryCap !== null ? (
        <Tabs defaultValue="lineup">
          <TabsList>
            <TabsTrigger value="lineup">{t("Lineup")}</TabsTrigger>
            <TabsTrigger value="analysis">{t("Analysis")}</TabsTrigger>
          </TabsList>
          <TabsContent value="lineup">{LineupPanel()}</TabsContent>
          <TabsContent value="analysis">
            <LineupAnalysis
              lineup={lineup}
              reservists={lineup.reservists}
              teamSalaryCap={props.teamSalaryCap}
              selectedParticipant={props.userRoster.user.name}
              analytics={props.analytics}
            />
          </TabsContent>
        </Tabs>
      ) : (
        LineupPanel()
      )}

      {canMovePlayers ? (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 border-t bg-background/95 py-3 backdrop-blur">
          <div className="min-w-0 text-xs">
            {blockingIssue ? (
              <p className="flex items-center gap-1.5 font-medium text-destructive">
                <AlertCircleIcon className="size-3.5 shrink-0" />
                {blockingIssue}
              </p>
            ) : !canSaveLineup ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <InfoIcon className="size-4 shrink-0" />
                {t("SimulationModeHint")}
              </p>
            ) : hasUnsavedChanges ? (
              <p className="text-muted-foreground">
                {t("UnsavedLineupChanges", { count: movedPlayerCount })}
              </p>
            ) : (
              <p className="text-muted-foreground">{t("LineupUpToDate")}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasUnsavedChanges || isSaving}
              onClick={resetLineup}
            >
              <RotateCcwIcon />
              {t("Reset")}
            </Button>
            {canSaveLineup ? (
              <Button
                size="sm"
                disabled={
                  !hasUnsavedChanges || blockingIssue !== null || isSaving
                }
                onClick={() => onModifyRoster()}
              >
                {isSaving ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : null}
                {t("Save")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
