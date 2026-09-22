import { describe, expect, it } from "vitest";

import { Pool, PoolState } from "@/data/pool/model";
import {
  getPoolerTradablePicks,
  getTradablePicks,
  isPickUsed,
  pickKey,
} from "./pool-picks";

const POOLERS = ["a", "b", "c"];

// One round of picks, each still owned by the pooler it belongs to.
const round = (overrides: Record<string, string> = {}) => ({
  ...Object.fromEntries(POOLERS.map((id) => [id, id])),
  ...overrides,
});

const pool = (
  status: PoolState,
  {
    picks = [],
    pastPicks = [],
    drafted = 0,
  }: {
    picks?: Record<string, string>[];
    pastPicks?: Record<string, string>[];
    drafted?: number;
  } = {},
): Pool =>
  ({
    status,
    draft_order: POOLERS,
    context: {
      tradable_picks: picks,
      past_tradable_picks: pastPicks,
      players_name_drafted: Array.from({ length: drafted }, (_, i) => i + 1),
    },
  }) as unknown as Pool;

describe("getTradablePicks", () => {
  // A pool carries two generations of picks at once, and which one a trade
  // moves is the whole reason this helper exists.
  it("uses the picks of the coming draft before it has been played", () => {
    for (const status of [PoolState.Dynasty, PoolState.Draft]) {
      const poolInfo = pool(status, {
        picks: [round({ a: "b" })],
        pastPicks: [round({ c: "a" })],
      });

      expect(getTradablePicks(poolInfo)).toEqual([round({ c: "a" })]);
    }
  });

  it("uses next season's picks once the pool is running", () => {
    for (const status of [PoolState.InProgress, PoolState.Final]) {
      const poolInfo = pool(status, {
        picks: [round({ a: "b" })],
        pastPicks: [round({ c: "a" })],
      });

      expect(getTradablePicks(poolInfo)).toEqual([round({ a: "b" })]);
    }
  });

  it("survives a pool with no context", () => {
    expect(getTradablePicks({ status: PoolState.Draft } as Pool)).toEqual([]);
  });
});

describe("isPickUsed", () => {
  // Picks go one per pooler per round in draft order, so with 3 poolers and 4
  // picks made the whole first round and the first pick of the second are gone.
  it("counts the picks already played in the running draft", () => {
    const poolInfo = pool(PoolState.Draft, {
      pastPicks: [round(), round()],
      drafted: 4,
    });

    expect(isPickUsed(poolInfo, { round: 0, from: "a" })).toBe(true);
    expect(isPickUsed(poolInfo, { round: 0, from: "c" })).toBe(true);
    expect(isPickUsed(poolInfo, { round: 1, from: "a" })).toBe(true);
    expect(isPickUsed(poolInfo, { round: 1, from: "b" })).toBe(false);
    expect(isPickUsed(poolInfo, { round: 1, from: "c" })).toBe(false);
  });

  it("spends nothing during the protection window", () => {
    const poolInfo = pool(PoolState.Dynasty, { pastPicks: [round()] });

    expect(isPickUsed(poolInfo, { round: 0, from: "a" })).toBe(false);
  });

  // Next season's picks cannot have been played, however far the last draft
  // went — reading `players_name_drafted` there would mark them all as spent.
  it("spends nothing once the pool is running", () => {
    const poolInfo = pool(PoolState.InProgress, {
      picks: [round()],
      drafted: 99,
    });

    expect(isPickUsed(poolInfo, { round: 0, from: "a" })).toBe(false);
  });
});

describe("getPoolerTradablePicks", () => {
  it("returns what a pooler owns and can still trade", () => {
    // "a" traded their own second-round pick to "b" and holds "c"'s instead.
    const poolInfo = pool(PoolState.Draft, {
      pastPicks: [round(), round({ a: "b", c: "a" })],
      drafted: 3,
    });

    expect(getPoolerTradablePicks(poolInfo, "a").map(pickKey)).toEqual(["1-c"]);
    expect(getPoolerTradablePicks(poolInfo, "b").map(pickKey).sort()).toEqual([
      "1-a",
      "1-b",
    ]);
    // Round 0 is entirely behind us, so "c" is left with nothing to trade.
    expect(getPoolerTradablePicks(poolInfo, "c")).toEqual([]);
  });
});
