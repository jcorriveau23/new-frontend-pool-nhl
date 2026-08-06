/*
Pure scoring display helpers for pool daily points.

These classes and helpers turn the per-player breakdown the server derives
(stored in the score_by_day shape) into the aggregated daily totals the UI
renders. The scoring rules themselves live on the server; this file only
computes display totals from the already-derived per-player stats.
*/
import {
  GoaliePoints,
  GoaliesSettings,
  PoolSettings,
  SkaterPoints,
  SkaterSettings,
} from "@/data/pool/model";

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

    this.numberOfGames =
      this.forwards.numberOfGame +
      this.defense.numberOfGame +
      this.goalies.numberOfGame;

    this.totalPoolPoints =
      this.forwards.totalPoolPoints +
      this.defense.totalPoolPoints +
      this.goalies.totalPoolPoints;
  }

  participant: string;
  forwards: SkatersDailyTotalPoints;
  defense: SkatersDailyTotalPoints;
  goalies: GoaliesDailyTotalPoints;
  numberOfGames: number;
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
    const totalPoints =
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

export const getDailySkaterStatsWithCumulative = (
  skaterPoints: SkaterPoints | null,
  playerId: string,
  skaters_settings: SkaterSettings
): SkaterDailyInfo => {
  // Build the daily display info from the per-player breakdown derived by the server.
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

export const getDailyGoalieStatsWithCumulative = (
  goaliePoints: GoaliePoints | null,
  playerId: string,
  settings: GoaliesSettings
): GoalieDailyInfo => {
  // Build the daily display info from the per-player breakdown derived by the server.
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

export const getDailySkatersStatsWithCumulative = (
  rosterInfo: Record<string, SkaterPoints | null>,
  skaters_settings: SkaterSettings
): SkaterDailyInfo[] =>
  // The per-player breakdown derived by the server, turned into display totals.
  Object.keys(rosterInfo).map((key) => {
    return getDailySkaterStatsWithCumulative(
      rosterInfo[key],
      key,
      skaters_settings
    );
  });

export const getDailyGoaliesStatsWithCumulative = (
  rosterInfo: Record<string, GoaliePoints | null>,
  settings: GoaliesSettings
): GoalieDailyInfo[] =>
  // The per-player breakdown derived by the server, turned into display totals.
  Object.keys(rosterInfo).map((key) => {
    return getDailyGoalieStatsWithCumulative(rosterInfo[key], key, settings);
  });
