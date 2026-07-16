/*
Pure scoring logic for pool daily points.

These classes and helpers compute the pool points made by skaters and goalies
for a day, either from the cumulated data stored in the pool or from the live
daily leaders feed. They are framework-free so they can be unit tested.
*/
import {
  GoaliePoints,
  GoaliesSettings,
  PoolSettings,
  SkaterPoints,
  SkaterSettings,
} from "@/data/pool/model";
import { DailyLeaders } from "@/data/dailyLeaders/model";

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

export const getDailySkaterStatsWithDailyStats = (
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

export const getDailyGoalieStatsWithCumulative = (
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

export const getDailyGoalieStatsWithDailyStats = (
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

    if (leaders.goalies[i].stats.decision !== null) {
      switch (leaders.goalies[i].stats.decision) {
        case "W": {
          goalieDailyStats.status =
            leaders.goalies[i].stats.savePercentage === 1.0
              ? GoalieGameStatus.Shutout
              : GoalieGameStatus.Win;
          break;
        }
        case "L": {
          goalieDailyStats.status = GoalieGameStatus.Losses;
          break;
        }
        case "O": {
          goalieDailyStats.status = GoalieGameStatus.OverTime;
          break;
        }
      }
    }

    goalieDailyStats.poolPoints = goalieDailyStats.getTotalPoolPts(settings);

    return goalieDailyStats;
  }

  return new GoalieDailyInfo(
    Number(playerId),
    leaders.played.includes(Number(playerId))
  );
};

export const getDailySkatersStatsWithCumulative = (
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

export const getDailySkaterStatsWithDailyLeaders = (
  rosterInfo: Record<string, SkaterPoints | null>,
  leaders: DailyLeaders,
  skaters_settings: SkaterSettings
): SkaterDailyInfo[] =>
  // The skaters stats is not yet stored into the pool information,
  // we can take the information from the daiLeaders that is being update live.
  Object.keys(rosterInfo).map((key) => {
    return getDailySkaterStatsWithDailyStats(leaders, key, skaters_settings);
  });

export const getDailyGoaliesStatsWithCumulative = (
  rosterInfo: Record<string, GoaliePoints | null>,
  settings: GoaliesSettings
): GoalieDailyInfo[] =>
  // The goalies stats is stored into the pool. We can display the informations stored in the pool this will match what is cumulated in the pool.
  Object.keys(rosterInfo).map((key) => {
    return getDailyGoalieStatsWithCumulative(rosterInfo[key], key, settings);
  });

export const getDailyGoaliesStatsWithDailyLeaders = (
  rosterInfo: Record<string, GoaliePoints | null>,
  leaders: DailyLeaders,
  settings: GoaliesSettings
): GoalieDailyInfo[] =>
  // The goalies stats is not yet stored into the pool information,
  // we can take the information from the daiLeaders that is being update live.
  Object.keys(rosterInfo).map((key) => {
    return getDailyGoalieStatsWithDailyStats(leaders, key, settings);
  });
