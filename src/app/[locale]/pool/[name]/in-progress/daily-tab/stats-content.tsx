import { DataTable } from "@/components/ui/data-table";
import { useDateContext } from "@/context/date-context";
import {
  DailyGoalie,
  DailyLeaders,
  DailySkater,
} from "@/data/dailyLeaders/model";
import {
  GoaliePoints,
  GoaliesSettings,
  PoolSettings,
  SkaterPoints,
  SkaterSettings,
} from "@/data/pool/model";
import React from "react";
import {
  DailyGoaliesLeadersColumn,
  DailyScoringLeadersColumn,
  DefensesDailyTotalColumn,
  SkaterDailyColumn,
  ForwardsDailyTotalColumn,
  GoaliesColumn,
  GoaliesDailyTotalColumn,
  TotalDailyColumn,
} from "./stats-columns";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import { usePoolContext } from "@/context/pool-context";
import { Row } from "@tanstack/react-table";
import { getServerSideDailyLeaders } from "@/app/actions/daily-leaders";

export class SkatersDailyTotalPoints {
  constructor(skaters: SkaterDailyInfo[], skaters_settings: SkaterSettings) {
    this.numberOfGame = skaters.filter((skater) => skater.played).length;
    this.goals = skaters.reduce((acc, skater) => acc + skater.goals, 0);
    this.assists = skaters.reduce((acc, skater) => acc + skater.assists, 0);
    this.hattricks = skaters.filter((skater) => skater.goals >= 3).length;
    this.shootoutGoals = skaters.reduce(
      (acc, skater) => acc + skater.shootoutGoals,
      0
    );
    this.totalPoints = skaters.reduce(
      (acc, skater) => acc + skater.goals + skater.assists,
      0
    );
    this.totalPoolPoints = skaters.reduce(
      (acc, skater) => acc + skater.getTotalPoolPts(skaters_settings),
      0
    );
  }
  numberOfGame: number;
  goals: number;
  assists: number;
  hattricks: number;
  shootoutGoals: number;
  totalPoints: number;
  totalPoolPoints: number;
}

export class GoaliesDailyTotalPoints {
  constructor(goalies: GoalieDailyInfo[], settings: GoaliesSettings) {
    this.numberOfGame = goalies.filter((goalie) => goalie.played).length;
    this.goals = goalies.reduce((acc, goalie) => acc + goalie.goals, 0);
    this.assists = goalies.reduce((acc, goalie) => acc + goalie.assists, 0);
    this.wins = goalies.filter(
      (goalie) => goalie.status === GoalieGameStatus.Win
    ).length;
    this.shutouts = goalies.filter(
      (goalie) => goalie.status === GoalieGameStatus.Shutout
    ).length;
    this.overtimeLosses = goalies.filter(
      (goalie) => goalie.status === GoalieGameStatus.OverTime
    ).length;
    this.totalPoolPoints = goalies.reduce(
      (acc, goalie) => acc + goalie.getTotalPoolPts(settings),
      0
    );
  }

  numberOfGame: number;
  goals: number;
  assists: number;
  wins: number;
  shutouts: number;
  overtimeLosses: number;
  totalPoolPoints: number;
}

export class TotalDailyPoints {
  constructor(
    participant: string,
    forwards: SkaterDailyInfo[],
    defense: SkaterDailyInfo[],
    goalies: GoalieDailyInfo[],
    settings: PoolSettings
  ) {
    this.participant = participant;
    this.forwards = new SkatersDailyTotalPoints(
      forwards,
      settings.forwards_settings
    );
    this.defense = new SkatersDailyTotalPoints(
      defense,
      settings.defense_settings
    );
    this.goalies = new GoaliesDailyTotalPoints(
      goalies,
      settings.goalies_settings
    );
    this.totalPoolPoints =
      this.forwards.totalPoolPoints +
      this.defense.totalPoolPoints +
      this.goalies.totalPoolPoints;
  }

