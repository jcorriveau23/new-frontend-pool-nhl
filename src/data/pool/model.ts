export interface ProjectedPoolShort {
  name: string;
  owner: string;
  status: PoolState;
}

export interface PlayerTypeSettings {
  forwards: number;
  defense: number;
  goalies: number;
}

export interface DynastySettings {
  next_season_number_players_protected: number;
  tradable_picks: number;
  past_season_pool_name: string[];
  next_season_pool_name: string | null;
}

export interface SkaterSettings {
  points_per_goals: number;
  points_per_assists: number;
  points_per_hattricks: number;
  points_per_shootout_goals: number;
}

export interface GoaliesSettings {
  points_per_wins: number;
  points_per_shutouts: number;
  points_per_overtimes: number;
  points_per_goals: number;
  points_per_assists: number;
}

export enum DraftType {
  // In Serpentine, every round the order gets reversed,
  // the impact of having the first pick is less an advantage than in standard mode.
  // In dynasty mode, serpentine will be applied for the initial draft only. (Not for following years)
  SERPENTINE = "Serpentine",

  STANDARD = "Standard",
}

export interface PoolSettings {
  number_poolers: number;
  draft_type: DraftType;

  assistants: string[];
  number_forwards: number;
  number_defenders: number;
  number_goalies: number;
  number_reservists: number;
  salary_cap: number | null;
  roster_modification_date: string[];

  forwards_settings: SkaterSettings;
  defense_settings: SkaterSettings;
  goalies_settings: GoaliesSettings;

  ignore_x_worst_players: PlayerTypeSettings | null;
  dynasty_settings: DynastySettings | null;
}

export interface PoolUser {
  id: string;
  name: string;

  // tells if the user is owned by an app users or manage by the pool owner
  is_owned: boolean;
}

export interface Pool {
  id: string;
  name: string;
  owner: string;
  number_poolers: number;
  participants: PoolUser[];
  settings: PoolSettings;
  status: PoolState;
  draft_order: string[] | null;
  final_rank: string[] | null;
  nb_player_drafted: number;
  nb_trade: number;
  trades: Trade[] | null;
  context: PoolContext | null;
  date_updated: number;
  season_start: string;
  season_end: string;
  season: number;
}

export enum PoolState {
  Final = "Final",
  InProgress = "InProgress",
  Dynasty = "Dynasty",
  Draft = "Draft",
  Created = "Created",
}

export interface PoolContext {
  pooler_roster: Record<string, PoolerRoster>;
  players_name_drafted: number[];
  score_by_day: Record<string, Record<string, DailyRosterPoints>> | null;
  tradable_picks: Record<string, string>[] | null;
  past_tradable_picks: Record<string, string>[] | null;
  protected_players: Record<string, number[]> | null;
  players: Record<string, Player>;
}

export interface PoolerRoster {
  chosen_forwards: number[];
  chosen_defenders: number[];
  chosen_goalies: number[];
  chosen_reservists: number[];
}

export interface DailyRosterPoints {
  roster: Roster;
  is_cumulated: boolean;
}

export interface Roster {
  F: Record<string, SkaterPoints | null>;
  D: Record<string, SkaterPoints | null>;
  G: Record<string, GoaliePoints | null>;
}

export interface SkaterPoints {
  G: number;
  A: number;
  SOG?: number | null;
}

export interface GoaliePoints {
  G: number;
  A: number;
  W: boolean;
  SO: boolean;
  OT: boolean;
}

export interface SkaterPoolPoints {
  G: number;
  A: number;
  HT: number;
  SOG: number;
}

export interface GoalyPoolPoints {
  G: number;
  A: number;
  W: number;
  SO: number;
  OT: number;
}

export interface Player {
  id: number;
  active: boolean;
  name: string;
  team: number | null;
  position: Position;
  age: number | null;
  salary_cap: number | null;
  contract_expiration_season: number | null;
  game_played: number | null;
  goals: number | null;
  assists: number | null;
  points: number | null;
  points_per_game: number | null;
  goal_against_average: number | null;
  save_percentage: number | null;
}

