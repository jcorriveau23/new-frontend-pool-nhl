"use client";

import * as React from "react";
import {
  DropPeriod,
  Player,
  Pool,
  PoolState,
  PoolUser,
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
  ArrowLeftRightIcon,
  ArrowUpFromLineIcon,
  ArrowUpIcon,
  CalendarClockIcon,
  InfoIcon,
  LoaderCircleIcon,
  RepeatIcon,
  RotateCcwIcon,
  UnlockIcon,
  UserMinusIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import PlayerSearchDialog from "./search-players";
import { useUser } from "@/context/useUserData";
import { getRosterModificationWindow } from "@/lib/roster-modification";
import { useRosterMoves } from "@/hooks/use-roster-moves";
import {
  bySalary,
  byPositionThenSalary,
  countMovedPlayers,
  findLineupIssue,
  GROUP_TITLE,
  Lineup,
  lineupSignature,
  moveToLineup as withPlayerInLineup,
  STARTER_GROUP,
  moveToReserves as withPlayerOnBench,
  StarterGroup,
  StarterLimits,
  starters as lineupStarters,
  toLineup,
  totalStartersSalary,
} from "@/lib/lineup-edit";
import { getDropBudget, getSwapLanding, isFreeAgent } from "@/lib/player-drops";
import { Command, useOptionalSocketContext } from "@/context/socket-context";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  PoolerSelectorEntry,
  PoolerUserGlobalSelector,
} from "./pool-user-selector";
import LineupAnalysis, { LineupAnalytics } from "./lineup-analysis";

