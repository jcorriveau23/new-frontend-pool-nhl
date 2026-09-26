// The pools page, list all the pools stored in the db.

"use client";
import * as React from "react";
import {
  getPoolerActivePlayers,
  Player,
  Pool,
  PoolState,
  PoolUser,
} from "@/data/pool/model";
import { apiPost } from "@/lib/client-api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TotalPointsColumn,
  TotalPointsColumnWithoutDaily,
  ForwardsTotalColumn,
  DefensesTotalColumn,
  GoaliesTotalColumn,
} from "./cumulative-columns";

import {
  DefenseColumn,
  ForwardColumn,
  GoalieColumn,
  ReservistColumn,
  getPlayerStatusRowStyle,
} from "./players-points-columns";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Row } from "@tanstack/react-table";

import { useTranslations } from "next-intl";
import { hasPoolPrivilege, usePoolContext } from "@/context/pool-context";
import { useTradeBuilder } from "@/context/trade-builder-context";
import PickList from "@/components/pick-list";
import { useDateContext } from "@/context/date-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  POOL_NAME_MAX_LENGTH,
  POOL_NAME_MIN_LENGTH,
} from "@/lib/pool-settings-form";
import { salaryFormat, seasonFormat } from "@/app/utils/formating";
import { useSession } from "@/context/useSessionData";
import { toast } from "sonner";
import InformationIcon from "@/components/information-box";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import LineupDialog from "@/components/lineup-dialog";
import { getPoolerCapUsage } from "@/lib/lineup-analytics";
import { PoolerUserGlobalSelector } from "@/components/pool-user-selector";
import {
  GamesNightStatus,
  useGamesNightContext,
} from "@/context/games-night-context";
import {
  calculatePoolStats,
  GoalieInfo,
  GoalieTotal,
  PlayerStatus,
  SkaterInfo,
  SkaterTotal,
  TotalRanking,
} from "./cumulative-calculation";
import { LineChart, LoaderCircle, PencilLine, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  TimeRangeGoalieChart,
  TimeRangePoolChart,
  TimeRangeSkaterChart,
} from "@/components/chart/lazy";
import { useUser } from "@/context/useUserData";
import PlayersTable from "@/components/player-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { RosterSection, useRosterSections } from "@/hooks/use-roster-sections";
import { useRosterMoves } from "@/hooks/use-roster-moves";
import {
  buildLineupAnalytics,
  buildPoolerEntries,
  isDateInPoolRange,
  resolveDisplayedDate,
  sortByPoolPoints,
} from "@/lib/pool-standings";