export enum Position {
  F = "F",
  D = "D",
  G = "G",
}

export interface DraftPick {
  round: number;
  from: string;
}

export interface Trade {
  proposed_by: string;
  ask_to: string;
  from_items: TradeItems;
  to_items: TradeItems;
  status: TradeStatus;
  id: number;
  date_created: number;
  date_accepted: number;
}

export interface TradeItems {
  players: number[];
  picks: DraftPick[];
}

export enum TradeStatus {
  NEW = "NEW",
  ACCEPTED = "ACCEPTED",
  CANCELLED = "CANCELLED",
  REFUSED = "REFUSED",
}

export const getPoolerAllPlayers = (
  poolContext: PoolContext,
  user: PoolUser
) => {
  const reservistForwards = poolContext.pooler_roster[user.id].chosen_reservists
    .map((playerId) => poolContext.players[playerId.toString()])
    .filter((player) => player.position === Position.F);
  const reservistsDefenders = poolContext.pooler_roster[
    user.id
  ].chosen_reservists
    .map((playerId) => poolContext.players[playerId.toString()])
    .filter((player) => player.position === Position.D);
  const reservistGoalies = poolContext.pooler_roster[user.id].chosen_reservists
    .map((playerId) => poolContext.players[playerId.toString()])
    .filter((player) => player.position === Position.G);

  const forwards = [
    ...poolContext.pooler_roster[user.id].chosen_forwards.map(
      (playerId) => poolContext.players[playerId.toString()]
    ),
    ...reservistForwards,
  ];
  const defense = [
    ...poolContext.pooler_roster[user.id].chosen_defenders.map(
      (playerId) => poolContext.players[playerId.toString()]
    ),
    ...reservistsDefenders,
  ];
  const goalies = [
    ...poolContext.pooler_roster[user.id].chosen_goalies.map(
      (playerId) => poolContext.players[playerId.toString()]
    ),
    ...reservistGoalies,
  ];

  return {
    user,
    forwards,
    defense,
    goalies,
  };
};

export const getPoolerActivePlayers = (
  poolContext: PoolContext,
  user: PoolUser
) => {
  return {
    user,
    forwards: poolContext.pooler_roster[user.id].chosen_forwards.map(
      (playerId) => poolContext.players[playerId.toString()]
    ),
    defense: poolContext.pooler_roster[user.id].chosen_defenders.map(
      (playerId) => poolContext.players[playerId.toString()]
    ),
    goalies: poolContext.pooler_roster[user.id].chosen_goalies.map(
      (playerId) => poolContext.players[playerId.toString()]
    ),
    reservists: poolContext.pooler_roster[user.id].chosen_reservists.map(
      (playerId) => poolContext.players[playerId.toString()]
    ),
  };
};

export const getSkaterPoolPoints = (
  skatersSettings: SkaterSettings,
  skaterPoints: SkaterPoints
) => {
  let totalPoints =
    skaterPoints.G * skatersSettings.points_per_goals +
    skaterPoints.A * skatersSettings.points_per_assists;

  if (skaterPoints.SOG) {
    totalPoints += skatersSettings.points_per_shootout_goals;
  }
  if (skaterPoints.G >= 3) {
    totalPoints += skatersSettings.points_per_hattricks;
  }

  return totalPoints;
};

export const getGoaliePoolPoints = (
  goaliesSettings: GoaliesSettings,
  goaliePoints: GoaliePoints
) => {
  let totalPoints =
    goaliePoints.G * goaliesSettings.points_per_goals +
    goaliePoints.A * goaliesSettings.points_per_assists;

  if (goaliePoints.W) {
    totalPoints += goaliesSettings.points_per_wins;
  }

  if (goaliePoints.OT) {
    totalPoints += goaliesSettings.points_per_overtimes;
  }

  if (goaliePoints.SO) {
    totalPoints += goaliesSettings.points_per_shutouts;
  }

  return totalPoints;
};