  participant: string;
  forwards: SkatersDailyTotalPoints;
  defense: SkatersDailyTotalPoints;
  goalies: GoaliesDailyTotalPoints;
  totalPoolPoints: number;
}

export class SkaterDailyInfo {
  constructor(playerId: number, played: boolean) {
    this.id = playerId;
    this.played = played;
    this.goals = 0;
    this.assists = 0;
    this.shootoutGoals = 0;
    this.poolPoints = 0;
  }

  id: number;
  played: boolean;

  goals: number;
  assists: number;
  shootoutGoals: number;
  poolPoints: number;

  public getTotalPoolPts(skaters_settings: SkaterSettings): number {
    let totalPoints =
      this.goals * skaters_settings.points_per_goals +
      this.assists * skaters_settings.points_per_assists +
      this.shootoutGoals * skaters_settings.points_per_shootout_goals;

    if (this.goals >= 3) {
      totalPoints += skaters_settings.points_per_hattricks;
    }
    return totalPoints;
  }
}

export enum GoalieGameStatus {
  Win = "W",
  OverTime = "OT",
  Shutout = "SO",
  Losses = "L",
}

export class GoalieDailyInfo {
  constructor(playerId: number, played: boolean) {
    this.id = playerId;
    this.played = played;
    this.goals = 0;
    this.assists = 0;
    this.status = null;
    this.poolPoints = 0;
  }

  id: number;
  played: boolean;

  goals: number;
  assists: number;
  status: GoalieGameStatus | null;
  poolPoints: number;

