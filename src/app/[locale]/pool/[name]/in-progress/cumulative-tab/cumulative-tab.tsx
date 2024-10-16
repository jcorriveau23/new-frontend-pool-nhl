// The pools page, list all the pools stored in the db.

"use client";
import * as React from "react";
import {
  getPoolerActivePlayers,
  GoaliesSettings,
  PoolSettings,
  PoolState,
  PoolUser,
  SkaterSettings,
} from "@/data/pool/model";
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
import { PoolerUserSelector } from "@/components/pool-user-selector";
import { TableCell, TableRow } from "@/components/ui/table";

export enum PlayerStatus {
  // Tells if the player is in the alignment at that date.
  InAlignment = "Active",

  // Tells if the player is currently a reservists at that date.
  IsReservists = "Reservist",

  // Tells if the player points is considered or not.
  // We can ignore the worst X players in the pool settings.
  PointsIgnored = "Ignored",

  // Player traded, no more owned by the player.
  Traded = "Traded",
}

export class SkaterInfo {
  constructor(playerId: number, status: PlayerStatus) {
    this.id = playerId;
    this.numberOfGame = 0;
    this.goals = 0;
    this.assists = 0;
    this.hattricks = 0;
    this.shootoutGoals = 0;
    this.poolPoints = 0;
    this.status = status;
  }

  id: number;

  numberOfGame: number;
  goals: number;
  assists: number;
  hattricks: number;
  shootoutGoals: number;
  poolPoints: number;

  status: PlayerStatus;

  public getTotalPoints(): number {
    return this.goals + this.assists;
  }

  public getTotalPoolPoints(skaters_settings: SkaterSettings): number {
    return (
      this.goals * skaters_settings.points_per_goals +
      this.assists * skaters_settings.points_per_assists +
      this.hattricks * skaters_settings.points_per_hattricks +
      this.shootoutGoals * skaters_settings.points_per_shootout_goals
    );
  }
}

export class GoalieInfo {
  constructor(playerId: number, status: PlayerStatus) {
    this.id = playerId;
    this.numberOfGame = 0;
    this.goals = 0;
    this.assists = 0;
    this.wins = 0;
    this.shutouts = 0;
    this.overtimeLosses = 0;
    this.poolPoints = 0;
    this.status = status;
  }
  id: number;

  // The number of game and stats of the skaters.
  numberOfGame: number;
  goals: number;
  assists: number;
  wins: number;
  shutouts: number;
  overtimeLosses: number;
  poolPoints: number;

  status: PlayerStatus;

  public getTotalPoolPoints(settings: GoaliesSettings): number {
    return (
      this.goals * settings.points_per_goals +
      this.assists * settings.points_per_assists +
      this.wins * settings.points_per_wins +
      this.shutouts * settings.points_per_shutouts +
      this.overtimeLosses * settings.points_per_overtimes
    );
  }
}

export class ParticipantsRoster {
  constructor() {
    this.forwards = [];
    this.defense = [];
    this.goalies = [];
  }
  forwards: SkaterInfo[];
  defense: SkaterInfo[];
  goalies: GoalieInfo[];
}

export class SkaterTotal {
  constructor(skaters: SkaterInfo[], skaters_settings: SkaterSettings) {
    this.numberOfGame = skaters
      .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
      .reduce((acc, skater) => acc + skater.numberOfGame, 0);
    this.goals = skaters
      .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
      .reduce((acc, skater) => acc + skater.goals, 0);
    this.assists = skaters
      .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
      .reduce((acc, skater) => acc + skater.assists, 0);
    this.hattricks = skaters
      .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
      .reduce((acc, skater) => acc + skater.hattricks, 0);
    this.shootoutGoals = skaters
      .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
      .reduce((acc, skater) => acc + skater.shootoutGoals, 0);
    this.totalPoints = this.getTotalPoints();
    this.totalPoolPoints = this.getTotalPoolPoints(skaters_settings);
  }
  numberOfGame: number;
  goals: number;
  assists: number;
  hattricks: number;
  shootoutGoals: number;
  totalPoints: number;
  totalPoolPoints: number;

