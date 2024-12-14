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
  past_season_pool_name: String[];
  next_season_pool_name: String | null;
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
  user: PoolUser,
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
      (playerId) => poolContext.players[playerId.toString()],
    ),
    ...reservistForwards,
  ];
  const defense = [
    ...poolContext.pooler_roster[user.id].chosen_defenders.map(
      (playerId) => poolContext.players[playerId.toString()],
    ),
    ...reservistsDefenders,
  ];
  const goalies = [
    ...poolContext.pooler_roster[user.id].chosen_goalies.map(
      (playerId) => poolContext.players[playerId.toString()],
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
  user: PoolUser,
) => {
  return {
    user,
    forwards: poolContext.pooler_roster[user.id].chosen_forwards.map(
      (playerId) => poolContext.players[playerId.toString()],
    ),
    defense: poolContext.pooler_roster[user.id].chosen_defenders.map(
      (playerId) => poolContext.players[playerId.toString()],
    ),
    goalies: poolContext.pooler_roster[user.id].chosen_goalies.map(
      (playerId) => poolContext.players[playerId.toString()],
    ),
    reservists: poolContext.pooler_roster[user.id].chosen_reservists.map(
      (playerId) => poolContext.players[playerId.toString()],
    ),
  };
};

export const getSkaterPoolPoints = (
  skatersSettings: SkaterSettings,
  skaterPoints: SkaterPoints,
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
  goaliePoints: GoaliePoints,
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
  xWorst: number,
) => {
  const values = Object.values(playersPoints);

  if (values.length < xWorst) {
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
  positionFilter: "F" | "D" | "G" | null,
) => {
  // Return a charts of the amout of points accumulated between 2 dates.
  console.log(
    `Calculating cumulative chart from ${poolStartDate} to ${poolSelectedEndDate}`,
  );
  const chartData = [];
  let prevChartElement = null;

  // This is necessary to filter points made by worst players of each positions.
  // Participant id -> list of players cumulated points.
  let poolerPlayers: Record<
    string,
    {
      F: Record<string, number>;
      D: Record<string, number>;
      G: Record<string, number>;
    }
  > = {};

  for (
    let j = new Date(poolStartDate);
    j <= poolSelectedEndDate;
    j.setDate(j.getDate() + 1)
  ) {
    const jDate = j.toISOString().slice(0, 10);
    let chartElement: Record<string, string | number> = {
      date: jDate,
    };

    // Ignore date with no games.
    if (!poolInfo.context?.score_by_day?.[jDate]) {
      continue;
    }

    for (let i = 0; i < poolInfo.participants.length; i += 1) {
      const participant = poolInfo.participants[i];

      // Parse every points made for this pooler on that specific date and cumulate it to store it in the chartData.
      const forwards =
        poolInfo.context?.score_by_day?.[jDate]?.[participant.id]?.roster.F;
      const defense =
        poolInfo.context?.score_by_day?.[jDate]?.[participant.id]?.roster.D;
      const goalies =
        poolInfo.context?.score_by_day?.[jDate]?.[participant.id]?.roster.G;
      if (forwards && defense && goalies) {
        let totalPoints = 0;

        // Forwards
        if (positionFilter === null || positionFilter === "F") {
          for (const [skaterId, skater] of Object.entries(forwards)) {
            if (skater) {
              // Ensure `skaterKey` exists in `poolerPlayers[participant.id]`
              if (!poolerPlayers[participant.id].F[skaterId]) {
                poolerPlayers[participant.id].F[skaterId] = 0;
              }

              const skaterPoints = getSkaterPoolPoints(
                poolInfo.settings.forwards_settings,
                skater,
              );
              poolerPlayers[participant.id].F[skaterId] += skaterPoints;
              totalPoints += skaterPoints;
            }
          }

          if (poolInfo.settings.ignore_x_worst_players?.forwards ?? 0 > 0) {
            let forwardPointsIgnored = findXLeastTotalPoints(
              poolerPlayers[participant.id].F,
              poolInfo.settings.ignore_x_worst_players?.forwards ?? 0,
            );
          }
        }

        // Defense
        if (positionFilter === null || positionFilter === "D") {
          for (const [skaterId, skater] of Object.entries(defense)) {
            if (skater) {
              // Ensure `skaterKey` exists in `poolerPlayers[participant.id]`
              if (!poolerPlayers[participant.id].D[skaterId]) {
                poolerPlayers[participant.id].D[skaterId] = 0;
              }

              const skaterPoints = getSkaterPoolPoints(
                poolInfo.settings.defense_settings,
                skater,
              );
              poolerPlayers[participant.id].D[skaterId] += skaterPoints;
              totalPoints += skaterPoints;
            }
          }
          if (poolInfo.settings.ignore_x_worst_players?.defense ?? 0 > 0) {
            let defensePointsIgnored = findXLeastTotalPoints(
              poolerPlayers[participant.id].D,
              poolInfo.settings.ignore_x_worst_players?.defense ?? 0,
            );
          }
        }

        // Goalies
        if (positionFilter === null || positionFilter === "G") {
          for (const [goalieId, goalie] of Object.entries(goalies)) {
            if (goalie) {
              // Ensure `skaterKey` exists in `poolerPlayers[participant.id]`
              if (!poolerPlayers[participant.id].G[goalieId]) {
                poolerPlayers[participant.id].G[goalieId] = 0;
              }

              const goaliesPoints = getGoaliePoolPoints(
                poolInfo.settings.goalies_settings,
                goalie,
              );
              poolerPlayers[participant.id].G[goalieId] += goaliesPoints;
              totalPoints += goaliesPoints;
            }
          }
          if (poolInfo.settings.ignore_x_worst_players?.goalies ?? 0 > 0) {
            let goaliesPointsIgnored = findXLeastTotalPoints(
              poolerPlayers[participant.id].D,
              poolInfo.settings.ignore_x_worst_players?.goalies ?? 0,
            );
          }
        }

        if (prevChartElement === null) {
          chartElement[participant.name] = totalPoints;
        } else {
          // Will always be number here.
          chartElement[participant.name] =
            (prevChartElement[participant.name] as number) + totalPoints;
        }
      }
    }
    chartData.push(chartElement);
    prevChartElement = chartElement;
  }
  return chartData;
};