  public getTotalPoolPts(settings: GoaliesSettings): number {
    let totalPoints =
      this.goals * settings.points_per_goals +
      this.assists * settings.points_per_assists;

    if (this.status !== null) {
      switch (this.status) {
        case GoalieGameStatus.Win: {
          return totalPoints + settings.points_per_wins;
        }
        case GoalieGameStatus.OverTime: {
          return totalPoints + settings.points_per_overtimes;
        }
        case GoalieGameStatus.Shutout: {
          return (
            totalPoints +
            settings.points_per_wins +
            settings.points_per_shutouts
          );
        }
      }
    }

    return totalPoints;
  }
}
export default function DailyStatsContent() {
  const t = useTranslations();
  const { selectedDate } = useDateContext();
  const {
    poolInfo,
    selectedParticipant,
    updateSelectedParticipant,
    playersOwner,
  } = usePoolContext();

  const [dailyLeaders, setDailyLeaders] = React.useState<DailyLeaders | null>(
    null
  );
  const [forwardsDailyStats, setForwardsDailyStats] = React.useState<Record<
    string,
    SkaterDailyInfo[]
  > | null>(null);
  const [defendersDailyStats, setDefendersDailyStats] = React.useState<Record<
    string,
    SkaterDailyInfo[]
  > | null>(null);
  const [goaliesDailyStats, setGoaliesDailyStats] = React.useState<Record<
    string,
    GoalieDailyInfo[]
  > | null>(null);
  const [totalDailyPoints, setTotalDailyPoints] = React.useState<
    TotalDailyPoints[] | null
  >(null);

  const getDailyStats = async (keyDay: string) => {
    // Get the daily stats information. This is being called to query the daily pool scorer.
    const data = await getServerSideDailyLeaders(keyDay);
    setDailyLeaders(data);
  };

  const getDailySkaterStatsWithCumulative = (
    skaterPoints: SkaterPoints | null,
    playerId: string,
    skaters_settings: SkaterSettings
  ): SkaterDailyInfo => {
    // Get the daily score informations based on the pool informations.
    if (skaterPoints === null) {
      return new SkaterDailyInfo(Number(playerId), false);
    }
    const skaterDailyStats = new SkaterDailyInfo(Number(playerId), true);

    skaterDailyStats.goals = skaterPoints.G;
    skaterDailyStats.assists = skaterPoints.A;
    skaterDailyStats.shootoutGoals = skaterPoints.SOG ?? 0;
    skaterDailyStats.poolPoints =
      skaterDailyStats.getTotalPoolPts(skaters_settings);

    return skaterDailyStats;
  };

  const getDailySkaterStatsWithDailyStats = (
    leaders: DailyLeaders,
    playerId: string,
    skaters_settings: SkaterSettings
  ): SkaterDailyInfo => {
    // Get the daily score informations based on the daily stats informations.
    // This is usually being called when the daily stats have not been cumulated yet in the pool.
    const i = leaders.skaters.findIndex((p) => p.id === Number(playerId));
    if (i > -1) {
      const skaterDailyStats = new SkaterDailyInfo(Number(playerId), true);

      skaterDailyStats.goals = leaders.skaters[i].stats.goals;
      skaterDailyStats.assists = leaders.skaters[i].stats.assists;
      skaterDailyStats.shootoutGoals = leaders.skaters[i].stats.shootoutGoals;
      skaterDailyStats.poolPoints =
        skaterDailyStats.getTotalPoolPts(skaters_settings);

      return skaterDailyStats;
    }

    return new SkaterDailyInfo(
      Number(playerId),
      leaders.played.includes(Number(playerId))
    );
  };

  const getDailyGoalieStatsWithCumulative = (
    goaliePoints: GoaliePoints | null,
    playerId: string,
    settings: GoaliesSettings
  ): GoalieDailyInfo => {
    // Get the daily score informations based on the pool informations.
    if (goaliePoints === null) {
      return new GoalieDailyInfo(Number(playerId), false);
    }
    const goalieDailyStats = new GoalieDailyInfo(Number(playerId), true);

    goalieDailyStats.goals = goaliePoints.G;
    goalieDailyStats.assists = goaliePoints.A;

    if (goaliePoints.OT) {
      goalieDailyStats.status = GoalieGameStatus.OverTime;
    } else if (goaliePoints.SO) {
      goalieDailyStats.status = GoalieGameStatus.Shutout;
    } else if (goaliePoints.W) {
      goalieDailyStats.status = GoalieGameStatus.Win;
    } else {
      goalieDailyStats.status = GoalieGameStatus.Losses;
    }
    goalieDailyStats.poolPoints = goalieDailyStats.getTotalPoolPts(settings);

    return goalieDailyStats;
  };

  const getDailyGoalieStatsWithDailyStats = (
    leaders: DailyLeaders,
    playerId: string,
    settings: GoaliesSettings
  ): GoalieDailyInfo => {
    // Get the daily score informations based on the daily stats informations.
    // This is usually being called when the daily stats have not been cumulated yet in the pool.
    const i = leaders.goalies.findIndex((p) => p.id === Number(playerId));
    if (i > -1) {
      const goalieDailyStats = new GoalieDailyInfo(Number(playerId), true);

      goalieDailyStats.goals = leaders.goalies[i].stats.goals;
      goalieDailyStats.assists = leaders.goalies[i].stats.assists;
      if (leaders.goalies[i].stats.decision == "W") {
        goalieDailyStats.status =
          leaders.goalies[i].stats.savePercentage === 1.0
            ? GoalieGameStatus.Shutout
            : GoalieGameStatus.Win;
      } else if (leaders.goalies[i].stats.OT) {
        goalieDailyStats.status = GoalieGameStatus.OverTime;
      } else {
        goalieDailyStats.status = GoalieGameStatus.Losses;
      }
      goalieDailyStats.poolPoints = goalieDailyStats.getTotalPoolPts(settings);

      return goalieDailyStats;
    }

    return new GoalieDailyInfo(
      Number(playerId),
      leaders.played.includes(Number(playerId))
    );
  };

  const getDailySkatersStatsWithCumulative = (
    rosterInfo: Record<string, SkaterPoints | null>,
    skaters_settings: SkaterSettings
  ): SkaterDailyInfo[] =>
    // The skaters stats is stored into the pool. We can display the informations stored in the pool this will match what is cumulated in the pool.
    Object.keys(rosterInfo).map((key) => {
      return getDailySkaterStatsWithCumulative(
        rosterInfo[key],
        key,
        skaters_settings
      );
    });

  const getDailySkaterStatsWithDailyLeaders = (
    rosterInfo: Record<string, SkaterPoints | null>,
    leaders: DailyLeaders,
    skaters_settings: SkaterSettings
  ): SkaterDailyInfo[] =>
    // The skaters stats is not yet stored into the pool information,
    // we can take the information from the daiLeaders that is being update live.
    Object.keys(rosterInfo).map((key) => {
      return getDailySkaterStatsWithDailyStats(leaders, key, skaters_settings);
    });

  const getDailyGoaliesStatsWithCumulative = (
    rosterInfo: Record<string, GoaliePoints | null>,
    settings: GoaliesSettings
  ): GoalieDailyInfo[] =>
    // The goalies stats is stored into the pool. We can display the informations stored in the pool this will match what is cumulated in the pool.
    Object.keys(rosterInfo).map((key) => {
      return getDailyGoalieStatsWithCumulative(rosterInfo[key], key, settings);
    });

  const getDailyGoaliesStatsWithDailyLeaders = (
    rosterInfo: Record<string, GoaliePoints | null>,
    leaders: DailyLeaders,
    settings: GoaliesSettings
  ): GoalieDailyInfo[] =>
    // The goalies stats is not yet stored into the pool information,
    // we can take the information from the daiLeaders that is being update live.
    Object.keys(rosterInfo).map((key) => {
      return getDailyGoalieStatsWithDailyStats(leaders, key, settings);
    });

  React.useEffect(() => {
    const keyDay = format(selectedDate, "yyyy-MM-dd");
    const dayInfo = poolInfo.context?.score_by_day?.[keyDay];

    if (
      dayInfo === undefined ||
      dailyLeaders === null ||
      poolInfo.participants == null
    ) {
      return;
    }

    const forwardsDailyStatsTemp: Record<string, SkaterDailyInfo[]> = {};
    const defendersDailyStatsTemp: Record<string, SkaterDailyInfo[]> = {};
    const goaliesDailyStatsTemp: Record<string, GoalieDailyInfo[]> = {};
    const totalDailyPointsTemp: TotalDailyPoints[] = [];

    for (var i = 0; i < poolInfo.participants.length; i += 1) {
      // Parse all participants daily locked roster to query its daily stats.
      const participant = poolInfo.participants[i];

      if (dayInfo[participant].is_cumulated) {
        // the information is cumulated in the pool directly get it from there since it
        // is what is being used to display the cumulative page.
        forwardsDailyStatsTemp[participant] =
          getDailySkatersStatsWithCumulative(
            dayInfo[participant].roster.F,
            poolInfo.settings.forwards_settings
          );
        defendersDailyStatsTemp[participant] =
          getDailySkatersStatsWithCumulative(
            dayInfo[participant].roster.D,
            poolInfo.settings.defense_settings
          );
        goaliesDailyStatsTemp[participant] = getDailyGoaliesStatsWithCumulative(
          dayInfo[participant].roster.G,
          poolInfo.settings.goalies_settings
        );
      } else {
        // The players stats is not yet stored into the pool information
        // we can take the information from the daiLeaders that is being update live.
        forwardsDailyStatsTemp[participant] =
          getDailySkaterStatsWithDailyLeaders(
            dayInfo[participant].roster.F,
            dailyLeaders,
            poolInfo.settings.forwards_settings
          );
        defendersDailyStatsTemp[participant] =
          getDailySkaterStatsWithDailyLeaders(
            dayInfo[participant].roster.D,
            dailyLeaders,
            poolInfo.settings.defense_settings
          );
        goaliesDailyStatsTemp[participant] =
          getDailyGoaliesStatsWithDailyLeaders(
            dayInfo[participant].roster.G,
            dailyLeaders,
            poolInfo.settings.goalies_settings
          );
      }
      totalDailyPointsTemp.push(
        new TotalDailyPoints(
          participant,
          forwardsDailyStatsTemp[participant],
          defendersDailyStatsTemp[participant],
          goaliesDailyStatsTemp[participant],
          poolInfo.settings
        )
      );
    }

    setForwardsDailyStats(forwardsDailyStatsTemp);
    setDefendersDailyStats(defendersDailyStatsTemp);
    setGoaliesDailyStats(goaliesDailyStatsTemp);
    setTotalDailyPoints(totalDailyPointsTemp);
  }, [dailyLeaders]);

  React.useEffect(() => {
    const keyDay = format(selectedDate, "yyyy-MM-dd");
    getDailyStats(keyDay);
  }, [selectedDate]);

  const SkatersTable = (
    skaters: SkaterDailyInfo[],
    columns: ColumnDef<SkaterDailyInfo>[],
    title: string
  ) => (
    <DataTable
      data={skaters}
      columns={columns}
      initialState={{
        sorting: [
          {
            id: "poolPoints",
            desc: true,
          },
        ],
        columnPinning: { left: ["player"] },
      }}
      meta={{
        props: poolInfo,
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={title}
    />
  );

  const GoaliesTable = (goalies: GoalieDailyInfo[], title: string) => (
    <DataTable
      data={goalies}
      columns={GoaliesColumn}
      initialState={{
        sorting: [
          {
            id: "poolPoints",
            desc: true,
          },
        ],
        columnPinning: { left: ["player"] },
      }}
      meta={{
        props: poolInfo,
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={title}
    />
  );

  const TotalDailyRankTable = (
    totalDailyPoints: TotalDailyPoints[],
    columns: ColumnDef<TotalDailyPoints>[],
    title: string
  ) => (
    <DataTable
      data={totalDailyPoints}
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
        props: {},
        getRowStyles: (row: Row<TotalDailyPoints>) => {
          if (row.original.participant === selectedParticipant) {
            return "bg-selection hover:bg-selection";
          }
        },
        onRowClick: (row: Row<TotalDailyPoints>) => {
          updateSelectedParticipant(row.original.participant);
        },
        t: t,
      }}
      title={title}
    />
  );

  const DailyScoringLeadersTable = (skaters: DailySkater[], title: string) => (
    <DataTable
      data={skaters}
      columns={DailyScoringLeadersColumn}
      initialState={{
        sorting: [
          {
            id: "points",
            desc: true,
          },
        ],
        columnPinning: { left: ["ranking", "name"] },
      }}
      meta={{
        props: { playersOwner },
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={title}
    />
  );

  const DailyGoaliesLeadersTable = (goalies: DailyGoalie[], title: string) => (
    <DataTable
      data={goalies}
      columns={DailyGoaliesLeadersColumn}
      initialState={{
        sorting: [
          {
            id: "savePercentage",
            desc: true,
          },
        ],
        columnPinning: { left: ["ranking", "name"] },
      }}
      meta={{
        props: { playersOwner },
        getRowStyles: () => null,
        onRowClick: () => null,
        t: t,
      }}
      title={title}
    />
  );

  const getFormatedRankingTableTitle = (title: string) =>
    `${t(title)} (${format(selectedDate, "yyyy-MM-dd")})`;

  const getFormatedDateTitle = (participant: string, title: string) =>
    `${t(title)} ${participant} (${format(selectedDate, "yyyy-MM-dd")})`;

  return (
    <div>
      <div className="py-5 px-0 sm:px-5">
        {totalDailyPoints ? (
          <Tabs defaultValue="totalRanking">
            <div className="overflow-auto">
              <TabsList>
                <TabsTrigger value="totalRanking">{t("Total")}</TabsTrigger>
                <TabsTrigger value="forwardRanking">
                  {t("Forwards")}
                </TabsTrigger>
                <TabsTrigger value="defenseRanking">{t("Defense")}</TabsTrigger>
                <TabsTrigger value="goaliesRanking">{t("Goalies")}</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="totalRanking">
              {TotalDailyRankTable(
                totalDailyPoints,
                TotalDailyColumn,
                getFormatedRankingTableTitle("Daily Ranking")
              )}
            </TabsContent>
            <TabsContent value="forwardRanking">
              {TotalDailyRankTable(
                totalDailyPoints,
                ForwardsDailyTotalColumn,
                getFormatedRankingTableTitle("Forward Daily Ranking")
              )}
            </TabsContent>
            <TabsContent value="defenseRanking">
              {TotalDailyRankTable(
                totalDailyPoints,
                DefensesDailyTotalColumn,
                getFormatedRankingTableTitle("Defense Daily Ranking")
              )}
            </TabsContent>
            <TabsContent value="goaliesRanking">
              {TotalDailyRankTable(
                totalDailyPoints,
                GoaliesDailyTotalColumn,
                getFormatedRankingTableTitle("Goalies Daily Ranking")
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </div>
      <div className="py-5 px-0 sm:px-5">
        <Tabs
          defaultValue={selectedParticipant}
          value={selectedParticipant}
          onValueChange={(participant) =>
            updateSelectedParticipant(participant)
          }
        >
          <TabsList>
            {poolInfo.participants?.map((participant) => (
              <TabsTrigger key={participant} value={participant}>
                {participant}
              </TabsTrigger>
            ))}
          </TabsList>
          {poolInfo.participants?.map((participant) => (
            <TabsContent key={participant} value={participant}>
              {forwardsDailyStats &&
              defendersDailyStats &&
              goaliesDailyStats ? (
                <>
                  <Accordion
                    key={`${participant}-forwards`}
                    type="single"
                    collapsible
                    defaultValue="forwards"
                  >
                    <AccordionItem value="forwards">
                      <AccordionTrigger>{t("Forwards")}</AccordionTrigger>
                      <AccordionContent>
                        {SkatersTable(
                          forwardsDailyStats[participant],
                          SkaterDailyColumn,
                          getFormatedDateTitle(
                            participant,
                            "Daily points made by forwards for"
                          )
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <Accordion
                    key={`${participant}-defense`}
                    type="single"
                    collapsible
                    defaultValue="defense"
                  >
                    <AccordionItem value="defense">
                      <AccordionTrigger>{t("Defense")}</AccordionTrigger>
                      <AccordionContent>
                        {SkatersTable(
                          defendersDailyStats[participant],
                          SkaterDailyColumn,
                          getFormatedDateTitle(
                            participant,
                            "Daily points made by defense for"
                          )
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <Accordion
                    key={`${participant}-goalies`}
                    type="single"
                    collapsible
                    defaultValue="goalies"
                  >
                    <AccordionItem value="goalies">
                      <AccordionTrigger>{t("Goalies")}</AccordionTrigger>
                      <AccordionContent>
                        {GoaliesTable(
                          goaliesDailyStats[participant],
                          getFormatedDateTitle(
                            participant,
                            "Daily points made by goalies for"
                          )
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      {dailyLeaders ? (
        <Tabs defaultValue="scoringLeaders">
          <TabsList>
            <TabsTrigger value={"scoringLeaders"}>
              {t("Scoring Leaders")}
            </TabsTrigger>
            <TabsTrigger value={"goaliesLeaders"}>
              {t("Goalies Leaders")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="scoringLeaders">
            {DailyScoringLeadersTable(
              dailyLeaders.skaters,
              t("Daily scoring leaders")
            )}
          </TabsContent>
          <TabsContent value="goaliesLeaders">
            {DailyGoaliesLeadersTable(
              dailyLeaders.goalies,
              t("Daily goalies leaders")
            )}
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
