import { describe, expect, it } from "vitest";

import { Player, Pool, Position } from "@/data/pool/model";
import {
  getCapAllocation,
  getContractValues,
  getExpirationSchedule,
  getPoolerCapUsage,
} from "./lineup-analytics";

const makePlayer = (
  id: number,
  position: Position,
  salary: number | null,
  contractExpirationSeason: number | null = 20252026
): Player =>
  ({
    id,
    name: `Player ${id}`,
    position,
    salary_cap: salary,
    contract_expiration_season: contractExpirationSeason,
  }) as Player;

describe("getCapAllocation", () => {
  it("splits the cap between the three positions", () => {
    const allocation = getCapAllocation(
      {
        forwards: [makePlayer(1, Position.F, 6_000_000)],
        defense: [makePlayer(2, Position.D, 3_000_000)],
        goalies: [makePlayer(3, Position.G, 1_000_000)],
      },
      20_000_000
    );

    expect(allocation.usedSalary).toBe(10_000_000);
    expect(allocation.spaceLeft).toBe(10_000_000);
    expect(allocation.usedShare).toBe(50);
    expect(allocation.slices.map((slice) => slice.share)).toEqual([30, 15, 5]);
  });

  it("reports a negative space left when over the cap", () => {
    const allocation = getCapAllocation(
      {
        forwards: [makePlayer(1, Position.F, 12_000_000)],
        defense: [],
        goalies: [],
      },
      10_000_000
    );

    expect(allocation.spaceLeft).toBe(-2_000_000);
  });

  it("ignores players without a contract", () => {
    const allocation = getCapAllocation(
      {
        forwards: [makePlayer(1, Position.F, null)],
        defense: [],
        goalies: [],
      },
      10_000_000
    );

    expect(allocation.usedSalary).toBe(0);
  });
});

describe("getContractValues", () => {
  it("ranks players by pool points bought per million", () => {
    const values = getContractValues(
      [
        makePlayer(1, Position.F, 10_000_000),
        makePlayer(2, Position.F, 1_000_000),
      ],
      { 1: 50, 2: 20 }
    );

    expect(values.map((value) => value.playerId)).toEqual([2, 1]);
    expect(values[0].pointsPerMillion).toBe(20);
    expect(values[1].pointsPerMillion).toBe(5);
  });

  it("gives a player with no point a value of zero instead of dividing by it", () => {
    const [value] = getContractValues([makePlayer(1, Position.F, 4_000_000)], {});

    expect(value.poolPoints).toBe(0);
    expect(value.pointsPerMillion).toBe(0);
    expect(value.salaryPerPoint).toBeNull();
  });

  it("leaves out players without a contract", () => {
    expect(
      getContractValues([makePlayer(1, Position.F, null)], { 1: 30 })
    ).toEqual([]);
  });
});

describe("getExpirationSchedule", () => {
  it("groups the cap by expiration season, oldest first", () => {
    const schedule = getExpirationSchedule([
      makePlayer(1, Position.F, 3_000_000, 20262027),
      makePlayer(2, Position.D, 2_000_000, 20252026),
      makePlayer(3, Position.G, 1_000_000, 20252026),
    ]);

    expect(schedule.map((bucket) => bucket.season)).toEqual([
      20252026, 20262027,
    ]);
    expect(schedule[0].salary).toBe(3_000_000);
    expect(schedule[0].players.map((player) => player.id)).toEqual([2, 3]);
  });

  it("puts the unknown expirations last and skips players without a contract", () => {
    const schedule = getExpirationSchedule([
      makePlayer(1, Position.F, 1_000_000, null),
      makePlayer(2, Position.D, 2_000_000, 20252026),
      makePlayer(3, Position.G, null, 20252026),
    ]);

    expect(schedule.map((bucket) => bucket.season)).toEqual([20252026, null]);
    expect(schedule[0].players).toHaveLength(1);
  });
});

describe("getPoolerCapUsage", () => {
  const pool = {
    participants: [
      { id: "a", name: "Alice", is_owned: true },
      { id: "b", name: "Bob", is_owned: true },
    ],
    context: {
      pooler_roster: {
        a: {
          chosen_forwards: [1],
          chosen_defenders: [2],
          chosen_goalies: [],
          chosen_reservists: [3],
        },
        b: {
          chosen_forwards: [],
          chosen_defenders: [],
          chosen_goalies: [],
          chosen_reservists: [],
        },
      },
      players: {
        "1": makePlayer(1, Position.F, 5_000_000),
        "2": makePlayer(2, Position.D, 2_000_000),
        "3": makePlayer(3, Position.F, 9_000_000),
      },
    },
  } as unknown as Pool;

  it("counts the lineup only, reservists are outside of the cap", () => {
    expect(getPoolerCapUsage(pool)).toEqual([
      { id: "a", name: "Alice", capUsed: 7_000_000 },
      { id: "b", name: "Bob", capUsed: 0 },
    ]);
  });

  it("returns nothing when the pool has no context yet", () => {
    expect(getPoolerCapUsage({ ...pool, context: null } as Pool)).toEqual([]);
  });
});
