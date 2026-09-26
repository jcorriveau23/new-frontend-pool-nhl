/*
Pools and players for component tests.

The pool context itself is never rendered in a test: its provider fetches the
pool, derives the scores and writes to Dexie. A test mocks the module and hands
`usePoolContext` one of these instead, which is the smallest thing the tables
and the roster screens actually read.
*/

import {
  DraftType,
  Player,
  Pool,
  PoolSettings,
  PoolState,
  PoolUser,
  Position,
} from "@/data/pool/model";

export const poolUser = (id: string, name: string): PoolUser => ({
  id,
  name,
  is_owned: true,
});

export const testPlayer = (
  id: number,
  name: string,
  position: Position = Position.F,
  salary: number | null = 1_000_000,
): Player =>
  ({
    id,
    name,
    team: 10,
    position,
    age: 25,
    salary_cap: salary,
    contract_expiration_season: 20272028,
  }) as Player;

const points = {
  points_per_goals: 1,
  points_per_assists: 1,
  points_per_hattricks: 1,
  points_per_shootout_goals: 1,
};

export const testSettings = (
  overrides: Partial<PoolSettings> = {},
): PoolSettings => ({
  number_poolers: 2,
  draft_type: DraftType.SERPENTINE,
  assistants: [],
  number_forwards: 2,
  number_defenders: 1,
  number_goalies: 1,
  number_reservists: 2,
  salary_cap: null,
  roster_modification_date: [],
  forwards_settings: points,
  defense_settings: points,
  goalies_settings: {
    ...points,
    points_per_wins: 1,
    points_per_shutouts: 1,
    points_per_overtimes: 1,
  },
  ignore_x_worst_players: null,
  dynasty_settings: null,
  player_drop_settings: null,
  ...overrides,
});

export const testPool = (overrides: Partial<Pool> = {}): Pool =>
  ({
    id: "pool-id",
    name: "my-pool",
    owner: "user-a",
    number_poolers: 2,
    participants: [poolUser("user-a", "Alice"), poolUser("user-b", "Bob")],
    settings: testSettings(),
    status: PoolState.InProgress,
    draft_order: ["user-a", "user-b"],
    final_rank: null,
    nb_player_drafted: 0,
    nb_trade: 0,
    trades: null,
    pending_pooler_links: null,
    context: {
      pooler_roster: {
        "user-a": {
          chosen_forwards: [1, 2],
          chosen_defenders: [3],
          chosen_goalies: [4],
          chosen_reservists: [5],
        },
        "user-b": {
          chosen_forwards: [],
          chosen_defenders: [],
          chosen_goalies: [],
          chosen_reservists: [],
        },
      },
      players_name_drafted: [],
      score_by_day: null,
      tradable_picks: null,
      past_tradable_picks: null,
      protected_players: null,
      players: {},
      roster_transactions: null,
    },
    date_updated: 0,
    season_start: "2026-10-07",
    season_end: "2027-04-15",
    season: 20262027,
    ...overrides,
  }) as Pool;

/*
The context value, with only the fields a component reads filled in. The rest
throw if something reaches for them, which is how a test finds out it is
exercising more than it meant to.
*/
export function testPoolContext(poolInfo: Pool, overrides: object = {}) {
  return {
    poolInfo,
    updatePoolInfo: () => {},
    applyPoolBroadcast: () => {},
    applyDraftDelta: () => {},
    resyncPoolInfo: () => {},
    dictUsers: Object.fromEntries(
      poolInfo.participants.map((user) => [user.id, user]),
    ),
    playersOwner: {},
    protectedPlayers: null,
    selectedParticipant: poolInfo.participants[0].name,
    selectedPoolUser: poolInfo.participants[0],
    updateSelectedParticipant: () => {},
    userPoolUser: poolInfo.participants[0],
    lastFormatDate: null,
    dateOfInterest: poolInfo.season_end,
    poolStartDate: new Date(`${poolInfo.season_start}T00:00:00`),
    poolSelectedEndDate: new Date(`${poolInfo.season_end}T00:00:00`),
    dailyPointsMade: null,
    ...overrides,
  };
}