interface Props {
  userRoster: Lineup & { user: PoolUser };
  teamSalaryCap: number | null;
  // Poolers to list in the selector, in standing order when the caller knows it.
  poolerEntries?: PoolerSelectorEntry[];
  // Production data behind the analysis charts. Absent outside of a running
  // pool, where nothing has been scored yet.
  analytics?: LineupAnalytics;
  // Reports whether the lineup holds edits that could still be saved, so a
  // host dialog can warn before throwing them away.
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function StartingRoster(props: Props) {
  const { poolInfo, updatePoolInfo, dictUsers, playersOwner } =
    usePoolContext();
  // Present on the draft page only; undefined on the in-progress tab.
  const socketContext = useOptionalSocketContext();
  const userSession = useSession();
  const userData = useUser();
  const t = useTranslations();
  const locale = useLocale();

  const [lineup, setLineup] = React.useState<Lineup>(() =>
    toLineup(props.userRoster),
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
  // Putting a player on the bench and taking one off the roster are the
  // owner's tools, shared with the cumulative tab's roster tables.
  const { canManageRoster, pendingPlayerId, addPlayer, removePlayer } =
    useRosterMoves();
  const isMoveInFlight = pendingPlayerId !== null;

  // Shuffling players around costs nothing and is the whole point of looking at
  // a lineup, so anybody can try combinations. Only saving needs the rights.
  const hasBench =
    poolInfo.settings.number_reservists > 0 || lineup.reservists.length > 0;
  const canMovePlayers = hasBench;

  const modificationWindow = React.useMemo(
    () => getRosterModificationWindow(poolInfo, new Date()),
    [poolInfo],
  );

  // Free agency: how much of this pooler's drop budget is left. Unlike a
  // lineup change it is not tied to the pool's modification dates — a swap can
  // be filed any day of the season.
  const dropBudget = React.useMemo(
    () => getDropBudget(poolInfo, props.userRoster.user.id, new Date()),
    [poolInfo, props.userRoster.user.id],
  );

  // The player whose replacement is being picked. Set by the drop button on a
  // row, which is what opens the search dialog.
  const [playerToDrop, setPlayerToDrop] = React.useState<Player | null>(null);
  const [isSwapping, setIsSwapping] = React.useState(false);

  // The player the removal is being confirmed for. Set by the remove button on
  // a row, which is what opens the confirmation.
  const [playerToRemove, setPlayerToRemove] = React.useState<Player | null>(
    null,
  );
  const [isFillingSpot, setIsFillingSpot] = React.useState(false);

  // A pooler swaps on their own roster; the owner and the assistants may swap
  // on anyone's — the same rule the backend applies.
  const canSwapPlayers =
    dropBudget.isEnabled &&
    isPoolInProgress &&
    (isOwnRoster || hasPoolPrivilege(userData.info?.id, poolInfo));

  // A free lineup spot only appears when a player left the roster — removed
  // by the owner, or traded away — and the pooler should not have to play a man
  // short until the next modification date to fill it back up. That is what the
  // backend's `fill-spot` is for, so it is offered exactly when moving the
  // reservist up and saving would be refused.
  const canFillSpot =
    isPoolInProgress && canSaveLineup && !modificationWindow.isOpen;

  const formatDate = (dateKey: string) =>
    new Date(`${dateKey}T00:00:00`).toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  const moveToReserves = (player: Player) =>
    setLineup((current) => withPlayerOnBench(current, player));

  const moveToLineup = (player: Player) =>
    setLineup((current) => withPlayerInLineup(current, player));

  const resetLineup = () => setLineup(toLineup(props.userRoster));

  const starters = lineupStarters(lineup);
  const totalSalary = totalStartersSalary(lineup);
  const isOverCap =
    props.teamSalaryCap !== null && totalSalary > props.teamSalaryCap;

  const positionLimits: StarterLimits = {
    forwards: poolInfo.settings.number_forwards,
    defense: poolInfo.settings.number_defenders,
    goalies: poolInfo.settings.number_goalies,
  };

  const movedPlayerCount = countMovedPlayers(lineup, props.userRoster);
  const hasUnsavedChanges = movedPlayerCount > 0;

  // Only savable edits are worth guarding: in simulation mode nothing can be
  // persisted, so discarding the arrangement on close is the expected outcome
  // and a confirmation would just be in the way.
  const isDirty = canSaveLineup && hasUnsavedChanges;
  const { onDirtyChange } = props;
  React.useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Same validations as the backend, found in `@/lib/lineup-edit` and turned
  // into a message here so the pooler knows what to fix.
  const describeIssue = (): string | null => {
    const issue = findLineupIssue(lineup, positionLimits, props.teamSalaryCap);
    if (issue === null) {
      return null;
    }

    switch (issue.kind) {
      case "too-many-players":
        return t("TooManyPlayersInLineup", {
          position: t(GROUP_TITLE[issue.group]),
          count: issue.count,
          limit: issue.limit,
        });
      case "player-without-contract":
        return t("PlayerWithoutContractInLineup", {
          playerName: issue.player.name,
        });
      case "over-salary-cap":
        return t("LineupOverSalaryCap", {
          diff: salaryFormat(issue.overBy),
        });
    }
  };

  const blockingIssue = describeIssue();

  // Drops a player and picks the free agent replacing them. Refused while the
  // lineup holds unsaved edits: the swap is applied to the saved roster and the
  // pool that comes back would throw the local arrangement away.
  const DropPlayerButton = (player: Player) => {
    const blockedReason = dropBudget.isSeasonOver
      ? t("FreeAgencyClosedForTheSeason")
      : dropBudget.remaining === 0
        ? t("NoDropLeft")
        : hasUnsavedChanges
          ? t("SaveLineupBeforeSwapping")
          : null;

    return (
      <Tooltip>
        {/* The trigger wraps the button rather than being it: a disabled
            button never reports the hover that explains why. */}
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={t("DropAndReplace", { playerName: player.name })}
            disabled={blockedReason !== null || isSwapping}
            onClick={() => setPlayerToDrop(player)}
          >
            <RepeatIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {blockedReason ?? t("DropAndReplace", { playerName: player.name })}
        </TooltipContent>
      </Tooltip>
    );
  };

  // Takes a player off the roster for good. Refused while the lineup holds
  // unsaved edits, for the same reason a swap is: the removal applies to the
  // saved roster, and the pool that comes back would throw the local
  // arrangement away.
  const RemovePlayerButton = (player: Player) => {
    const blockedReason = hasUnsavedChanges
      ? t("SaveLineupBeforeRemoving")
      : null;

    return (
      <Tooltip>
        {/* The trigger wraps the button rather than being it: a disabled
            button never reports the hover that explains why. */}
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            aria-label={t("RemovePlayerFromRoster", {
              playerName: player.name,
            })}
            disabled={blockedReason !== null || isMoveInFlight}
            onClick={() => setPlayerToRemove(player)}
          >
            <UserMinusIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {blockedReason ??
            t("RemovePlayerFromRoster", { playerName: player.name })}
        </TooltipContent>
      </Tooltip>
    );
  };

  // Moves a reservist straight into the free spot of his position, without
  // waiting for a modification date. Only offered on a saved roster: it is
  // applied to what the pool holds, not to the arrangement on screen.
  const FillSpotButton = (player: Player) => (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-success"
          aria-label={t("FillSpotWith", { playerName: player.name })}
          disabled={isFillingSpot}
          onClick={() => onFillSpot(player)}
        >
          <ArrowUpFromLineIcon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("FillSpotHint")}</TooltipContent>
    </Tooltip>
  );

  const PlayerRow = (
    player: Player,
    index: number,
    isStarter: boolean,
    isTargetFull: boolean,
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
            // The roster is shown in a dialog, and navigating in place would
            // throw away a lineup that is mid-rearrangement.
            openInNewTab
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
            currentSeason={poolInfo.season}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        ) : null}
        {!isStarter && canFillSpot && !isTargetFull && !hasUnsavedChanges
          ? FillSpotButton(player)
          : null}
        {canSwapPlayers ? DropPlayerButton(player) : null}
        {canManageRoster ? RemovePlayerButton(player) : null}
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
  const GroupSalary = (
    players: Player[],
    tooltip: string,
    showShare = true,
  ) => {
    if (props.teamSalaryCap === null) {
      return null;
    }

    const groupSalary = players.reduce(
      (total, player) => total + (player.salary_cap ?? 0),
      0,
    );

    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <span className="text-xs tabular-nums text-muted-foreground">
            {salaryFormat(groupSalary)}
            {showShare ? (
              <span className="ml-1 opacity-70">
                {t("PercentOfCap", {
                  percent: Math.round(
                    (groupSalary / props.teamSalaryCap) * 100,
                  ),
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
              t("PositionSalaryTotal", { position: t(GROUP_TITLE[group]) }),
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
          {canManageRoster ? (
            <PlayerSearchDialog
              label={t("AddPlayer")}
              variant="outline"
              size="sm"
              onPlayerSelect={(player) =>
                addPlayer(props.userRoster.user.id, player)
              }
              unavailableReason={addUnavailableReason}
              currentSeason={poolInfo.season}
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
                  positionLimits[STARTER_GROUP[player.position]],
              ),
            )
          )}
        </ul>
      </section>
    );
  };

  const SalarySummary = (teamSalaryCap: number) => {
    const contractCount = starters.filter(
      (player) => player.salary_cap !== null,
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
              isOverCap ? "text-destructive" : "text-success",
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
          : "bg-muted/40",
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
          JSON.stringify(modification),
        );
        return true;
      }

      const res = await apiPost<Pool>(
        "/modify-roster",
        { pool_name: poolInfo.name, ...modification },
        userSession.info?.jwt,
      );

      if (!res.ok) {
        toast.error(
          t("CouldNotSaveRosterModification", {
            userName: dictUsers[props.userRoster.user.id].name,
            error: res.error,
          }),
          { duration: 5000 },
        );
        return false;
      }

      updatePoolInfo(res.data);
      toast.success(
        t("SuccessSaveRosterModification", {
          userName: dictUsers[props.userRoster.user.id].name,
        }),
        { duration: 2000 },
      );

      return true;
    } finally {
      setIsSaving(false);
    }
  };

