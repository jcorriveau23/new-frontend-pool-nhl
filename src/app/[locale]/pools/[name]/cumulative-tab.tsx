// The pools page, list all the pools stored in the db.

"use client";
import * as React from "react";
import { Pool, PoolSettings } from "@/data/pool/model";
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

export interface Props {
  poolInfo: Pool;
  dictUsers: Record<string, string>;
}
import { useTranslations } from "next-intl";

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

  public getTotalPts(): number {
    return this.goals + this.assists;
  }

  public getTotalPoolPts(
    pointsPerGoals: number,
    pointsPerAssists: number,
    pointsPerHatTricks: number,
    pointsPerShootoutGoals: number
  ): number {
    return (
      this.goals * pointsPerGoals +
      this.assists * pointsPerAssists +
      this.hattricks * pointsPerHatTricks +
      this.shootoutGoals * pointsPerShootoutGoals
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

  public getTotalPoolPts(settings: PoolSettings): number {
    return (
      this.goals * settings.goalies_pts_goals +
      this.assists * settings.goalies_pts_assists +
      this.wins * settings.goalies_pts_wins +
      this.shutouts * settings.goalies_pts_shutouts +
      this.overtimeLosses * settings.goalies_pts_overtimes
    );
  }
}

export class ParticipantsRoster {
  constructor() {
    this.forwards = [];
    this.defenses = [];
    this.goalies = [];
  }
  forwards: SkaterInfo[];
  defenses: SkaterInfo[];
  goalies: GoalieInfo[];
}

export class SkaterTotal {
  constructor(
    skaters: SkaterInfo[],
    pointsPerGoals: number,
    pointsPerAssists: number,
    pointsPerHatTricks: number,
    pointsPerShootoutGoals: number
  ) {
    this.numberOfGame = skaters.reduce(
      (acc, skater) => acc + skater.numberOfGame,
      0
    );
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
    this.totalPts = this.getTotalPts();
    this.totalPoolPts = this.getTotalPoolPts(
      pointsPerGoals,
      pointsPerAssists,
      pointsPerHatTricks,
      pointsPerShootoutGoals
    );
  }
  numberOfGame: number;
  goals: number;
  assists: number;
  hattricks: number;
  shootoutGoals: number;
  totalPts: number;
  totalPoolPts: number;

  public getTotalPts(): number {
    return this.goals + this.assists;
  }

  public getTotalPoolPts(
    pointsPerGoals: number,
    pointsPerAssists: number,
    pointsPerHatTricks: number,
    pointsPerShootoutGoals: number
  ): number {
    return (
      this.goals * pointsPerGoals +
      this.assists * pointsPerAssists +
      this.hattricks * pointsPerHatTricks +
      this.shootoutGoals * pointsPerShootoutGoals
    );
  }
}

export class GoalieTotal {
  constructor(goalies: GoalieInfo[], settings: PoolSettings) {
    this.numberOfGame = goalies.reduce(
      (acc, goalie) => acc + goalie.numberOfGame,
      0
    );
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
    this.totalPoolPts = this.getTotalPoolPts(settings);
  }
  numberOfGame: number;
  goals: number;
  assists: number;
  wins: number;
  shutouts: number;
  overtimeLosses: number;
  totalPoolPts: number;

  public getTotalPoolPts(settings: PoolSettings): number {
    return (
      this.goals * settings.goalies_pts_goals +
      this.assists * settings.goalies_pts_assists +
      this.wins * settings.goalies_pts_wins +
      this.shutouts * settings.goalies_pts_shutouts +
      this.overtimeLosses * settings.goalies_pts_overtimes
    );
  }
}

export class TotalRanking {
  constructor(
    participant: string,
    forwards: SkaterInfo[],
    defenses: SkaterInfo[],
    goalies: GoalieInfo[],
    settings: PoolSettings
  ) {
    this.participant = participant;
    this.forwards = new SkaterTotal(
      forwards,
      settings.forward_pts_goals,
      settings.forward_pts_assists,
      settings.forward_pts_hattricks,
      settings.forward_pts_shootout_goals
    );
    this.defenses = new SkaterTotal(
      defenses,
      settings.defender_pts_goals,
      settings.defender_pts_assists,
      settings.defender_pts_hattricks,
      settings.defender_pts_shootout_goals
    );
    this.goalies = new GoalieTotal(goalies, settings);
  }
  participant: string;

  forwards: SkaterTotal;
  defenses: SkaterTotal;
  goalies: GoalieTotal;

  public getTotalPoolPts(): number {
    return (
      this.forwards.totalPoolPts +
      this.defenses.totalPoolPts +
      this.goalies.totalPoolPts
    );
  }
}

export default function CumulativeTab(props: Props) {
  const t = useTranslations();
  const [playerStats, setPlayerStats] = React.useState<Record<
    string,
    ParticipantsRoster
  > | null>(null);
  const [ranking, setRanking] = React.useState<TotalRanking[] | null>(null);

  // tab Indexes
  const [selectedPooler, setSelectedPooler] = React.useState("0");

  React.useEffect(() => {
    const calculatePoolStats = async () => {
      if (
        props.poolInfo.participants === null ||
        props.poolInfo.context === null
      ) {
        return;
      }
      const stats: Record<string, ParticipantsRoster> = {};
      const rank: TotalRanking[] = [];
      // Calculate all the points made by each players and cumulate the total points of each poolers
      // to be able to fill up the tables that display pooler points between the beginning of the season and the selected date.

      // First Add the players that are currently owned by the player either in reservists or in the alignment.
      for (let i = 0; i < props.poolInfo.participants.length; i += 1) {
        const participant = props.poolInfo.participants[i];

        stats[participant] = new ParticipantsRoster();

        // Forwards (In the alignment)
        for (
          let j = 0;
          j <
          props.poolInfo.context?.pooler_roster[participant].chosen_forwards
            .length;
          j += 1
        ) {
          const playerId =
            props.poolInfo.context?.pooler_roster[participant].chosen_forwards[
              j
            ];

          stats[participant].forwards.push(
            new SkaterInfo(playerId, PlayerStatus.InAlignment)
          );
        }

        // Defenses (In the alignment)
        for (
          let j = 0;
          j <
          props.poolInfo.context?.pooler_roster[participant].chosen_defenders
            .length;
          j += 1
        ) {
          const playerId =
            props.poolInfo.context?.pooler_roster[participant].chosen_defenders[
              j
            ];

          stats[participant].defenses.push(
            new SkaterInfo(playerId, PlayerStatus.InAlignment)
          );
        }

        // Goalies (In the alignment)
        for (
          let j = 0;
          j <
          props.poolInfo.context?.pooler_roster[participant].chosen_goalies
            .length;
          j += 1
        ) {
          const playerId =
            props.poolInfo.context?.pooler_roster[participant].chosen_goalies[
              j
            ];

          stats[participant].goalies.push(
            new GoalieInfo(playerId, PlayerStatus.InAlignment)
          );
        }
      }

      // Now parse all the pool date from the start of the season to the current date.
      const startDate = new Date(props.poolInfo.season_start);
      let endDate = new Date();
      if (endDate < startDate) {
        endDate = new Date(props.poolInfo.season_start);
      }

      for (let j = startDate; j <= endDate; j.setDate(j.getDate() + 1)) {
        const jDate = j.toISOString().slice(0, 10);

        for (let i = 0; i < props.poolInfo.participants.length; i += 1) {
          const participant = props.poolInfo.participants[i];

          if (
            props.poolInfo.context?.score_by_day &&
            jDate in props.poolInfo.context.score_by_day
          ) {
            // Forwards
            Object.keys(
              props.poolInfo.context?.score_by_day[jDate][participant].roster.F
            ).map((key) => {
              if (
                props.poolInfo.context === null ||
                props.poolInfo.context.score_by_day === null
              ) {
                return null;
              }
              const player =
                props.poolInfo.context.score_by_day[jDate][participant].roster
                  .F[key];
              if (player) {
                const playerId = Number(key);

                let index = stats[participant].forwards.findIndex(
                  (p) => p.id === playerId
                );

                if (index === -1) {
                  const indexReservist = props.poolInfo.context.pooler_roster[
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
              props.poolInfo.context.score_by_day[jDate][participant].roster.D
            ).map((key) => {
              if (
                props.poolInfo.context === null ||
                props.poolInfo.context.score_by_day === null
              ) {
                return null;
              }
              const player =
                props.poolInfo.context.score_by_day[jDate][participant].roster
                  .D[key];
              if (player) {
                const playerId = Number(key);

                let index = stats[participant].defenses.findIndex(
                  (p) => p.id === playerId
                );

                if (index === -1) {
                  const indexReservist = props.poolInfo.context.pooler_roster[
                    participant
                  ].chosen_reservists.findIndex((p) => p === playerId);

                  index =
                    stats[participant].defenses.push(
                      new SkaterInfo(
                        playerId,
                        indexReservist >= 0
                          ? PlayerStatus.IsReservists
                          : PlayerStatus.Traded
                      )
                    ) - 1;
                }

                stats[participant].defenses[index].numberOfGame += 1;
                stats[participant].defenses[index].goals += player.G;
                stats[participant].defenses[index].assists += player.A;
                stats[participant].defenses[index].hattricks +=
                  player.G >= 3 ? 1 : 0;
                stats[participant].defenses[index].shootoutGoals +=
                  player.SOG ?? 0;
              }
            });

            // Goalies
            Object.keys(
              props.poolInfo.context.score_by_day[jDate][participant].roster.G
            ).map((key) => {
              if (
                props.poolInfo.context === null ||
                props.poolInfo.context.score_by_day === null
              ) {
                return null;
              }
              const player =
                props.poolInfo.context.score_by_day[jDate][participant].roster
                  .G[key];
              if (player) {
                const playerId = Number(key);

                let index = stats[participant].goalies.findIndex(
                  (p) => p.id === playerId
                );

                if (index === -1) {
                  const indexReservist = props.poolInfo.context.pooler_roster[
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
      for (let i = 0; i < props.poolInfo.participants.length; i += 1) {
        const participant = props.poolInfo.participants[i];

        for (let j = 0; j < stats[participant].forwards.length; j += 1) {
          stats[participant].forwards[j].poolPoints = stats[
            participant
          ].forwards[j].getTotalPoolPts(
            props.poolInfo.settings.forward_pts_goals,
            props.poolInfo.settings.forward_pts_assists,
            props.poolInfo.settings.forward_pts_hattricks,
            props.poolInfo.settings.forward_pts_shootout_goals
          );
        }

        for (let j = 0; j < stats[participant].defenses.length; j += 1) {
          stats[participant].defenses[j].poolPoints = stats[
            participant
          ].defenses[j].getTotalPoolPts(
            props.poolInfo.settings.defender_pts_goals,
            props.poolInfo.settings.defender_pts_assists,
            props.poolInfo.settings.defender_pts_hattricks,
            props.poolInfo.settings.defender_pts_shootout_goals
          );
        }

        for (let j = 0; j < stats[participant].goalies.length; j += 1) {
          stats[participant].goalies[j].poolPoints = stats[participant].goalies[
            j
          ].getTotalPoolPts(props.poolInfo.settings);
        }

        // Sort and change state of players that should be considered ignore from the settings.
        stats[participant].forwards.sort((a, b) => b.poolPoints - a.poolPoints);
        stats[participant].defenses.sort((a, b) => b.poolPoints - a.poolPoints);
        stats[participant].goalies.sort((a, b) => b.poolPoints - a.poolPoints);

        // Now change the ignore settings base on the
        for (
          let i =
            stats[participant].forwards.length -
            props.poolInfo.settings.number_worst_forwards_to_ignore;
          i < stats[participant].forwards.length;
          i += 1
        ) {
          stats[participant].forwards[i].status = PlayerStatus.PointsIgnored;
        }

        for (
          let i =
            stats[participant].defenses.length -
            props.poolInfo.settings.number_worst_defenders_to_ignore;
          i < stats[participant].defenses.length;
          i += 1
        ) {
          stats[participant].defenses[i].status = PlayerStatus.PointsIgnored;
        }

        for (
          let i =
            stats[participant].goalies.length -
            props.poolInfo.settings.number_worst_goalies_to_ignore;
          i < stats[participant].goalies.length;
          i += 1
        ) {
          stats[participant].goalies[i].status = PlayerStatus.PointsIgnored;
        }

        rank.push(
          new TotalRanking(
            participant,
            stats[participant].forwards,
            stats[participant].defenses,
            stats[participant].goalies,
            props.poolInfo.settings
          )
        );

        rank.sort((a, b) => b.getTotalPoolPts() - a.getTotalPoolPts());
      }

      setPlayerStats(stats);
      setRanking(rank);
    };

    calculatePoolStats();
  }, []);

  if (ranking === null || playerStats === null) {
    return <h1>Loading...</h1>;
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
            id: "totalPoolPts",
            desc: true,
          },
        ],
        columnPinning: { left: ["ranking", "pooler"] },
      }}
      meta={{
        props,
        getRowStyles: (row: Row<TotalRanking>) => {
          if (
            props.poolInfo.participants &&
            row.original.participant ===
              props.poolInfo.participants[Number(selectedPooler)]
          ) {
            return "bg-selection hover:bg-selection";
          }
        },
        onRowClick: (row: Row<TotalRanking>) => {
          const index = props.poolInfo.participants?.indexOf(
            row.original.participant
          );
          if (index !== undefined) {
            setSelectedPooler(index.toString());
          }
        },
        t: t,
      }}
      title={title}
    />
  );

  const PlayerTable = (
    rows: any[],
    columns: ColumnDef<any>[],
    title: string
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
        props: props.poolInfo,
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={title}
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
        props: props.poolInfo,
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={t("Available reservists")}
    />
  );

  const ParticipantRoster = (participant: string) => (
    <>
      <Accordion type="single" collapsible defaultValue="forwards">
        <AccordionItem value="forwards">
          <AccordionTrigger>{`${t("Forwards")} (${
            playerStats[participant].forwards.filter(
              (player) =>
                player.status === PlayerStatus.InAlignment ||
                player.status === PlayerStatus.PointsIgnored
            ).length
          }/${props.poolInfo.settings.number_forwards})`}</AccordionTrigger>
          <AccordionContent>
            {PlayerTable(
              playerStats[participant].forwards,
              ForwardColumn,
              t("Forwards stats")
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Accordion type="single" collapsible defaultValue="defense">
        <AccordionItem value="defense">
          <AccordionTrigger>{`${t("Defense")} (${
            playerStats[participant].defenses.filter(
              (player) =>
                player.status === PlayerStatus.InAlignment ||
                player.status === PlayerStatus.PointsIgnored
            ).length
          }/${props.poolInfo.settings.number_defenders})`}</AccordionTrigger>
          <AccordionContent>
            {PlayerTable(
              playerStats[participant].defenses,
              DefenseColumn,
              t("Defenses stats")
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Accordion type="single" collapsible defaultValue="goalies">
        <AccordionItem value="goalies">
          <AccordionTrigger>{`${t("Goalies")} (${
            playerStats[participant].goalies.filter(
              (player) =>
                player.status === PlayerStatus.InAlignment ||
                player.status === PlayerStatus.PointsIgnored
            ).length
          }/${props.poolInfo.settings.number_goalies})`}</AccordionTrigger>
          <AccordionContent>
            {PlayerTable(
              playerStats[participant].goalies,
              GoalieColumn,
              t("Goalies stats")
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Accordion type="single" collapsible defaultValue="reservists">
        <AccordionItem value="reservists">
          <AccordionTrigger>{t("Reservists")}</AccordionTrigger>
          <AccordionContent>
            {ReservistTable(
              props.poolInfo.context?.pooler_roster[participant]
                .chosen_reservists as number[],
              ReservistColumn
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2">
      <div className="py-5 px-0 sm:px-5">
        <Tabs defaultValue="totalRanking">
          <div className="overflow-auto">
            <TabsList>
              <TabsTrigger value="totalRanking">{t("Total")}</TabsTrigger>
              <TabsTrigger value="forwardRanking">{t("Forwards")}</TabsTrigger>
              <TabsTrigger value="defenseRanking">{t("Defense")}</TabsTrigger>
              <TabsTrigger value="goaliesRanking">{t("Goalies")}</TabsTrigger>
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
      </div>
      <div className="py-5 px-0 sm:px-5">
        <Tabs
          defaultValue={selectedPooler}
          value={selectedPooler}
          onValueChange={(i) => setSelectedPooler(i)}
        >
          <div className="overflow-auto">
            <TabsList>
              {props.poolInfo.participants?.map((participant, index) => (
                <TabsTrigger key={participant} value={String(index)}>
                  {props.dictUsers[participant]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {props.poolInfo.participants?.map((participant, index) => (
            <TabsContent key={participant} value={String(index)}>
              {ParticipantRoster(participant)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
