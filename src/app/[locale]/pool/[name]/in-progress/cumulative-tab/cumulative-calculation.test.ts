import { describe, expect, it } from "vitest";

import {
  GoaliesSettings,
  PlayerTypeSettings,
  Pool,
  PoolSettings,
  SkaterSettings,
} from "@/data/pool/model";

import { PlayerStatus, calculatePoolStats } from "./cumulative-calculation";

const skaterSettings: SkaterSettings = {
  points_per_goals: 2,
  points_per_assists: 1,
  points_per_hattricks: 3,
  points_per_shootout_goals: 1,
};

const goaliesSettings: GoaliesSettings = {
  points_per_wins: 2,
  points_per_shutouts: 3,
  points_per_overtimes: 1,
  points_per_goals: 3,
  points_per_assists: 1,
};

const ALICE = "alice-id";

/*
One participant with three forwards on a single scored night. No goal total
reaches three, so the hat-trick bonus never muddies the arithmetic:

  101  2G 4A -> 8 pool points
  102  2G 0A -> 4 pool points
  103  0G 1A -> 1 pool point   (the worst of the three)

Total is 13, or 12 once the worst forward is dropped.
*/
const makePool = (ignoreWorst: PlayerTypeSettings | null): Pool =>
  ({
    name: "test-pool",
    participants: [{ id: ALICE, name: "Alice", is_owned: true }],
    settings: {
      forwards_settings: skaterSettings,
      defense_settings: skaterSettings,
      goalies_settings: goaliesSettings,
      ignore_x_worst_players: ignoreWorst,
    } as PoolSettings,
    context: {
      players: {},
      pooler_roster: {
        [ALICE]: {
          chosen_forwards: [101, 102, 103],
          chosen_defenders: [],
          chosen_goalies: [],
          chosen_reservists: [],
        },
      },
      score_by_day: {
        "2024-01-22": {
          [ALICE]: {
            roster: {
              F: {
                "101": { G: 2, A: 4 },
                "102": { G: 2, A: 0 },
                "103": { G: 0, A: 1 },
              },
              D: {},
              G: {},
            },
            is_cumulated: true,
          },
        },
      },
    },
  }) as unknown as Pool;

// Padded either side of the scored day so the date walk covers it whatever
// timezone the test runs in.
const rangeStart = new Date("2024-01-20T00:00:00");
const rangeEnd = new Date("2024-01-25T00:00:00");

describe("calculatePoolStats — ignore_x_worst_players", () => {
  it("counts every player when the setting is off", () => {
    const [, rank] = calculatePoolStats(
      makePool(null),
      rangeStart,
      rangeEnd,
      null
    );

    expect(rank![0].getTotalPoolPoints()).toBe(13);
  });

  it("drops the worst forward from the total when the setting is on", () => {
    const [stats, rank] = calculatePoolStats(
      makePool({ forwards: 1, defense: 0, goalies: 0 }),
      rangeStart,
      rangeEnd,
      null
    );

    expect(rank![0].getTotalPoolPoints()).toBe(12);

    // The dropped player is the lowest scorer, and only that one.
    const ignored = stats![ALICE].forwards.filter(
      (forward) => forward.status === PlayerStatus.PointsIgnored
    );
    expect(ignored.map((forward) => forward.id)).toEqual([103]);
  });

  it("keeps the ranking consistent with the raw per-player points", () => {
    const [stats] = calculatePoolStats(
      makePool({ forwards: 1, defense: 0, goalies: 0 }),
      rangeStart,
      rangeEnd,
      null
    );

    // Sorted best first, so the Records tab and the Cumulative tab agree on
    // who the season leader is.
    expect(
      stats![ALICE].forwards.map((forward) => [forward.id, forward.poolPoints])
    ).toEqual([
      [101, 8],
      [102, 4],
      [103, 1],
    ]);
  });
});
