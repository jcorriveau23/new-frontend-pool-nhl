/*
Aggregations behind the lineup analysis charts.

Everything here is pure so the charts stay presentation only, and so the maths
that answers "is this team well built?" can be tested without rendering.
*/
import { Player, Pool, Position } from "@/data/pool/model";

const MILLION = 1_000_000;

export interface LineupPlayers {
  forwards: Player[];
  defense: Player[];
  goalies: Player[];
}

export interface CapAllocationSlice {
  position: Position;
  salary: number;
  // Share of the team cap, 0 to 100.
  share: number;
}

export interface CapAllocation {
  slices: CapAllocationSlice[];
  usedSalary: number;
  // Negative once the lineup is over the cap.
  spaceLeft: number;
  usedShare: number;
}

export const getCapAllocation = (
  lineup: LineupPlayers,
  teamSalaryCap: number
): CapAllocation => {
  const sumSalary = (players: Player[]) =>
    players.reduce((total, player) => total + (player.salary_cap ?? 0), 0);

  const slices = [
    { position: Position.F, salary: sumSalary(lineup.forwards) },
    { position: Position.D, salary: sumSalary(lineup.defense) },
    { position: Position.G, salary: sumSalary(lineup.goalies) },
  ].map((slice) => ({
    ...slice,
    share: teamSalaryCap > 0 ? (slice.salary / teamSalaryCap) * 100 : 0,
  }));

  const usedSalary = slices.reduce((total, slice) => total + slice.salary, 0);

  return {
    slices,
    usedSalary,
    spaceLeft: teamSalaryCap - usedSalary,
    usedShare: teamSalaryCap > 0 ? (usedSalary / teamSalaryCap) * 100 : 0,
  };
};

export interface ContractValue {
  playerId: number;
  name: string;
  position: Position;
  salary: number;
  poolPoints: number;
  // Pool points bought per million of cap. Higher is better, and a player who
  // has not produced yet lands on 0 instead of dividing by zero.
  pointsPerMillion: number;
  // Cap spent per pool point, null while the player has no point.
  salaryPerPoint: number | null;
}

export const getContractValues = (
  players: Player[],
  playerPoolPoints: Record<number, number>
): ContractValue[] =>
  players
    // A player without a contract has no cap cost to weigh his production
    // against, so he is not part of the value ranking.
    .filter((player) => player.salary_cap !== null && player.salary_cap > 0)
    .map((player) => {
      const salary = player.salary_cap as number;
      const poolPoints = playerPoolPoints[player.id] ?? 0;

      return {
        playerId: player.id,
        name: player.name,
        position: player.position,
        salary,
        poolPoints,
        pointsPerMillion: poolPoints / (salary / MILLION),
        salaryPerPoint: poolPoints > 0 ? salary / poolPoints : null,
      };
    })
    .sort((p1, p2) => p2.pointsPerMillion - p1.pointsPerMillion);

export interface ExpirationBucket {
  // Season the contracts end, as stored on the player (e.g. 20242025). Null
  // groups the players whose expiration is unknown.
  season: number | null;
  salary: number;
  players: { id: number; name: string; salary: number }[];
}

export const getExpirationSchedule = (players: Player[]): ExpirationBucket[] => {
  const buckets = new Map<number | null, ExpirationBucket>();

  for (const player of players) {
    if (player.salary_cap === null) {
      continue;
    }

    const season = player.contract_expiration_season;
    const bucket = buckets.get(season) ?? {
      season,
      salary: 0,
      players: [],
    };

    bucket.salary += player.salary_cap;
    bucket.players.push({
      id: player.id,
      name: player.name,
      salary: player.salary_cap,
    });
    buckets.set(season, bucket);
  }

  return [...buckets.values()]
    .map((bucket) => ({
      ...bucket,
      players: [...bucket.players].sort((p1, p2) => p2.salary - p1.salary),
    }))
    .sort((b1, b2) => {
      // Unknown expirations close the timeline, they are not a season.
      if (b1.season === null) return 1;
      if (b2.season === null) return -1;
      return b1.season - b2.season;
    });
};

export interface PoolerCapUsage {
  id: string;
  name: string;
  capUsed: number;
}

// Cap taken by the lineup of every pooler. Reservists sit outside of the cap,
// same rule as the backend applies when it validates a roster modification.
export const getPoolerCapUsage = (pool: Pool): PoolerCapUsage[] => {
  const context = pool.context;
  if (context === null) {
    return [];
  }

  return pool.participants.map((participant) => {
    const roster = context.pooler_roster[participant.id];
    const playerIds = roster
      ? [
          ...roster.chosen_forwards,
          ...roster.chosen_defenders,
          ...roster.chosen_goalies,
        ]
      : [];

    return {
      id: participant.id,
      name: participant.name,
      capUsed: playerIds.reduce(
        (total, playerId) =>
          total + (context.players[playerId.toString()]?.salary_cap ?? 0),
        0
      ),
    };
  });
};