export interface GoaliePoints {
  G: number;
  A: number;
  W: boolean;
  SO: boolean;
  OT: boolean;
}

const findXLeastTotalPoints = (
  playersPoints: Record<string, number>,
  xWorst: number
) => {
  const values = Object.values(playersPoints);

  if (values.length < xWorst) {
    return 0;
    throw new Error(`The record must have at least ${xWorst} entries.`);
  }

  values.sort((a, b) => a - b);

  // Take the first xWorst values and sum them
  return values.slice(0, xWorst).reduce((total, value) => total + value, 0);
};

export const getPoolTimeRangeCharts = (
  poolInfo: Pool,
  poolStartDate: Date,
  poolSelectedEndDate: Date,
  positionFilter: "F" | "D" | "G" | null
) => {
  // Return a charts of the amout of points accumulated between 2 dates.
  console.log(
    `Calculating cumulative chart from ${poolStartDate} to ${poolSelectedEndDate}`
  );
  const chartData = [];
  // Keeps the total pooler points per position this is needed for when the option of
  // ignoring worst players points is enable in the pool.
  const totalPoolerCurrentPoints = poolInfo.participants.reduce(
    (acc, participant) => {
      acc[participant.id] = { F: 0, D: 0, G: 0 };
      return acc;
    },
    {} as Record<string, { F: number; D: number; G: number }>
  );
  // This is necessary to filter points made by worst players of each positions.
  // Participant id -> list of players cumulated points.
  const poolerPlayers = poolInfo.participants.reduce(
    (acc, participant) => {
      acc[participant.id] = {
        F: {},
        D: {},
        G: {},
      };
      return acc;
    },
    {} as Record<
      string,
      {
        F: Record<string, number>;
        D: Record<string, number>;
        G: Record<string, number>;
      }
    >
  );
  let worstForwardsPointsIgnored = 0;
  let worstDefendersPointsIgnored = 0;
  let worstGoaliesPointsIgnored = 0;

  for (
    let j = new Date(poolStartDate);
    j <= poolSelectedEndDate;
    j.setDate(j.getDate() + 1)
  ) {
    const jDate = j.toISOString().slice(0, 10);
    const chartElement: Record<string, string | number> = {
      date: jDate,
    };

    // Ignore date with no games.
    if (!poolInfo.context?.score_by_day?.[jDate]) {
      continue;
    }

    for (let i = 0; i < poolInfo.participants.length; i += 1) {
      const participant = poolInfo.participants[i];
      // make sure there is a record for each pooler.
      if (!totalPoolerCurrentPoints[participant.id]) {
        totalPoolerCurrentPoints[participant.id] = { F: 0, D: 0, G: 0 };
      }

      // Parse every points made for this pooler on that specific date and cumulate it to store it in the chartData.
      const forwards =
        poolInfo.context?.score_by_day?.[jDate]?.[participant.id]?.roster.F;
      const defense =
        poolInfo.context?.score_by_day?.[jDate]?.[participant.id]?.roster.D;
      const goalies =
        poolInfo.context?.score_by_day?.[jDate]?.[participant.id]?.roster.G;
      if (forwards && defense && goalies) {
        // Forwards
        if (positionFilter === null || positionFilter === "F") {
          for (const [skaterId, skater] of Object.entries(forwards)) {
            // Ensure `skaterKey` exists in `poolerPlayers[participant.id]`
            if (!poolerPlayers[participant.id].F[skaterId]) {
              poolerPlayers[participant.id].F[skaterId] = 0;
            }
            if (skater) {
              const skaterPoints = getSkaterPoolPoints(
                poolInfo.settings.forwards_settings,
                skater
              );

              totalPoolerCurrentPoints[participant.id].F += skaterPoints;
              poolerPlayers[participant.id].F[skaterId] += skaterPoints;
            }
          }

          if (poolInfo.settings.ignore_x_worst_players?.forwards ?? 0 > 0) {
            worstForwardsPointsIgnored = findXLeastTotalPoints(
              poolerPlayers[participant.id].F,
              poolInfo.settings.ignore_x_worst_players?.forwards ?? 0
            );
          }
        }

        // Defense
        if (positionFilter === null || positionFilter === "D") {
          for (const [skaterId, skater] of Object.entries(defense)) {
            // Ensure `skaterKey` exists in `poolerPlayers[participant.id]`
            if (!poolerPlayers[participant.id].D[skaterId]) {
              poolerPlayers[participant.id].D[skaterId] = 0;
            }
            if (skater) {
              const skaterPoints = getSkaterPoolPoints(
                poolInfo.settings.defense_settings,
                skater
              );
              totalPoolerCurrentPoints[participant.id].D += skaterPoints;
              poolerPlayers[participant.id].D[skaterId] += skaterPoints;
            }
          }
          if (poolInfo.settings.ignore_x_worst_players?.defense ?? 0 > 0) {
            worstDefendersPointsIgnored = findXLeastTotalPoints(
              poolerPlayers[participant.id].D,
              poolInfo.settings.ignore_x_worst_players?.defense ?? 0
            );
          }
        }

        // Goalies
        if (positionFilter === null || positionFilter === "G") {
          for (const [goalieId, goalie] of Object.entries(goalies)) {
            // Ensure `skaterKey` exists in `poolerPlayers[participant.id]`
            if (!poolerPlayers[participant.id].G[goalieId]) {
              poolerPlayers[participant.id].G[goalieId] = 0;
            }
            if (goalie) {
              const goaliePoints = getGoaliePoolPoints(
                poolInfo.settings.goalies_settings,
                goalie
              );
              totalPoolerCurrentPoints[participant.id].G += goaliePoints;
              poolerPlayers[participant.id].G[goalieId] += goaliePoints;
            }
          }
          if (poolInfo.settings.ignore_x_worst_players?.goalies ?? 0 > 0) {
            worstGoaliesPointsIgnored = findXLeastTotalPoints(
              poolerPlayers[participant.id].G,
              poolInfo.settings.ignore_x_worst_players?.goalies ?? 0
            );
          }
        }

        chartElement[participant.name] =
          totalPoolerCurrentPoints[participant.id].F +
          totalPoolerCurrentPoints[participant.id].D +
          totalPoolerCurrentPoints[participant.id].G -
          (worstForwardsPointsIgnored +
            worstDefendersPointsIgnored +
            worstGoaliesPointsIgnored);
      }
    }
    chartData.push(chartElement);
  }
  return chartData;
};