  public getTotalPoints(): number {
    return this.goals + this.assists;
  }

  public getTotalPoolPoints(skaters_settings: SkaterSettings): number {
    return (
      this.goals * skaters_settings.points_per_goals +
      this.assists * skaters_settings.points_per_assists +
      this.hattricks * skaters_settings.points_per_hattricks +
      this.shootoutGoals * skaters_settings.points_per_shootout_goals
    );
  }
}

export class GoalieTotal {
  constructor(goalies: GoalieInfo[], settings: GoaliesSettings) {
    this.numberOfGame = goalies
      .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
      .reduce((acc, goalie) => acc + goalie.numberOfGame, 0);
    this.goals = goalies
      .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
      .reduce((acc, goalie) => acc + goalie.goals, 0);
    this.assists = goalies
      .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
      .reduce((acc, goalie) => acc + goalie.assists, 0);
    this.wins = goalies
      .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
      .reduce((acc, goalie) => acc + goalie.wins, 0);
    this.shutouts = goalies
      .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
      .reduce((acc, goalie) => acc + goalie.shutouts, 0);
    this.overtimeLosses = goalies
      .filter((skater) => skater.status !== PlayerStatus.PointsIgnored)
      .reduce((acc, goalie) => acc + goalie.overtimeLosses, 0);
    this.totalPoolPoints = this.getTotalPoolPoints(settings);
  }
  numberOfGame: number;
  goals: number;
  assists: number;
  wins: number;
  shutouts: number;
  overtimeLosses: number;
  totalPoolPoints: number;

  public getTotalPoolPoints(settings: GoaliesSettings): number {
    return (
      this.goals * settings.points_per_goals +
      this.assists * settings.points_per_assists +
      this.wins * settings.points_per_wins +
      this.shutouts * settings.points_per_shutouts +
      this.overtimeLosses * settings.points_per_overtimes
    );
  }
}

export class TotalRanking {
  constructor(
    userName: string,
    forwards: SkaterInfo[],
    defense: SkaterInfo[],
    goalies: GoalieInfo[],
    settings: PoolSettings
  ) {
    this.participant = userName;
    this.forwards = new SkaterTotal(forwards, settings.forwards_settings);
    this.defense = new SkaterTotal(defense, settings.defense_settings);
    this.goalies = new GoalieTotal(goalies, settings.goalies_settings);
  }
  participant: string;

  forwards: SkaterTotal;
  defense: SkaterTotal;
  goalies: GoalieTotal;

  public getTotalPoolPoints(): number {
    return (
      this.forwards.totalPoolPoints +
      this.defense.totalPoolPoints +
      this.goalies.totalPoolPoints
    );
  }
}

