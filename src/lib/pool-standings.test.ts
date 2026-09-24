import { describe, expect, it } from "vitest";

import { Pool } from "@/data/pool/model";
import {
  buildLineupAnalytics,
  buildPoolerEntries,
  isDateInPoolRange,
  RankedParticipant,
  resolveDisplayedDate,
  ScoredRoster,
  sortByPoolPoints,
} from "./pool-standings";

const ranked = (participant: string, points: number): RankedParticipant => ({
  participant,
  getTotalPoolPoints: () => points,
});

const scored = (id: number, poolPoints: number) => ({ id, poolPoints });

const roster = (
  forwards: number[][],
  defense: number[][] = [],
  goalies: number[][] = [],
): ScoredRoster => ({
  forwards: forwards.map(([id, points]) => scored(id, points)),
  defense: defense.map(([id, points]) => scored(id, points)),
  goalies: goalies.map(([id, points]) => scored(id, points)),
});

// Only the fields these derivations read; the rest of a pool is irrelevant here.
const pool = (overrides: Partial<Pool> = {}): Pool =>
  ({
    name: "my-pool",
    season_start: "2026-10-07",
    season_end: "2027-04-15",
    participants: [
      { id: "id-alice", name: "Alice", is_owned: true },
      { id: "id-bob", name: "Bob", is_owned: true },
    ],
    context: null,
    settings: { salary_cap: null },
    ...overrides,
  }) as Pool;

describe("sortByPoolPoints", () => {
  it("orders poolers by total, highest first, without touching the input", () => {
    const ranking = [ranked("Alice", 10), ranked("Bob", 30), ranked("Cat", 20)];

    expect(sortByPoolPoints(ranking).map((r) => r.participant)).toEqual([
      "Bob",
      "Cat",
      "Alice",
    ]);
    expect(ranking.map((r) => r.participant)).toEqual(["Alice", "Bob", "Cat"]);
  });

  it("treats a ranking that has not been computed as empty", () => {
    expect(sortByPoolPoints(null)).toEqual([]);
  });
});

describe("buildPoolerEntries", () => {
  it("numbers the ranks from one and resolves each pooler's id", () => {
    const entries = buildPoolerEntries(
      [ranked("Bob", 30), ranked("Alice", 10)],
      pool().participants,
    );

    expect(entries).toEqual([
      { id: "id-bob", name: "Bob", rank: 1, points: 30 },
      { id: "id-alice", name: "Alice", rank: 2, points: 10 },
    ]);
  });

  it("falls back to the name when no participant matches", () => {
    const entries = buildPoolerEntries([ranked("Ghost", 0)], null);

    expect(entries[0]).toMatchObject({ id: "Ghost", name: "Ghost" });
  });
});

describe("buildLineupAnalytics", () => {
  it("indexes the pool points of every player of every roster", () => {
    const analytics = buildLineupAnalytics(
      {
        "id-alice": roster([[1, 12]], [[2, 5]], [[3, 8]]),
        "id-bob": roster([[4, 3]]),
      },
      [ranked("Alice", 25)],
      pool(),
    );

    expect(analytics.playerPoolPoints).toEqual({ 1: 12, 2: 5, 3: 8, 4: 3 });
  });

  it("returns nothing to chart while the stats are not computed", () => {
    expect(buildLineupAnalytics(null, [ranked("Alice", 1)], pool())).toEqual({
      playerPoolPoints: {},
      poolers: [],
    });
    expect(buildLineupAnalytics({}, null, pool())).toEqual({
      playerPoolPoints: {},
      poolers: [],
    });
  });

  it("pairs each pooler's cap usage with their total, zero when unranked", () => {
    const withRosters = pool({
      context: {
        pooler_roster: {
          "id-alice": {
            chosen_forwards: [],
            chosen_defenders: [],
            chosen_goalies: [],
            chosen_reservists: [],
          },
          "id-bob": {
            chosen_forwards: [],
            chosen_defenders: [],
            chosen_goalies: [],
            chosen_reservists: [],
          },
        },
      },
    } as unknown as Partial<Pool>);

    const analytics = buildLineupAnalytics(
      {},
      [ranked("Alice", 25)],
      withRosters,
    );

    expect(
      analytics.poolers.map((pooler) => [pooler.name, pooler.poolPoints]),
    ).toEqual([
      ["Alice", 25],
      ["Bob", 0],
    ]);
  });
});

describe("resolveDisplayedDate", () => {
  it("shows the day the nhl api calls now when no date is selected", () => {
    expect(
      resolveDisplayedDate("now", "2026-12-01", "2026-12-02", "2027-04-15"),
    ).toBe("2026-12-01");
  });

  it("falls back to today when the api reports no current date", () => {
    expect(
      resolveDisplayedDate("now", undefined, "2026-12-02", "2027-04-15"),
    ).toBe("2026-12-02");
  });

  it("shows the selected day when there is one", () => {
    expect(
      resolveDisplayedDate(
        "2026-11-20",
        "2026-12-01",
        "2026-12-02",
        "2026-11-20",
      ),
    ).toBe("2026-11-20");
  });
});

describe("isDateInPoolRange", () => {
  it("includes both ends of the season", () => {
    expect(isDateInPoolRange("2026-10-07", pool())).toBe(true);
    expect(isDateInPoolRange("2027-04-15", pool())).toBe(true);
  });

  it("excludes days outside the season", () => {
    expect(isDateInPoolRange("2026-10-06", pool())).toBe(false);
    expect(isDateInPoolRange("2027-04-16", pool())).toBe(false);
  });
});