const findSkaterPoints = (poolInfo: Pool , jDate: string, participantId: string, playerId: string): SkaterPoints | null => {
  const roster =
    poolInfo.context?.score_by_day?.[jDate]?.[participantId]?.roster;

  // Check both "F" and "D" for the player
  return roster?.F?.[playerId] || roster?.D?.[playerId] || null;
}

const findGoaliePoints = (poolInfo: Pool , jDate: string, participantId: string, playerId: string): GoaliePoints | null => {
  const roster =
    poolInfo.context?.score_by_day?.[jDate]?.[participantId]?.roster;

  return roster?.G?.[playerId] || null;
}

export const getPoolUserWithName = (
  poolInfo: Pool,
  name: string): PoolUser | undefined => {
  return poolInfo.participants.find(u => u.name == name)
}

export const getSkaterTimeRangeCharts = (
  poolInfo: Pool,
  poolStartDate: Date,
  poolSelectedEndDate: Date,
  playerId: string,
  userId: string,
  skaterSettings: SkaterSettings,
) => {
  // Return a charts of the amout of points accumulated between 2 dates.
  console.log(
    `Calculating skater cumulative chart from ${poolStartDate} to ${poolSelectedEndDate}`
  );
  let prevChartElement = null;
  const chartData = [];
 
  for (
    let j = new Date(poolStartDate);
    j <= poolSelectedEndDate;
    j.setDate(j.getDate() + 1)
  ) {
    const jDate = j.toISOString().slice(0, 10);
    const chartElement: Record<string, string | number | boolean> = {
      date: jDate,
    };

    // Ignore date with no games.
    if (!poolInfo.context?.score_by_day?.[jDate]) {
      continue;
    }

    const skaterPoints = findSkaterPoints(poolInfo, jDate, userId, playerId)

    chartElement["poolPoints"] = Number(prevChartElement?.["poolPoints"] ?? 0) + (skaterPoints ? getSkaterPoolPoints(skaterSettings, skaterPoints) : 0);
    chartElement["goals"] = Number(prevChartElement?.["goals"] ?? 0) + (skaterPoints?.G ?? 0);
    chartElement["assists"] = Number(prevChartElement?.["assists"] ?? 0) + (skaterPoints?.A ?? 0);
    chartElement["hattricks"] = Number(prevChartElement?.["hattricks"] ?? 0) + (skaterPoints && skaterPoints.G >= 3 ? 1 : 0);
    chartElement["shootoutGoals"] = Number(prevChartElement?.["shootoutGoals"] ?? 0) + (skaterPoints && skaterPoints.SOG ? skaterPoints.SOG : 0);  
    chartElement["isInRoster"] = (playerId in poolInfo.context.score_by_day[jDate][userId].roster.F) || (playerId in poolInfo.context.score_by_day[jDate][userId].roster.D)
    
    prevChartElement = chartElement;
    chartData.push(chartElement);
    
  }
  
  return chartData;
};