export default function CumulativeTab() {
  const t = useTranslations();
  const { selectedDate, currentDate } = useDateContext();
  const [playerStats, setPlayerStats] = React.useState<Record<
    string,
    ParticipantsRoster
  > | null>(null);
  const [ranking, setRanking] = React.useState<TotalRanking[] | null>(null);
  const {
    poolInfo,
    updatePoolInfo,
    lastFormatDate,
    selectedParticipant,
    selectedPoolUser,
    updateSelectedParticipant,
  } = usePoolContext();

  const userSession = useSession();

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
      })
      .default(""),
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
    const calculatePoolStats = async () => {
      if (poolInfo.participants === null || poolInfo.context === null) {
        return;
      }
      const stats: Record<string, ParticipantsRoster> = {};
      const rank: TotalRanking[] = [];
      // Calculate all the points made by each players and cumulate the total points of each poolers
      // to be able to fill up the tables that display pooler points between the beginning of the season and the selected date.

      // First Add the players that are currently owned by the player either in reservists or in the alignment.
      for (let i = 0; i < poolInfo.participants.length; i += 1) {
        const participant = poolInfo.participants[i].id;

        stats[participant] = new ParticipantsRoster();

        // Forwards (In the alignment)
        for (
          let j = 0;
          j <
          poolInfo.context?.pooler_roster[participant].chosen_forwards.length;
          j += 1
        ) {
          const playerId =
            poolInfo.context?.pooler_roster[participant].chosen_forwards[j];

          stats[participant].forwards.push(
            new SkaterInfo(playerId, PlayerStatus.InAlignment)
          );
        }

        // Defenses (In the alignment)
        for (
          let j = 0;
          j <
          poolInfo.context?.pooler_roster[participant].chosen_defenders.length;
          j += 1
        ) {
          const playerId =
            poolInfo.context?.pooler_roster[participant].chosen_defenders[j];

          stats[participant].defense.push(
            new SkaterInfo(playerId, PlayerStatus.InAlignment)
          );
        }

        // Goalies (In the alignment)
        for (
          let j = 0;
          j <
          poolInfo.context?.pooler_roster[participant].chosen_goalies.length;
          j += 1
        ) {
          const playerId =
            poolInfo.context?.pooler_roster[participant].chosen_goalies[j];

          stats[participant].goalies.push(
            new GoalieInfo(playerId, PlayerStatus.InAlignment)
          );
        }
      }

      // Now parse all the pool date from the start of the season to the current date.
      const startDate = new Date(poolInfo.season_start + "T00:00:00");
      let endDate = selectedDate
        ? selectedDate
        : lastFormatDate
        ? new Date(lastFormatDate + "T00:00:00")
        : new Date();

      if (endDate < startDate) {
        endDate = new Date(poolInfo.season_start + "T00:00:00");
      }

      console.log(`itterating from ${startDate} to ${endDate}`);

      for (let j = startDate; j <= endDate; j.setDate(j.getDate() + 1)) {
        const jDate = j.toISOString().slice(0, 10);

        for (let i = 0; i < poolInfo.participants.length; i += 1) {
          const participant = poolInfo.participants[i].id;

          if (
            poolInfo.context?.score_by_day &&
            jDate in poolInfo.context.score_by_day
          ) {
            // Forwards
            Object.keys(
              poolInfo.context?.score_by_day[jDate][participant].roster.F
            ).map((key) => {
              if (
                poolInfo.context === null ||
                poolInfo.context.score_by_day === null
              ) {
                return null;
              }
              const player =
                poolInfo.context.score_by_day[jDate][participant].roster.F[key];
              if (player) {
                const playerId = Number(key);

                let index = stats[participant].forwards.findIndex(
                  (p) => p.id === playerId
                );

                if (index === -1) {
                  const indexReservist = poolInfo.context.pooler_roster[
                    participant
                  ].chosen_reservists.findIndex((p) => p === playerId);

                  index =
                    stats[participant].forwards.push(
                      new SkaterInfo(
                        playerId,
                        indexReservist >= 0
                          ? PlayerStatus.IsReservists
                          : PlayerStatus.Traded
                      )
                    ) - 1;
                }

                stats[participant].forwards[index].numberOfGame += 1;
                stats[participant].forwards[index].goals += player.G;
                stats[participant].forwards[index].assists += player.A;
                stats[participant].forwards[index].hattricks +=
                  player.G >= 3 ? 1 : 0;
                stats[participant].forwards[index].shootoutGoals +=
                  player.SOG ?? 0;
              }
            });

            // Defenses
            Object.keys(
              poolInfo.context.score_by_day[jDate][participant].roster.D
            ).map((key) => {
              if (
                poolInfo.context === null ||
                poolInfo.context.score_by_day === null
              ) {
                return null;
              }
              const player =
                poolInfo.context.score_by_day[jDate][participant].roster.D[key];
              if (player) {
                const playerId = Number(key);

                let index = stats[participant].defense.findIndex(
                  (p) => p.id === playerId
                );

                if (index === -1) {
                  const indexReservist = poolInfo.context.pooler_roster[
                    participant
                  ].chosen_reservists.findIndex((p) => p === playerId);

                  index =
                    stats[participant].defense.push(
                      new SkaterInfo(
                        playerId,
                        indexReservist >= 0
                          ? PlayerStatus.IsReservists
                          : PlayerStatus.Traded
                      )
                    ) - 1;
                }

                stats[participant].defense[index].numberOfGame += 1;
                stats[participant].defense[index].goals += player.G;
                stats[participant].defense[index].assists += player.A;
                stats[participant].defense[index].hattricks +=
                  player.G >= 3 ? 1 : 0;
                stats[participant].defense[index].shootoutGoals +=
                  player.SOG ?? 0;
              }
            });

            // Goalies
            Object.keys(
              poolInfo.context.score_by_day[jDate][participant].roster.G
            ).map((key) => {
              if (
                poolInfo.context === null ||
                poolInfo.context.score_by_day === null
              ) {
                return null;
              }
              const player =
                poolInfo.context.score_by_day[jDate][participant].roster.G[key];
              if (player) {
                const playerId = Number(key);

                let index = stats[participant].goalies.findIndex(
                  (p) => p.id === playerId
                );

                if (index === -1) {
                  const indexReservist = poolInfo.context.pooler_roster[
                    participant
                  ].chosen_reservists.findIndex((p) => p === playerId);

                  index =
                    stats[participant].goalies.push(
                      new GoalieInfo(
                        playerId,
                        indexReservist >= 0
                          ? PlayerStatus.IsReservists
                          : PlayerStatus.Traded
                      )
                    ) - 1;
                }

                stats[participant].goalies[index].numberOfGame += 1;
                stats[participant].goalies[index].goals += player.G;
                stats[participant].goalies[index].assists += player.A;
                stats[participant].goalies[index].wins += player.W ? 1 : 0;
                stats[participant].goalies[index].shutouts += player.SO ? 1 : 0;
                stats[participant].goalies[index].overtimeLosses += player.OT
                  ? 1
                  : 0;
              }
            });
          }
        }
      }

      // Now Create the Ranking table data class.
      // This require to cumulate the total points into each players base on the pool settings.
      for (let i = 0; i < poolInfo.participants.length; i += 1) {
        const user = poolInfo.participants[i];

        for (let j = 0; j < stats[user.id].forwards.length; j += 1) {
          stats[user.id].forwards[j].poolPoints = stats[user.id].forwards[
            j
          ].getTotalPoolPoints(poolInfo.settings.forwards_settings);
        }

        for (let j = 0; j < stats[user.id].defense.length; j += 1) {
          stats[user.id].defense[j].poolPoints = stats[user.id].defense[
            j
          ].getTotalPoolPoints(poolInfo.settings.defense_settings);
        }

        for (let j = 0; j < stats[user.id].goalies.length; j += 1) {
          stats[user.id].goalies[j].poolPoints = stats[user.id].goalies[
            j
          ].getTotalPoolPoints(poolInfo.settings.goalies_settings);
        }

        // Sort and change state of players that should be considered ignore from the settings.
        stats[user.id].forwards.sort((a, b) => b.poolPoints - a.poolPoints);
        stats[user.id].defense.sort((a, b) => b.poolPoints - a.poolPoints);
        stats[user.id].goalies.sort((a, b) => b.poolPoints - a.poolPoints);

        // Now change the ignore settings base on the
        for (
          let i =
            stats[user.id].forwards.length -
            (poolInfo.settings.ignore_x_worst_players?.forwards ?? 0);
          i < stats[user.id].forwards.length;
          i += 1
        ) {
          stats[user.id].forwards[i].status = PlayerStatus.PointsIgnored;
        }

        for (
          let i =
            stats[user.id].defense.length -
            (poolInfo.settings.ignore_x_worst_players?.defense ?? 0);
          i < stats[user.id].defense.length;
          i += 1
        ) {
          stats[user.id].defense[i].status = PlayerStatus.PointsIgnored;
        }

        for (
          let i =
            stats[user.id].goalies.length -
            (poolInfo.settings.ignore_x_worst_players?.goalies ?? 0);
          i < stats[user.id].goalies.length;
          i += 1
        ) {
          stats[user.id].goalies[i].status = PlayerStatus.PointsIgnored;
        }

        rank.push(
          new TotalRanking(
            user.name,
            stats[user.id].forwards,
            stats[user.id].defense,
            stats[user.id].goalies,
            poolInfo.settings
          )
        );

        rank.sort((a, b) => b.getTotalPoolPoints() - a.getTotalPoolPoints());
      }

      setPlayerStats(stats);
      setRanking(rank);
    };

    calculatePoolStats();
  }, [selectedDate]);

  if (ranking === null || playerStats === null) {
    return <h1>Loading ranking and player stats...</h1>;
  }

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
        props: { poolInfo: poolInfo },
        getRowStyles: (row: Row<TotalRanking>) => {
          if (row.original.participant === selectedParticipant) {
            return "bg-selection hover:bg-selection";
          }
        },
        onRowClick: (row: Row<TotalRanking>) => {
          updateSelectedParticipant(row.original.participant);
        },
        t: t,
      }}
      title={title}
      tableFooter={null}
    />
  );

  const SkaterTable = (
    rows: any[],
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
        props: poolInfo,
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
          <TableCell>{total.totalPoints}</TableCell>
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
    rows: any[],
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
        props: poolInfo,
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

  const ReservistTable = (rows: number[], columns: ColumnDef<any>[]) => (
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
      title={t("Available reservists")}
      tableFooter={null}
    />
  );

  const ParticipantRoster = (participant: PoolUser) => (
    <>
      {userSession.info?.userID === poolInfo.owner ||
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
              {SkaterTable(
                playerStats[participant.id].forwards,
                ForwardColumn,
                getFormatedPlayersTableTitle(
                  participant.name,
                  "Total points made by forwards for"
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
              {SkaterTable(
                playerStats[participant.id].defense,
                DefenseColumn,
                getFormatedPlayersTableTitle(
                  participant.name,
                  "Total points made by defense for"
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
              {GoalieTable(
                playerStats[participant.id].goalies,
                GoalieColumn,
                getFormatedPlayersTableTitle(
                  participant.name,
                  "Total points made by goalies for"
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
            <AccordionTrigger>{t("Next season picks")}</AccordionTrigger>
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

  const CumulatedInformationBox = () => {
    return poolInfo.context?.score_by_day?.[lastFormatDate!]?.[
      selectedPoolUser.id
    ]?.is_cumulated ? null : (
      <InformationIcon
        text={t("notCumulatedYet", {
          selectedDate: lastFormatDate,
        })}
      />
    );
  };

  return (
    <div>
      <Tabs defaultValue="totalRanking">
        {poolInfo.status === PoolState.InProgress &&
        new Date(poolInfo.season_end + "T00:00:00") < currentDate &&
        hasPoolPrivilege(userSession.info?.userID, poolInfo) ? (
          <Button onClick={markAsFinal}>{t("MarkAsFinal")}</Button>
        ) : null}
        {poolInfo.status === PoolState.Final &&
        poolInfo.settings.dynasty_settings &&
        !poolInfo.settings.dynasty_settings.next_season_pool_name &&
        hasPoolPrivilege(userSession.info?.userID, poolInfo)
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
            ) : (
              CumulatedInformationBox()
            )}
          </TabsList>
        </div>
        <TabsContent value="totalRanking">
          {TotalTable(ranking, TotalPointsColumn, t("Total Ranking"))}
        </TabsContent>
        <TabsContent value="forwardRanking">
          {TotalTable(ranking, ForwardsTotalColumn, t("Forward Ranking"))}
        </TabsContent>
        <TabsContent value="defenseRanking">
          {TotalTable(ranking, DefensesTotalColumn, t("Defense Ranking"))}
        </TabsContent>
        <TabsContent value="goaliesRanking">
          {TotalTable(ranking, GoaliesTotalColumn, t("Goalies Ranking"))}
        </TabsContent>
      </Tabs>
      <div className="pt-3 space-y-2">
        <PoolerUserSelector />
        {ParticipantRoster(selectedPoolUser)}
      </div>
    </div>
  );
}