export default function CumulativeTab() {
  const t = useTranslations();
  const { currentDate, querySelectedDate, score } = useDateContext();
  const { gamesNightStatus } = useGamesNightContext();
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(
    null,
  );
  const [isForwardChartOpen, setIsForwardChartOpen] = React.useState(false);
  const [isDefenderChartOpen, setIsDefenderChartOpen] = React.useState(false);
  const [isGoalieChartOpen, setIsGoalieChartOpen] = React.useState(false);
  const [isPoolChartOpen, setIsPoolChartOpen] = React.useState(false);
  const {
    poolInfo,
    updatePoolInfo,
    dateOfInterest,
    poolStartDate,
    poolSelectedEndDate,
    selectedParticipant,
    selectedPoolUser,
    playersOwner,
    dailyPointsMade,
    updateSelectedParticipant,
  } = usePoolContext();
  const { openTradeForPlayer } = useTradeBuilder();
  // Adding to the bench and taking a player off, shared with the lineup dialog.
  const { canManageRoster, pendingPlayerId, addPlayer, removePlayer } =
    useRosterMoves();
  // The player the removal is being confirmed for, set from the row menu of any
  // of the four roster tables. One dialog serves them all.
  const [playerToRemove, setPlayerToRemove] = React.useState<Player | null>(
    null,
  );
  const [isAddingToReservists, setIsAddingToReservists] = React.useState(false);

  /*
  Salary only means something once the pool has a cap: without one the column
  is dead weight in every roster table, so it is dropped from the definitions
  rather than merely hidden — that keeps it out of the column picker too.
  */
  const dropSalaryWithoutCap = React.useCallback(
    <TData,>(columns: ColumnDef<TData>[]) =>
      poolInfo.settings.salary_cap === null
        ? columns.filter(
            (column) =>
              (column as { accessorKey?: string }).accessorKey !== "salary",
          )
        : columns,
    [poolInfo.settings.salary_cap],
  );
  // Which roster sections are expanded, remembered per pool on this device.
  const [openSections, updateOpenSections] = useRosterSections(poolInfo.name);

  const userSession = useSession();
  const userData = useUser();

  const formSchema = z.object({
    name: z
      .string()
      .min(POOL_NAME_MIN_LENGTH, {
        message: t("PoolNameMinLenghtValidation", {
          value: POOL_NAME_MIN_LENGTH,
        }),
      })
      .max(POOL_NAME_MAX_LENGTH, {
        message: t("PoolNameMaxLenghtValidation", {
          value: POOL_NAME_MAX_LENGTH,
        }),
      }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const markAsFinal = async () => {
    const res = await apiPost<Pool>(
      "/mark-as-final",
      { pool_name: poolInfo.name },
      userSession.info?.jwt,
    );

    if (!res.ok) {
      toast.error(
        t("CouldNotMarkAsFinalPoolError", {
          name: poolInfo.name,
          error: res.error,
        }),
        { duration: 2000 },
      );
      return;
    }
    updatePoolInfo(res.data);
  };

  const generateDynasty = async (newPoolName: string) => {
    const res = await apiPost<Pool>(
      "/generate-dynasty",
      { pool_name: poolInfo.name, new_pool_name: newPoolName },
      userSession.info?.jwt,
    );

    if (!res.ok) {
      toast.error(
        t("CouldNotGeneratePoolError", {
          name: newPoolName,
          error: res.error,
        }),
        { duration: 2000 },
      );
      return;
    }
    updatePoolInfo(res.data);
  };

  // `calculatePoolStats` is synchronous, so it is derived rather than held in
  // state: computing it in an effect rendered the whole tab as a skeleton once
  // on every pool update or date change before re-rendering with the data. The
  // Records tab derives the same call the same way.
  const [playerStats, ranking] = React.useMemo(
    () =>
      calculatePoolStats(
        poolInfo,
        poolStartDate,
        poolSelectedEndDate,
        dailyPointsMade,
      ),
    [poolInfo, dailyPointsMade, poolStartDate, poolSelectedEndDate],
  );

  /*
  The three derivations below are memoised, and sit above the loading guard
  because hooks cannot be called after a conditional return.

  Reference stability is the point rather than raw arithmetic: this component
  holds seven pieces of state, so opening a chart dialog or picking a date
  re-runs its body. Rebuilding these arrays each time handed `LineupDialog` and
  the pooler selector brand new props every render and re-rendered both for
  nothing. The derivations themselves live in `@/lib/pool-standings`.
  */
  const rankedByPoints = React.useMemo(
    () => sortByPoolPoints(ranking),
    [ranking],
  );

  const poolerEntries = React.useMemo(
    () => buildPoolerEntries(rankedByPoints, poolInfo.participants),
    [rankedByPoints, poolInfo.participants],
  );

  const lineupAnalytics = React.useMemo(
    () => buildLineupAnalytics(playerStats, ranking, poolInfo),
    [playerStats, ranking, poolInfo],
  );

  if (ranking === null || playerStats === null) {
    return <TableSkeleton rows={10} label={t("LoadingPoolRanking")} />;
  }

  // Cheap single passes that depend on the selected pooler, so they are left
  // out of the memos above rather than adding it to their dependencies.
  const selectedRankIndex = rankedByPoints.findIndex(
    (rank) => rank.participant === selectedParticipant,
  );
  const selectedRankingEntry =
    selectedRankIndex >= 0 ? rankedByPoints[selectedRankIndex] : null;

  const displayedDate = resolveDisplayedDate(
    querySelectedDate,
    score?.currentDate,
    format(currentDate, "yyyy-MM-dd"),
    dateOfInterest,
  );

  const getDailyGameState = (cumulated: boolean | undefined) => {
    if (cumulated) {
      return GamesNightStatus.COMPLETED;
    }

    return gamesNightStatus;
  };

  const TotalTable = (
    ranking: TotalRanking[],
    columns: ColumnDef<TotalRanking>[],
    title: string,
  ) => (
    <DataTable
      data={ranking}
      columns={columns}
      initialState={{
        sorting: [
          {
            id: "totalPoolPoints",
            desc: true,
          },
        ],
        columnPinning: { left: ["ranking", "pooler"] },
      }}
      meta={{
        props: {
          poolInfo: poolInfo,
          gamesState: getDailyGameState(dailyPointsMade?.cumulated),
          dateOfInterest: querySelectedDate,
        },
        getRowStyles: (row: Row<TotalRanking>) => {
          if (row.original.participant === selectedParticipant) {
            return "bg-selection hover:bg-selection group-hover:bg-selection font-semibold border-l-4 border-l-primary";
          }
        },
        onRowClick: (row: Row<TotalRanking>) => {
          updateSelectedParticipant(row.original.participant);
        },
        t,
      }}
      rowClickable
      title={title}
      tableFooter={null}
    />
  );

  // Legend for the row colours used by players that are not counted in the
  // alignment. Only the statuses actually present in the table are listed.
  const RosterStatusLegend = (rows: { status: PlayerStatus }[]) => {
    const legendItems = [
      {
        status: PlayerStatus.IsReservists,
        color: "bg-chart-4",
        label: t("StatusReservist"),
      },
      {
        status: PlayerStatus.Traded,
        color: "bg-destructive",
        label: t("StatusTraded"),
      },
      {
        status: PlayerStatus.PointsIgnored,
        color: "bg-muted-foreground",
        label: t("StatusPointsIgnored"),
      },
    ].filter((item) => rows.some((row) => row.status === item.status));

    if (legendItems.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground sm:text-xs">
        {legendItems.map((item) => (
          <span key={item.status} className="flex items-center gap-1.5">
            <span className={`h-3 w-1 rounded-full ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>
    );
  };

  const SkaterTable = (
    rows: SkaterInfo[],
    columns: ColumnDef<SkaterInfo>[],
    total: SkaterTotal,
  ) => (
    <div className="flex flex-col gap-2">
      <DataTable
        data={rows}
        columns={columns}
        initialState={{
          sorting: [
            {
              id: "poolPoints",
              desc: true,
            },
          ],
          columnPinning: {
            left: ["number", "player"],
            right: ["poolPoints", "actions"],
          },
        }}
        meta={{
          props: {
            poolInfo,
            setSelectedPlayerId,
            setIsForwardChartOpen,
            setIsDefenderChartOpen,
            openTradeForPlayer,
            canManageRoster,
            confirmPlayerRemoval: setPlayerToRemove,
          },
          getRowStyles: (row: Row<SkaterInfo>) =>
            getPlayerStatusRowStyle(row.original.status),
          onRowClick: () => null,
          t: t,
        }}
        title={null}
        columnsStorageKey={`${poolInfo.name}:skaters`}
        tableFooter={null}
        footerCells={{
          player: <span className="font-semibold">{t("Total")}</span>,
          numberOfGame: total.numberOfGame,
          goals: total.goals,
          assists: total.assists,
          hattricks: total.hattricks,
          shootoutGoals: total.shootoutGoals,
          poolPoints: (
            <span className="font-semibold">{total.totalPoolPoints}</span>
          ),
          totalPoolPtsPerGame:
            total.numberOfGame > 0
              ? (total.totalPoolPoints / total.numberOfGame).toFixed(3)
              : null,
        }}
      />
      {RosterStatusLegend(rows)}
    </div>
  );

  const GoalieTable = (
    rows: GoalieInfo[],
    columns: ColumnDef<GoalieInfo>[],
    total: GoalieTotal,
  ) => (
    <div className="flex flex-col gap-2">
      <DataTable
        data={rows}
        columns={columns}
        initialState={{
          sorting: [
            {
              id: "poolPoints",
              desc: true,
            },
          ],
          columnPinning: {
            left: ["number", "player"],
            right: ["poolPoints", "actions"],
          },
        }}
        meta={{
          props: {
            poolInfo,
            setSelectedPlayerId,
            setIsGoalieChartOpen,
            openTradeForPlayer,
            canManageRoster,
            confirmPlayerRemoval: setPlayerToRemove,
          },
          getRowStyles: (row: Row<GoalieInfo>) =>
            getPlayerStatusRowStyle(row.original.status),
          onRowClick: () => null,
          t: t,
        }}
        title={null}
        columnsStorageKey={`${poolInfo.name}:goalies`}
        tableFooter={null}
        footerCells={{
          player: <span className="font-semibold">{t("Total")}</span>,
          numberOfGame: total.numberOfGame,
          wins: total.wins,
          shutouts: total.shutouts,
          overtimeLosses: total.overtimeLosses,
          goals: total.goals,
          assists: total.assists,
          poolPoints: (
            <span className="font-semibold">{total.totalPoolPoints}</span>
          ),
          totalPoolPtsPerGame:
            total.numberOfGame > 0
              ? (total.totalPoolPoints / total.numberOfGame).toFixed(3)
              : null,
        }}
      />
      {RosterStatusLegend(rows)}
    </div>
  );

  const ReservistTable = (rows: number[], columns: ColumnDef<number>[]) => (
    <DataTable
      data={rows}
      columns={columns}
      initialState={{
        columnPinning: { left: ["number", "player"], right: ["actions"] },
      }}
      meta={{
        // The same bag the other three tables pass, so the row menu is built
        // from one shape rather than two.
        props: {
          poolInfo,
          openTradeForPlayer,
          canManageRoster,
          confirmPlayerRemoval: setPlayerToRemove,
        },
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={null}
      columnsStorageKey={`${poolInfo.name}:reservists`}
      tableFooter={null}
    />
  );

  /*
  Puts a player nobody in the pool holds on a pooler's bench.

  The pick is made from the same available-players table the search uses, so the
  owner chooses on stats rather than from a name box: it already greys out the
  players somebody holds and says who holds them.
  */
  const AddToReservistsDialog = (participant: PoolUser) => (
    <Dialog open={isAddingToReservists} onOpenChange={setIsAddingToReservists}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={t("AddToReservists")}
          />
        }
      >
        <Plus className="size-4" />
        {t("AddPlayer")}
      </DialogTrigger>
      <DialogContent className="h-full max-h-[96%] p-4 w-full max-w-[96%]">
        <DialogHeader>
          <DialogTitle>{t("AddToReservists")}</DialogTitle>
          <DialogDescription>{t("AvailablePlayers")}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="p-0">
          <PlayersTable
            sortField={"points"}
            skip={null}
            limit={51}
            considerOnlyProtected={false}
            pushUrl={`/pool/${poolInfo.name}`}
            playersOwner={playersOwner}
            protectedPlayers={null}
            selectLabel={t("Add")}
            onPlayerSelect={async (player) => {
              const added = await addPlayer(participant.id, player);
              // Left open on a failure so another player can be picked.
              if (added) {
                setIsAddingToReservists(false);
              }
              return added;
            }}
            playerLinksInNewTab
            currentSeason={poolInfo.season}
          />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );

  /*
  Confirms taking a player off the roster.

  Mounted once for the whole tab: the row menus of the four roster tables all
  set the player, and only one removal is ever being confirmed.
  */
  const RemovePlayerDialog = (participant: PoolUser) => {
    // A removed starter leaves the lineup a player short until the spot is
    // filled; a reservist leaving changes nothing that is being scored.
    const isStarter =
      playerToRemove !== null &&
      !(
        poolInfo.context?.pooler_roster[participant.id].chosen_reservists ?? []
      ).includes(playerToRemove.id);

    return (
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
                userName: participant.name,
              })}
              {isStarter ? ` ${t("RemoveStarterConfirmationWarning")}` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingPlayerId !== null}>
              {t("Cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pendingPlayerId !== null}
              onClick={async () => {
                if (
                  playerToRemove !== null &&
                  (await removePlayer(participant.id, playerToRemove))
                ) {
                  setPlayerToRemove(null);
                }
              }}
            >
              {pendingPlayerId !== null ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {t("Remove")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  // Mirrors what the backend accepts for a roster modification.
  const canSaveLineupOf = (participant: PoolUser) =>
    poolInfo.status === PoolState.InProgress &&
    (userData.info?.id === participant.id ||
      hasPoolPrivilege(userData.info?.id, poolInfo));

  const ParticipantRoster = (participant: PoolUser) => {
    // One lookup feeding the three totals rows below, instead of re-scanning
    // the whole ranking once per section. `ranking` is built from
    // `poolInfo.participants`, which is also where `participant` comes from, so
    // the entry is always there.
    const participantTotals = ranking.find(
      (rank) => rank.participant === participant.name,
    )!;

    // The three chart dialogs below all title themselves with the player whose
    // row was clicked, whichever section it came from.
    const selectedPlayerName =
      poolInfo.context?.players[selectedPlayerId ?? ""]?.name ?? "";

    /*
    What each position group costs against the cap, shown next to its count.

    Summed over the pooler's chosen players for the group — the same source
    `getPoolerCapUsage` uses — so the three section totals add up to the cap
    figure the lineup dialog reports, instead of quietly disagreeing with it.
    Reservists are excluded there and so are excluded here.
    */
    const rosterOf = poolInfo.context?.pooler_roster[participant.id];

    const SectionSalary = (playerIds: number[] | undefined) => {
      if (poolInfo.settings.salary_cap === null || playerIds === undefined) {
        return null;
      }

      const total = playerIds.reduce(
        (sum, playerId) =>
          sum + (poolInfo.context?.players[playerId]?.salary_cap ?? 0),
        0,
      );

      // Set like the cap hits in the rows below rather than as a pill, so the
      // section total and the player amounts read as the same kind of figure.
      return (
        <span className="font-medium tabular-nums text-success">
          {salaryFormat(total)}
        </span>
      );
    };

    return (
      <>
        {/* Anybody can open the lineup to try combinations, saving it is what
            needs the rights. */}
        {poolInfo.settings.number_reservists > 0 ? (
          <div className="mb-2 flex justify-end">
            {/* No key on the dialog: the pooler selector inside it changes the
                participant, and remounting would close the dialog. */}
            <LineupDialog
              title={
                canSaveLineupOf(participant)
                  ? t("EditLineup")
                  : t("SimulateLineup")
              }
              triggerRender={<Button variant="outline" size="sm" />}
              triggerContent={
                <>
                  <PencilLine className="size-4" />
                  {canSaveLineupOf(participant)
                    ? t("EditLineup")
                    : t("SimulateLineup")}
                </>
              }
              roster={{
                userRoster: getPoolerActivePlayers(
                  poolInfo.context!,
                  participant,
                ),
                teamSalaryCap: poolInfo.settings.salary_cap,
                poolerEntries: poolerEntries,
                analytics: lineupAnalytics,
              }}
            />
          </div>
        ) : null}
        {/* One accordion for the whole roster rather than one per section, so
            the sections share a rhythm and the open set can be remembered.
            `multiple` is required: Base UI collapses to a single open item
            without it, and these sections are meant to be read side by side. */}
        <Accordion
          multiple
          value={openSections}
          onValueChange={(value) =>
            updateOpenSections(value as RosterSection[])
          }
          className="flex flex-col gap-2"
        >
          {poolInfo.settings.number_forwards > 0 ? (
            <AccordionItem value="forwards" className="border-b-0">
              <AccordionTrigger className="py-2 font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  {`${t("Forwards")} (${
                    playerStats[participant.id].forwards.filter(
                      (player) =>
                        player.status === PlayerStatus.InAlignment ||
                        player.status === PlayerStatus.PointsIgnored,
                    ).length
                  }/${poolInfo.settings.number_forwards})`}
                  {SectionSalary(rosterOf?.chosen_forwards)}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <Dialog
                  open={isForwardChartOpen}
                  onOpenChange={setIsForwardChartOpen}
                >
                  <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                      <DialogTitle>{selectedPlayerName}</DialogTitle>
                      <DialogDescription>
                        {t("RecordedPoolPointsDescription", {
                          playerName: selectedPlayerName,
                          poolerName: selectedPoolUser.name,
                        })}
                      </DialogDescription>
                    </DialogHeader>
                    <TimeRangeSkaterChart
                      playerId={selectedPlayerId ?? ""}
                      skaterSettings={poolInfo.settings.forwards_settings}
                    />
                  </DialogContent>
                </Dialog>
                {SkaterTable(
                  playerStats[participant.id].forwards,
                  dropSalaryWithoutCap(ForwardColumn),
                  participantTotals.forwards,
                )}
              </AccordionContent>
            </AccordionItem>
          ) : null}
          {poolInfo.settings.number_defenders > 0 ? (
            <AccordionItem value="defense" className="border-b-0">
              <AccordionTrigger className="py-2 font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  {`${t("Defense")} (${
                    playerStats[participant.id].defense.filter(
                      (player) =>
                        player.status === PlayerStatus.InAlignment ||
                        player.status === PlayerStatus.PointsIgnored,
                    ).length
                  }/${poolInfo.settings.number_defenders})`}
                  {SectionSalary(rosterOf?.chosen_defenders)}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <Dialog
                  open={isDefenderChartOpen}
                  onOpenChange={setIsDefenderChartOpen}
                >
                  <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                      <DialogTitle>{selectedPlayerName}</DialogTitle>
                      <DialogDescription>
                        {t("RecordedPoolPointsDescription", {
                          playerName: selectedPlayerName,
                          poolerName: selectedPoolUser.name,
                        })}
                      </DialogDescription>
                    </DialogHeader>
                    <TimeRangeSkaterChart
                      playerId={selectedPlayerId ?? ""}
                      skaterSettings={poolInfo.settings.defense_settings}
                    />
                  </DialogContent>
                </Dialog>
                {SkaterTable(
                  playerStats[participant.id].defense,
                  dropSalaryWithoutCap(DefenseColumn),
                  participantTotals.defense,
                )}
              </AccordionContent>
            </AccordionItem>
          ) : null}
          {poolInfo.settings.number_goalies > 0 ? (
            <AccordionItem value="goalies" className="border-b-0">
              <AccordionTrigger className="py-2 font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  {`${t("Goalies")} (${
                    playerStats[participant.id].goalies.filter(
                      (player) =>
                        player.status === PlayerStatus.InAlignment ||
                        player.status === PlayerStatus.PointsIgnored,
                    ).length
                  }/${poolInfo.settings.number_goalies})`}
                  {SectionSalary(rosterOf?.chosen_goalies)}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <Dialog
                  open={isGoalieChartOpen}
                  onOpenChange={setIsGoalieChartOpen}
                >
                  <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                      <DialogTitle>{selectedPlayerName}</DialogTitle>
                      <DialogDescription>
                        {t("RecordedPoolPointsDescription", {
                          playerName: selectedPlayerName,
                          poolerName: selectedPoolUser.name,
                        })}
                      </DialogDescription>
                    </DialogHeader>
                    <TimeRangeGoalieChart
                      playerId={selectedPlayerId ?? ""}
                      goaliesSettings={poolInfo.settings.goalies_settings}
                    />
                  </DialogContent>
                </Dialog>
                {GoalieTable(
                  playerStats[participant.id].goalies,
                  dropSalaryWithoutCap(GoalieColumn),
                  participantTotals.goalies,
                )}
              </AccordionContent>
            </AccordionItem>
          ) : null}
          {poolInfo.settings.number_reservists > 0 ? (
            <AccordionItem value="reservists" className="border-b-0">
              <AccordionTrigger className="py-2 font-semibold hover:no-underline">
                {`${t("Reservists")} (${
                  poolInfo.context?.pooler_roster[participant.id]
                    .chosen_reservists.length ?? 0
                }/${poolInfo.settings.number_reservists})`}
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-2 pb-2">
                {/* Outside the trigger on purpose: a button nested in one is
                    both hard to hit and hard to tell apart from the row that
                    opens the section. */}
                {canManageRoster ? (
                  <div className="flex justify-end">
                    {AddToReservistsDialog(participant)}
                  </div>
                ) : null}
                {ReservistTable(
                  poolInfo.context?.pooler_roster[participant.id]
                    .chosen_reservists as number[],
                  dropSalaryWithoutCap(ReservistColumn),
                )}
              </AccordionContent>
            </AccordionItem>
          ) : null}
          {/* Parenthesised on purpose: `>` binds tighter than `??`, so without
              them this reads as `tradable_picks ?? (0 > 0)`. */}
          {(poolInfo.settings.dynasty_settings?.tradable_picks ?? 0) > 0 ? (
            <AccordionItem value="picks" className="border-b-0">
              <AccordionTrigger className="py-2 font-semibold hover:no-underline">
                {t("NextSeasonPicks")}
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <PickList poolUser={selectedPoolUser} poolInfo={poolInfo} />
              </AccordionContent>
            </AccordionItem>
          ) : null}
        </Accordion>
        {canManageRoster ? RemovePlayerDialog(participant) : null}
      </>
    );
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    generateDynasty(values.name);
  };

  const GenerateDynastyDialog = () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        {t("ContinuePoolForNextSeason", {
          season: seasonFormat(poolInfo.season, 1),
        })}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {t("ContinuePoolForNextSeason", {
              season: seasonFormat(poolInfo.season, 1),
            })}
          </DialogTitle>
          <DialogDescription>
            {t("ChoseTheNameOfPoolForNextSeason")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("PoolName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("PoolName")}
                      {...field}
                      defaultValue=""
                    />
                  </FormControl>
                  <FormDescription />
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">{t("Generate")}</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

  // The chart is toggled from the tab bar (see the button next to the tabs) and
  // rendered above the ranking table of the active tab.
  const chartPanel = (positionFilter: "F" | "D" | "G" | null) =>
    isPoolChartOpen ? (
      <div className="mb-4 rounded-lg border bg-card p-3 sm:p-4">
        <TimeRangePoolChart positionFilter={positionFilter} />
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <PoolerUserGlobalSelector entries={poolerEntries} />
        </div>
        {selectedRankingEntry ? (
          <div className="flex h-10 items-center gap-2.5 rounded-lg border bg-card pl-1.5 pr-3">
            <span
              className={cn(
                "flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-sm font-bold tabular-nums",
                selectedRankIndex === 0
                  ? "bg-chart-4/20 text-chart-4"
                  : "bg-primary/15 text-primary",
              )}
            >
              {selectedRankIndex + 1}
            </span>
            <span className="flex items-baseline gap-1">
              <span className="text-base font-semibold tabular-nums leading-none">
                {selectedRankingEntry.getTotalPoolPoints()}
              </span>
              <span className="text-xs text-muted-foreground">PTS</span>
            </span>
          </div>
        ) : null}
      </div>
      <Tabs defaultValue="totalRanking" className="flex flex-col gap-4">
        {poolInfo.status === PoolState.InProgress &&
        new Date(poolInfo.season_end + "T00:00:00") < currentDate &&
        hasPoolPrivilege(userData.info?.id, poolInfo) ? (
          <Button onClick={markAsFinal}>{t("MarkAsFinal")}</Button>
        ) : null}
        {poolInfo.status === PoolState.Final &&
        poolInfo.settings.dynasty_settings &&
        !poolInfo.settings.dynasty_settings.next_season_pool_name &&
        hasPoolPrivilege(userData.info?.id, poolInfo)
          ? GenerateDynastyDialog()
          : null}
        <div className="flex items-center gap-2">
          <div className="min-w-0 overflow-x-auto">
            <TabsList>
              <TabsTrigger value="totalRanking">{t("Total")}</TabsTrigger>
              <TabsTrigger value="forwardRanking">{t("Forwards")}</TabsTrigger>
              <TabsTrigger value="defenseRanking">{t("Defense")}</TabsTrigger>
              <TabsTrigger value="goaliesRanking">{t("Goalies")}</TabsTrigger>
            </TabsList>
          </div>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "size-10 shrink-0",
              isPoolChartOpen && "bg-accent text-accent-foreground",
            )}
            aria-pressed={isPoolChartOpen}
            aria-label={t("Chart")}
            onClick={() => setIsPoolChartOpen((isOpen) => !isOpen)}
          >
            <LineChart className="size-4" />
          </Button>
          {poolInfo.status === PoolState.Final ? (
            <InformationIcon text={t("FinalPoolResult")} />
          ) : null}
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="ml-auto size-10 shrink-0"
                  aria-label={t("PlayerSearch")}
                />
              }
            >
              <Search className="size-4" />
            </DialogTrigger>
            <DialogContent className="h-full max-h-[96%] p-4 w-full max-w-[96%]">
              <DialogHeader>
                <DialogTitle>{t("PlayerSearch")}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="p-0">
                <PlayersTable
                  sortField={"points"}
                  skip={null}
                  limit={51}
                  considerOnlyProtected={false}
                  pushUrl={`/pool/${poolInfo.name}`}
                  playersOwner={playersOwner}
                  protectedPlayers={null}
                  onPlayerSelect={null}
                  playerLinksInNewTab
                  currentSeason={poolInfo.season}
                />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="totalRanking">
          {chartPanel(null)}
          {TotalTable(
            ranking,
            isDateInPoolRange(displayedDate, poolInfo)
              ? TotalPointsColumn
              : TotalPointsColumnWithoutDaily,
            t("TotalRanking"),
          )}
        </TabsContent>
        <TabsContent value="forwardRanking">
          {chartPanel("F")}
          {TotalTable(ranking, ForwardsTotalColumn, t("ForwardRanking"))}
        </TabsContent>
        <TabsContent value="defenseRanking">
          {chartPanel("D")}
          {TotalTable(ranking, DefensesTotalColumn, t("DefenseRanking"))}
        </TabsContent>
        <TabsContent value="goaliesRanking">
          {chartPanel("G")}
          {TotalTable(ranking, GoaliesTotalColumn, t("GoaliesRanking"))}
        </TabsContent>
      </Tabs>
      <div>{ParticipantRoster(selectedPoolUser)}</div>
    </div>
  );
}