export const getGoalieTimeRangeCharts = (
  poolInfo: Pool ,
  poolStartDate: Date,
  poolSelectedEndDate: Date,
  playerId: string,
  userId: string,
  goaliesSettings: GoaliesSettings,
) => {
  // Return a charts of the amout of points accumulated between 2 dates.
  console.log(
    `Calculating goalie cumulative chart from ${poolStartDate} to ${poolSelectedEndDate}`
  );
  let prevChartElement = null;
  const chartData = [];
 
  for (
    let j = new Date(poolStartDate);
    j <= poolSelectedEndDate;
    j.setDate(j.getDate() + 1)
  ) {
    const jDate = j.toISOString().slice(0, 10);
    const chartElement: Record<string, string | number | boolean> = {
      date: jDate,
    };

    // Ignore date with no games.
    if (!poolInfo.context?.score_by_day?.[jDate]) {
      continue;
    }

    const goaliePoints = findGoaliePoints(poolInfo, jDate, userId, playerId)

    chartElement["poolPoints"] = Number(prevChartElement?.["poolPoints"] ?? 0) + (goaliePoints ? getGoaliePoolPoints(goaliesSettings, goaliePoints) : 0);
    chartElement["wins"] = Number(prevChartElement?.["wins"] ?? 0) + (goaliePoints?.W ? 1 : 0);
    chartElement["shutout"] = Number(prevChartElement?.["shutout"] ?? 0) + (goaliePoints?.SO ? 1 : 0);
    chartElement["otlosses"] = Number(prevChartElement?.["otlosses"] ?? 0) + (goaliePoints?.OT ? 1 : 0);
    chartElement["goals"] = Number(prevChartElement?.["goals"] ?? 0) + (goaliePoints?.G ?? 0 );
    chartElement["assists"] = Number(prevChartElement?.["assists"] ?? 0) + (goaliePoints?.A ?? 0 );
    chartElement["isInRoster"] = playerId in poolInfo.context.score_by_day[jDate][userId].roster.G
    
    prevChartElement = chartElement;
    chartData.push(chartElement);
    
  }
  
  return chartData;
};