  // Why `player` cannot be put on the bench, shown on the search result rather
  // than left to fail once the request is sent. Same rule the backend applies:
  // a player somebody in the pool holds is not available.
  const addUnavailableReason = (player: Player): string | null =>
    isFreeAgent(player, playersOwner)
      ? null
      : t("PlayerHeldBy", { userName: playersOwner[player.id] });

  // A removed starter leaves the lineup a player short until somebody fills the
  // spot; a reservist leaving changes nothing that is being scored, so the
  // confirmation only warns about the first.
  const isRemovedPlayerAStarter =
    playerToRemove !== null &&
    !lineup.reservists.some((player) => player.id === playerToRemove.id);

  const onRemovePlayer = async () => {
    if (playerToRemove === null) {
      return;
    }

    // Left open on a failure so the removal can be retried.
    if (await removePlayer(props.userRoster.user.id, playerToRemove)) {
      setPlayerToRemove(null);
    }
  };

  const onFillSpot = async (player: Player) => {
    setIsFillingSpot(true);
    try {
      const res = await apiPost<Pool>(
        "/fill-spot",
        {
          pool_name: poolInfo.name,
          filled_spot_user_id: props.userRoster.user.id,
          player_id: player.id,
        },
        userSession.info?.jwt,
      );

      if (!res.ok) {
        toast.error(
          t("CouldNotFillSpot", {
            playerName: player.name,
            error: res.error,
          }),
          { duration: 5000 },
        );
        return;
      }

      updatePoolInfo(res.data);
      toast.success(t("SuccessFillSpot", { playerName: player.name }), {
        duration: 2000,
      });
    } finally {
      setIsFillingSpot(false);
    }
  };

