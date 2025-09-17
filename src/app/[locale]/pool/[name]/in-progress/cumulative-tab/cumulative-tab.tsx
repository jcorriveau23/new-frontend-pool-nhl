// The pools page, list all the pools stored in the db.

"use client";
import * as React from "react";
import { getPoolerActivePlayers, PoolState, PoolUser } from "@/data/pool/model";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TotalPointsColumn,
  ForwardsTotalColumn,
  DefensesTotalColumn,
  GoaliesTotalColumn,
} from "./cumulative-columns";

import {
  DefenseColumn,
  ForwardColumn,
  GoalieColumn,
  ReservistColumn,
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
import PickList from "@/components/pick-list";
import { useDateContext } from "@/context/date-context";
import { Button } from "@/components/ui/button";
import { Dialog } from "@radix-ui/react-dialog";
import {
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  POOL_NAME_MAX_LENGTH,
  POOL_NAME_MIN_LENGTH,
} from "@/components/pool-settings";
import { seasonFormat } from "@/app/utils/formating";
import { useSession } from "@/context/useSessionData";
import { toast } from "@/hooks/use-toast";
import InformationIcon from "@/components/information-box";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import StartingRoster from "@/components/starting-roster";
import { PoolerUserGlobalSelector } from "@/components/pool-user-selector";
import { TableCell, TableRow } from "@/components/ui/table";
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
import { LineChart } from "lucide-react";
import { TimeRangeSkaterChart } from "@/components/chart/time-range-skater-chart";
import { TimeRangePoolChart } from "@/components/chart/time-range-pool-chart";
import { TimeRangeGoalieChart } from "@/components/chart/time-range-goalie-chart";
import { useUser } from "@/context/useUserData";
import PlayersTable from "@/components/player-table";
import { Search } from "lucide-react";

export default function CumulativeTab() {
  const t = useTranslations();
  const { currentDate, querySelectedDate } = useDateContext();
  const { gamesNightStatus } = useGamesNightContext();
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(
    null
  );
  const [isForwardChartOpen, setIsForwardChartOpen] = React.useState(false);
  const [isDefenderChartOpen, setIsDefenderChartOpen] = React.useState(false);
  const [isGoalieChartOpen, setIsGoalieChartOpen] = React.useState(false);
  const [playerStats, setPlayerStats] = React.useState<Record<
    string,
    ParticipantsRoster
  > | null>(null);
  const [ranking, setRanking] = React.useState<TotalRanking[] | null>(null);
  const {
    poolInfo,
    updatePoolInfo,
    poolStartDate,
    poolSelectedEndDate,
    selectedParticipant,
    selectedPoolUser,
    playersOwner,
    dailyPointsMade,
    updateSelectedParticipant,
  } = usePoolContext();

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
    const res = await fetch("/api-rust/mark-as-final", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession.info?.jwt}`,
      },
      body: JSON.stringify({
        pool_name: poolInfo.name,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      toast({
        variant: "destructive",
        title: t("CouldNotMarkAsFinalPoolError", {
          name: poolInfo.name,
          error: error,
        }),
        duration: 2000,
      });
      return;
    }
    const data = await res.json();
    updatePoolInfo(data);
  };

  const generateDynasty = async (newPoolName: string) => {
    const res = await fetch("/api-rust/generate-dynasty", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession.info?.jwt}`,
      },
      body: JSON.stringify({
        pool_name: poolInfo.name,
        new_pool_name: newPoolName,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      toast({
        variant: "destructive",
        title: t("CouldNotGeneratePoolError", {
          name: newPoolName,
          error: error,
        }),
        duration: 2000,
      });
      return;
    }
    const data = await res.json();
    updatePoolInfo(data);
  };

  React.useEffect(() => {
    const [stats, rank] = calculatePoolStats(
      poolInfo,
      poolStartDate,
      poolSelectedEndDate,
      dailyPointsMade
    );

    setPlayerStats(stats);
    setRanking(rank);
  }, [dailyPointsMade, poolStartDate, poolSelectedEndDate]);

  if (ranking === null || playerStats === null) {
    return <h1>Loading ranking and player stats...</h1>;
  }

  const getDailyGameState = (cumulated: boolean | undefined) => {
    if (cumulated) {
      return GamesNightStatus.COMPLETED;
    }

    return gamesNightStatus;
  };

  const TotalTable = (
    ranking: TotalRanking[],
    columns: ColumnDef<TotalRanking>[],
    title: string
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
            return "bg-selection hover:bg-selection";
          }
        },
        onRowClick: (row: Row<TotalRanking>) => {
          updateSelectedParticipant(row.original.participant);
        },
        t,
      }}
      title={title}
      tableFooter={null}
    />
  );

  const SkaterTable = (
    rows: SkaterInfo[],
    columns: ColumnDef<SkaterInfo>[],
    title: string,
    total: SkaterTotal
  ) => (
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
        columnPinning: { left: ["number", "status", "player"] },
      }}
      meta={{
        props: {
          poolInfo,
          setSelectedPlayerId,
          setIsForwardChartOpen,
          setIsDefenderChartOpen,
        },
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={title}
      tableFooter={
        <TableRow>
          <TableCell colSpan={4}>{t("Total")}</TableCell>
          <TableCell>{total.numberOfGame}</TableCell>
          <TableCell>{total.goals}</TableCell>
          <TableCell>{total.assists}</TableCell>
          <TableCell>{total.hattricks}</TableCell>
          <TableCell>{total.shootoutGoals}</TableCell>
          <TableCell>{total.totalPoolPoints}</TableCell>
          <TableCell>
            {total.numberOfGame > 0
              ? (total.totalPoolPoints / total.numberOfGame).toFixed(3)
              : null}
          </TableCell>
        </TableRow>
      }
    />
  );

  const GoalieTable = (
    rows: GoalieInfo[],
    columns: ColumnDef<GoalieInfo>[],
    title: string,
    total: GoalieTotal
  ) => (
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
        columnPinning: { left: ["number", "status", "player"] },
      }}
      meta={{
        props: {
          poolInfo,
          setSelectedPlayerId,
          setIsGoalieChartOpen,
        },
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={title}
      tableFooter={
        <TableRow>
          <TableCell colSpan={4}>{t("Total")}</TableCell>
          <TableCell>{total.numberOfGame}</TableCell>
          <TableCell>{total.wins}</TableCell>
          <TableCell>{total.shutouts}</TableCell>
          <TableCell>{total.overtimeLosses}</TableCell>
          <TableCell>{total.goals}</TableCell>
          <TableCell>{total.assists}</TableCell>
          <TableCell>{total.totalPoolPoints}</TableCell>
          <TableCell>
            {total.numberOfGame > 0
              ? (total.totalPoolPoints / total.numberOfGame).toFixed(3)
              : null}
          </TableCell>
        </TableRow>
      }
    />
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

  const ParticipantRoster = (participant: PoolUser) => (
    <>
      {userData.info?.id === poolInfo.owner ||
      poolInfo.settings.number_reservists > 0 ? (
        <Dialog key={participant.id}>
          <DialogTrigger asChild>
            <Button variant="outline">{t("ModifyRoster")}</Button>
          </DialogTrigger>
          <DialogContent className="h-full max-h-[96%] p-4 w-full max-w-[96%]">
            <DialogHeader>
              <DialogTitle>{t("ModifyRoster")}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="p-0">
              <StartingRoster
                userRoster={getPoolerActivePlayers(
                  poolInfo.context!,
                  selectedPoolUser
                )}
                teamSalaryCap={poolInfo.settings.salary_cap}
              />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      ) : null}
      {poolInfo.settings.number_forwards > 0 ? (
        <Accordion type="single" collapsible defaultValue="forwards">
          <AccordionItem value="forwards">
            <AccordionTrigger>{`${t("Forwards")} (${
              playerStats[participant.id].forwards.filter(
                (player) =>
                  player.status === PlayerStatus.InAlignment ||
                  player.status === PlayerStatus.PointsIgnored
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
                  "TotalPointsMadeByForwardsFor"
                ),
                ranking.find(
                  (rank) => rank.participant === selectedPoolUser.name
                )!.forwards
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
      {poolInfo.settings.number_defenders > 0 ? (
        <Accordion type="single" collapsible defaultValue="defense">
          <AccordionItem value="defense">
            <AccordionTrigger>{`${t("Defense")} (${
              playerStats[participant.id].defense.filter(
                (player) =>
                  player.status === PlayerStatus.InAlignment ||
                  player.status === PlayerStatus.PointsIgnored
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
                  "TotalPointsMadeByDefenseFor"
                ),
                ranking.find(
                  (rank) => rank.participant === selectedPoolUser.name
                )!.defense
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
      {poolInfo.settings.number_goalies > 0 ? (
        <Accordion type="single" collapsible defaultValue="goalies">
          <AccordionItem value="goalies">
            <AccordionTrigger>{`${t("Goalies")} (${
              playerStats[participant.id].goalies.filter(
                (player) =>
                  player.status === PlayerStatus.InAlignment ||
                  player.status === PlayerStatus.PointsIgnored
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
                  "TotalPointsMadeByGoaliesFor"
                ),
                ranking.find(
                  (rank) => rank.participant === selectedPoolUser.name
                )!.goalies
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
      {poolInfo.settings.number_reservists > 0 ? (
        <Accordion type="single" collapsible defaultValue="reservists">
          <AccordionItem value="reservists">
            <AccordionTrigger>{t("Reservists")}</AccordionTrigger>
            <AccordionContent>
              {ReservistTable(
                poolInfo.context?.pooler_roster[participant.id]
                  .chosen_reservists as number[],
                ReservistColumn
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
      {poolInfo.settings.dynasty_settings?.tradable_picks ?? 0 > 0 ? (
        <Accordion type="single" collapsible defaultValue="picks">
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
      <DialogTrigger asChild>
        <Button variant="outline">
          {t("ContinuePoolForNextSeason", {
            season: seasonFormat(poolInfo.season, 1),
          })}
        </Button>
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

  const chartCollapsible = (positionFilter: "F" | "D" | "G" | null) => (
    <Accordion type="single" collapsible>
      <AccordionItem value={positionFilter ?? "All"}>
        <AccordionTrigger>
          <span className="inline-flex items-center space-x-2">
            <div>Chart</div>
            <LineChart />
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <TimeRangePoolChart positionFilter={positionFilter} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  return (
    <div>
      <Tabs defaultValue="totalRanking">
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
        <div className="overflow-auto">
          <TabsList>
            <TabsTrigger value="totalRanking">{t("Total")}</TabsTrigger>
            <TabsTrigger value="forwardRanking">{t("Forwards")}</TabsTrigger>
            <TabsTrigger value="defenseRanking">{t("Defense")}</TabsTrigger>
            <TabsTrigger value="goaliesRanking">{t("Goalies")}</TabsTrigger>
            {poolInfo.status === PoolState.Final ? (
              <InformationIcon text={t("FinalPoolResult")} />
            ) : null}
          </TabsList>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Search /> {t("Players")}
            </Button>
          </DialogTrigger>
          <DialogContent className="h-full max-h-[96%] p-4 w-full max-w-[96%]">
            <DialogHeader>
              <DialogTitle>{t("DraftAPlayer")}</DialogTitle>
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
        <TabsContent value="totalRanking">
          {chartCollapsible(null)}
          {TotalTable(ranking, TotalPointsColumn, t("TotalRanking"))}
        </TabsContent>
        <TabsContent value="forwardRanking">
          {chartCollapsible("F")}
          {TotalTable(ranking, ForwardsTotalColumn, t("ForwardRanking"))}
        </TabsContent>
        <TabsContent value="defenseRanking">
          {chartCollapsible("D")}
          {TotalTable(ranking, DefensesTotalColumn, t("DefenseRanking"))}
        </TabsContent>
        <TabsContent value="goaliesRanking">
          {chartCollapsible("G")}
          {TotalTable(ranking, GoaliesTotalColumn, t("GoaliesRanking"))}
        </TabsContent>
      </Tabs>
      <div className="pt-3 space-y-2">
        <PoolerUserGlobalSelector />
        {ParticipantRoster(selectedPoolUser)}
      </div>
    </div>
  );
}
