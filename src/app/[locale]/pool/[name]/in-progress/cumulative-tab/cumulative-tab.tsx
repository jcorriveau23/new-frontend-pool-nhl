// The pools page, list all the pools stored in the db.

"use client";
import * as React from "react";
import {
  getPoolerActivePlayers,
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
} from "@/components/pool-settings";
import { seasonFormat } from "@/app/utils/formating";
import { useSession } from "@/context/useSessionData";
import { toast } from "sonner";
import InformationIcon from "@/components/information-box";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import StartingRoster from "@/components/starting-roster";
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
  ParticipantsRoster,
  PlayerStatus,
  SkaterInfo,
  SkaterTotal,
  TotalRanking,
} from "./cumulative-calculation";
import { LineChart, PencilLine } from "lucide-react";
import { TimeRangeSkaterChart } from "@/components/chart/time-range-skater-chart";
import { TimeRangePoolChart } from "@/components/chart/time-range-pool-chart";
import { TimeRangeGoalieChart } from "@/components/chart/time-range-goalie-chart";
import { useUser } from "@/context/useUserData";
import PlayersTable from "@/components/player-table";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [playerStats, setPlayerStats] = React.useState<Record<
    string,
    ParticipantsRoster
  > | null>(null);
  const [ranking, setRanking] = React.useState<TotalRanking[] | null>(null);
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

  React.useEffect(() => {
    const [stats, rank] = calculatePoolStats(
      poolInfo,
      poolStartDate,
      poolSelectedEndDate,
      dailyPointsMade,
    );

    setPlayerStats(stats);
    setRanking(rank);
  }, [poolInfo, dailyPointsMade, poolStartDate, poolSelectedEndDate]);

  if (ranking === null || playerStats === null) {
    return <h1>Loading ranking and player stats...</h1>;
  }

  const rankedByPoints = [...ranking].sort(
    (a, b) => b.getTotalPoolPoints() - a.getTotalPoolPoints(),
  );
  const selectedRankIndex = rankedByPoints.findIndex(
    (rank) => rank.participant === selectedParticipant,
  );
  const selectedRankingEntry =
    selectedRankIndex >= 0 ? rankedByPoints[selectedRankIndex] : null;

  // The pooler selector lists everybody in standing order, with their rank and
  // total so the list doubles as a quick leaderboard.
  const poolerEntries = rankedByPoints.map((rank, index) => ({
    id:
      poolInfo.participants?.find((user) => user.name === rank.participant)
        ?.id ?? rank.participant,
    name: rank.participant,
    rank: index + 1,
    points: rank.getTotalPoolPoints(),
  }));

  // Feeds the analysis charts of the lineup dialog. Everything here is derived
  // from the stats already computed above, never from a second
  // `calculatePoolStats` pass.
  const lineupAnalytics = {
    playerPoolPoints: Object.values(playerStats).reduce(
      (points: Record<number, number>, roster) => {
        for (const player of [
          ...roster.forwards,
          ...roster.defense,
          ...roster.goalies,
        ]) {
          points[player.id] = player.poolPoints;
        }
        return points;
      },
      {},
    ),
    poolers: getPoolerCapUsage(poolInfo).map((usage) => ({
      ...usage,
      poolPoints:
        ranking
          .find((rank) => rank.participant === usage.name)
          ?.getTotalPoolPoints() ?? 0,
    })),
  };

  // The daily points columns only make sense for a day that belongs to the
  // pool. With no date selected the day being looked at is the one the nhl api
  // reports as "now" (what the date picker shows), which lands outside of the
  // season during the off-season — the pool context falls back to the last day
  // of the pool instead, so it cannot be used to answer that question. All
  // three values are yyyy-MM-dd strings, which compare exactly without any
  // timezone question.
  const displayedDate =
    querySelectedDate === "now"
      ? (score?.currentDate ?? format(currentDate, "yyyy-MM-dd"))
      : dateOfInterest;
  const isDateInPoolRange =
    displayedDate >= poolInfo.season_start &&
    displayedDate <= poolInfo.season_end;

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
          selectedParticipant,
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
    title: string,
    total: SkaterTotal,
  ) => (
    <div className="space-y-2">
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
          },
          getRowStyles: (row: Row<SkaterInfo>) =>
            getPlayerStatusRowStyle(row.original.status),
          onRowClick: () => null,
          t: t,
        }}
        title={title}
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
    title: string,
    total: GoalieTotal,
  ) => (
    <div className="space-y-2">
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
          },
          getRowStyles: (row: Row<GoalieInfo>) =>
            getPlayerStatusRowStyle(row.original.status),
          onRowClick: () => null,
          t: t,
        }}
        title={title}
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
        columnPinning: { left: ["number", "player"] },
      }}
      meta={{
        props: poolInfo,
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={t("AvailableReservists")}
      tableFooter={null}
    />
  );

  // Mirrors what the backend accepts for a roster modification.
  const canSaveLineupOf = (participant: PoolUser) =>
    poolInfo.status === PoolState.InProgress &&
    (userData.info?.id === participant.id ||
      hasPoolPrivilege(userData.info?.id, poolInfo));

  const ParticipantRoster = (participant: PoolUser) => (
    <>
      {/* Anybody can open the lineup to try combinations, saving it is what
          needs the rights. */}
      {poolInfo.settings.number_reservists > 0 ? (
        <div className="mb-2 flex justify-end">
          {/* No key on the dialog: the pooler selector inside it changes the
              participant, and remounting would close the dialog. */}
          <Dialog>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <PencilLine className="size-4" />
              {canSaveLineupOf(participant)
                ? t("EditLineup")
                : t("SimulateLineup")}
            </DialogTrigger>
            <DialogContent className="flex h-full max-h-[92%] w-full max-w-5xl flex-col gap-3 p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>
                  {canSaveLineupOf(participant)
                    ? t("EditLineup")
                    : t("SimulateLineup")}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="min-h-0 flex-1">
                <StartingRoster
                  userRoster={getPoolerActivePlayers(
                    poolInfo.context!,
                    participant,
                  )}
                  teamSalaryCap={poolInfo.settings.salary_cap}
                  poolerEntries={poolerEntries}
                  analytics={lineupAnalytics}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
      {poolInfo.settings.number_forwards > 0 ? (
        <Accordion defaultValue={["forwards"]}>
          <AccordionItem value="forwards">
            <AccordionTrigger>{`${t("Forwards")} (${
              playerStats[participant.id].forwards.filter(
                (player) =>
                  player.status === PlayerStatus.InAlignment ||
                  player.status === PlayerStatus.PointsIgnored,
              ).length
            }/${poolInfo.settings.number_forwards})`}</AccordionTrigger>
            <AccordionContent>
              <Dialog
                open={isForwardChartOpen}
                onOpenChange={setIsForwardChartOpen}
              >
                <DialogContent className="sm:max-w-[700px]">
                  <DialogHeader>
                    <DialogTitle>
                      {poolInfo.context?.players[selectedPlayerId ?? ""]?.name}
                    </DialogTitle>
                    <DialogDescription>
                      {t("RecordedPoolPointsDescription", {
                        playerName:
                          poolInfo.context?.players[selectedPlayerId ?? ""]
                            ?.name ?? "",
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
                ForwardColumn,
                getFormatedPlayersTableTitle(
                  participant.name,
                  "TotalPointsMadeByForwardsFor",
                ),
                ranking.find(
                  (rank) => rank.participant === selectedPoolUser.name,
                )!.forwards,
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
      {poolInfo.settings.number_defenders > 0 ? (
        <Accordion defaultValue={["defense"]}>
          <AccordionItem value="defense">
            <AccordionTrigger>{`${t("Defense")} (${
              playerStats[participant.id].defense.filter(
                (player) =>
                  player.status === PlayerStatus.InAlignment ||
                  player.status === PlayerStatus.PointsIgnored,
              ).length
            }/${poolInfo.settings.number_defenders})`}</AccordionTrigger>
            <AccordionContent>
              <Dialog
                open={isDefenderChartOpen}
                onOpenChange={setIsDefenderChartOpen}
              >
                <DialogContent className="sm:max-w-[700px]">
                  <DialogHeader>
                    <DialogTitle>
                      {poolInfo.context?.players[selectedPlayerId ?? ""]?.name}
                    </DialogTitle>
                    <DialogDescription>
                      {t("RecordedPoolPointsDescription", {
                        playerName:
                          poolInfo.context?.players[selectedPlayerId ?? ""]
                            ?.name ?? "",
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
                DefenseColumn,
                getFormatedPlayersTableTitle(
                  participant.name,
                  "TotalPointsMadeByDefenseFor",
                ),
                ranking.find(
                  (rank) => rank.participant === selectedPoolUser.name,
                )!.defense,
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
      {poolInfo.settings.number_goalies > 0 ? (
        <Accordion defaultValue={["goalies"]}>
          <AccordionItem value="goalies">
            <AccordionTrigger>{`${t("Goalies")} (${
              playerStats[participant.id].goalies.filter(
                (player) =>
                  player.status === PlayerStatus.InAlignment ||
                  player.status === PlayerStatus.PointsIgnored,
              ).length
            }/${poolInfo.settings.number_goalies})`}</AccordionTrigger>
            <AccordionContent>
              <Dialog
                open={isGoalieChartOpen}
                onOpenChange={setIsGoalieChartOpen}
              >
                <DialogContent className="sm:max-w-[700px]">
                  <DialogHeader>
                    <DialogTitle>
                      {poolInfo.context?.players[selectedPlayerId ?? ""]?.name}
                    </DialogTitle>
                    <DialogDescription>
                      {t("RecordedPoolPointsDescription", {
                        playerName:
                          poolInfo.context?.players[selectedPlayerId ?? ""]
                            ?.name ?? "",
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
                GoalieColumn,
                getFormatedPlayersTableTitle(
                  participant.name,
                  "TotalPointsMadeByGoaliesFor",
                ),
                ranking.find(
                  (rank) => rank.participant === selectedPoolUser.name,
                )!.goalies,
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
      {poolInfo.settings.number_reservists > 0 ? (
        <Accordion defaultValue={["reservists"]}>
          <AccordionItem value="reservists">
            <AccordionTrigger>{t("Reservists")}</AccordionTrigger>
            <AccordionContent>
              {ReservistTable(
                poolInfo.context?.pooler_roster[participant.id]
                  .chosen_reservists as number[],
                ReservistColumn,
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
      {(poolInfo.settings.dynasty_settings?.tradable_picks ?? 0 > 0) ? (
        <Accordion defaultValue={["picks"]}>
          <AccordionItem value="picks">
            <AccordionTrigger>{t("NextSeasonPicks")}</AccordionTrigger>
            <AccordionContent>
              <PickList poolUser={selectedPoolUser} poolInfo={poolInfo} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
    </>
  );

  const getFormatedPlayersTableTitle = (participant: string, title: string) =>
    `${t(title)} ${participant}`;

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
            isDateInPoolRange
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