  // The saved roster the backend will act on. A swap is applied to what the
  // pool holds, not to the arrangement being previewed locally.
  const savedRoster = poolInfo.context?.pooler_roster[props.userRoster.user.id];

  // Why `player` cannot be the replacement, shown on the search result rather
  // than left to fail once the swap is sent.
  const swapUnavailableReason = (player: Player): string | null => {
    if (!isFreeAgent(player, playersOwner)) {
      return t("PlayerHeldBy", { userName: playersOwner[player.id] });
    }
    if (
      playerToDrop !== null &&
      savedRoster !== undefined &&
      getSwapLanding(poolInfo, savedRoster, playerToDrop.id, player) ===
        "no-room"
    ) {
      return t("NoRoomForPlayer");
    }
    return null;
  };

  const onDropAddPlayer = async (replacement: Player) => {
    const dropped = playerToDrop;
    if (dropped === null) {
      return false;
    }

    setIsSwapping(true);
    try {
      const res = await apiPost<Pool>(
        "/drop-add-player",
        {
          pool_name: poolInfo.name,
          participant_id: props.userRoster.user.id,
          dropped_player_id: dropped.id,
          added_player: replacement,
        },
        userSession.info?.jwt,
      );

      if (!res.ok) {
        toast.error(
          t("CouldNotSwapPlayer", {
            droppedPlayerName: dropped.name,
            addedPlayerName: replacement.name,
            error: res.error,
          }),
          { duration: 5000 },
        );
        return false;
      }

      updatePoolInfo(res.data);
      toast.success(
        t("SuccessSwapPlayer", {
          droppedPlayerName: dropped.name,
          addedPlayerName: replacement.name,
          date: formatDate(dropBudget.effectiveDate),
        }),
        { duration: 4000 },
      );
      setPlayerToDrop(null);
      return true;
    } finally {
      setIsSwapping(false);
    }
  };

  const FreeAgencyBanner = () => (
    <div className="flex items-start gap-3 rounded-xl border bg-muted/40 px-4 py-3">
      <ArrowLeftRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{t("FreeAgency")}</p>
        <p className="text-xs text-muted-foreground">
          {dropBudget.isSeasonOver
            ? t("FreeAgencyClosedForTheSeason")
            : dropBudget.period === DropPeriod.MONTH
              ? t("DropsLeftThisMonth", {
                  remaining: dropBudget.remaining,
                  max: dropBudget.max,
                })
              : t("DropsLeftThisSeason", {
                  remaining: dropBudget.remaining,
                  max: dropBudget.max,
                })}
          {dropBudget.canDrop
            ? ` · ${t("SwapAppliesOn", {
                date: formatDate(dropBudget.effectiveDate),
              })}`
            : null}
        </p>
      </div>
      <InformationIcon className="mt-0.5" text={t("FreeAgencyRuleHint")} />
    </div>
  );

  const LineupPanel = () => (
    <div className="space-y-3">
      {canSaveLineup ? ModificationWindowBanner() : null}
      {canSwapPlayers ? FreeAgencyBanner() : null}
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
          {hasBench || canManageRoster ? ReservesSection() : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 text-left">
      {/* Mounted once rather than per row: only one swap is ever in flight,
          and `playerToDrop` is what opens it. */}
      {canSwapPlayers ? (
        <PlayerSearchDialog
          label={
            playerToDrop
              ? t("PickReplacementFor", { playerName: playerToDrop.name })
              : t("PickReplacement")
          }
          currentSeason={poolInfo.season}
          open={playerToDrop !== null}
          onOpenChange={(open) => {
            if (!open) setPlayerToDrop(null);
          }}
          unavailableReason={swapUnavailableReason}
          onPlayerSelect={onDropAddPlayer}
        />
      ) : null}
      {/* Mounted once rather than per row, the same way the swap dialog is:
          only one removal is ever being confirmed. */}
      {canManageRoster ? (
        <AlertDialog
          open={playerToRemove !== null}
          onOpenChange={(open) => {
            if (!open) setPlayerToRemove(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("RemovePlayerConfirmationTitle", {
                  playerName: playerToRemove?.name ?? "",
                })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("RemovePlayerConfirmationDescription", {
                  playerName: playerToRemove?.name ?? "",
                  userName: dictUsers[props.userRoster.user.id].name,
                })}
                {isRemovedPlayerAStarter
                  ? ` ${t("RemoveStarterConfirmationWarning")}`
                  : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isMoveInFlight}>
                {t("Cancel")}
              </AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={isMoveInFlight}
                onClick={() => onRemovePlayer()}
              >
                {isMoveInFlight ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : null}
                {t("Remove")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
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
