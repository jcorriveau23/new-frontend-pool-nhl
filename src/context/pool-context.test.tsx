import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Pool, PlayerDraftedResponse } from "@/data/pool/model";
import { testPool } from "@/test/pool-fixtures";

const apiGet = vi.fn();
const dbGet = vi.fn();
const dbPut = vi.fn();

vi.mock("@/lib/client-api", () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: vi.fn(),
}));

// Dexie needs indexedDB, which jsdom does not ship; the rows it would hold are
// what the test is steering anyway.
vi.mock("@/db", () => ({
  db: {
    pools: {
      get: (...args: unknown[]) => dbGet(...args),
      put: (...args: unknown[]) => dbPut(...args),
    },
  },
}));

vi.mock("@/context/useUserData", () => ({
  useUser: () => ({ info: { id: "user-a" } }),
}));

// The date context reads the daily games through react-query; the pool context
// only needs the day it settles on.
vi.mock("@/context/date-context", () => ({
  useDateContext: () => ({
    currentDate: new Date("2026-12-01T12:00:00"),
    querySelectedDate: "now",
    score: null,
  }),
}));

import { act, render, screen } from "@testing-library/react";
import * as React from "react";

import {
  fetchPoolInfo,
  PoolContextProvider,
  usePoolContext,
} from "@/context/pool-context";
import { SCORE_CACHE_VERSION } from "@/lib/pool-score-cache";

const scores = (day: string) => ({
  [day]: { "user-a": { roster: {}, points: 1 } },
});

// Every day from the fixture's season start to `to`, which is the shape the
// cache actually takes: the derived-scores endpoint answers one entry per
// calendar day of the range it is given, so a cache built from it has no gaps.
const cachedThrough = (to: string) => {
  const days: Record<string, unknown> = {};
  for (let day = "2026-10-07"; day <= to;) {
    Object.assign(days, scores(day));
    const next = new Date(`${day}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    day = next.toISOString().slice(0, 10);
  }
  return days;
};

// A Dexie row the current code wrote, which is the only kind its scores are
// believed from.
const cachedRow = (score_by_day: Record<string, unknown>) => ({
  id: 7,
  name: "my-pool",
  season_start: "2026-10-07",
  season_end: "2027-04-15",
  score_cache_version: SCORE_CACHE_VERSION,
  context: { score_by_day },
});

beforeEach(() => {
  /*
  Which score days are still missing is decided against today's date, so the
  clock is pinned to a day inside the fixture's season. Only `Date` is faked:
  the concurrency test below needs a real `setTimeout`.
  */
  vi.useFakeTimers({
    toFake: ["Date"],
    now: new Date("2026-12-01T12:00:00"),
  });
  dbGet.mockResolvedValue(undefined);
  dbPut.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("fetchPoolInfo", () => {
  it("reads the pool and stores it locally", async () => {
    const pool = testPool();
    apiGet.mockImplementation(async (path: string) =>
      path.startsWith("/pool/")
        ? { ok: true, data: pool }
        : { ok: true, data: scores("2026-10-07") },
    );

    const result = (await fetchPoolInfo("my-pool")) as Pool;

    expect(result.name).toBe("my-pool");
    expect(apiGet).toHaveBeenCalledWith("/pool/my-pool");

    // What is written is stamped with the rule that chose its days, so a later
    // build can tell which rows it may believe.
    const [row] = dbPut.mock.calls[0];
    expect(row.name).toBe("my-pool");
    expect(row.score_cache_version).toBe(SCORE_CACHE_VERSION);
  });

  it("does not store the days it is going to re-derive anyway", async () => {
    const pool = testPool();
    apiGet.mockImplementation(async (path: string) =>
      path.startsWith("/pool/")
        ? { ok: true, data: pool }
        : {
            ok: true,
            data: { ...scores("2026-11-20"), ...scores("2026-12-01") },
          },
    );

    const result = (await fetchPoolInfo("my-pool")) as Pool;

    // The tabs are shown every day that was derived...
    expect(Object.keys(result.context!.score_by_day!).sort()).toEqual([
      "2026-11-20",
      "2026-12-01",
    ]);
    // ...but today's cannot be written: its games may not be over, and nothing
    // would go back for it once it fell out of the re-derived tail.
    const [row] = dbPut.mock.calls[0];
    expect(Object.keys(row.context.score_by_day)).toEqual(["2026-11-20"]);
  });

  it("passes the pool name through without re-encoding it", async () => {
    apiGet.mockResolvedValue({ ok: true, data: testPool() });

    await fetchPoolInfo("Raph%20gagne");

    // Encoding it again would ask the backend for a pool literally named
    // "Raph%2520gagne".
    expect(apiGet).toHaveBeenCalledWith("/pool/Raph%20gagne");
  });

  it("reports the backend's own error", async () => {
    apiGet.mockResolvedValue({ ok: false, error: "pool not found" });

    expect(await fetchPoolInfo("missing-pool")).toBe("pool not found");
    expect(dbPut).not.toHaveBeenCalled();
  });

  it("refuses a response that is not a pool", async () => {
    apiGet.mockResolvedValue({ ok: true, data: { name: "my-pool" } });

    const result = await fetchPoolInfo("my-pool");

    expect(typeof result).toBe("string");
    expect(result).toMatch(/malformed/);
    // Nothing broken is written over the last good local copy.
    expect(dbPut).not.toHaveBeenCalled();
  });

  it("asks only for the score days the local copy is missing", async () => {
    dbGet.mockResolvedValue(cachedRow(cachedThrough("2026-11-25")));
    apiGet.mockImplementation(async (path: string) =>
      path.startsWith("/pool/")
        ? { ok: true, data: testPool() }
        : { ok: true, data: scores("2026-11-26") },
    );

    const result = (await fetchPoolInfo("my-pool")) as Pool;

    const scorePath = apiGet.mock.calls
      .map(([path]) => path as string)
      .find((path) => path.startsWith("/pool-scores/"))!;
    // Only what the cache cannot answer for: the days after the ones it holds.
    expect(scorePath).toBe(
      "/pool-scores/my-pool/cumulative/2026-11-26/2026-12-01",
    );
    expect(result.context!.score_by_day).toHaveProperty("2026-10-07");
    expect(result.context!.score_by_day).toHaveProperty("2026-11-26");
    // The row id is carried over so the write updates in place.
    expect(result.id).toBe(7);
  });

  it("re-derives from the first day missing in the middle of the cache", async () => {
    const holed = cachedThrough("2026-12-01");
    delete holed["2026-10-20"];
    dbGet.mockResolvedValue(cachedRow(holed));
    apiGet.mockImplementation(async (path: string) =>
      path.startsWith("/pool/")
        ? { ok: true, data: testPool() }
        : { ok: true, data: scores("2026-10-20") },
    );

    await fetchPoolInfo("my-pool");

    // The standings sum the days `score_by_day` holds, so a hole is part of the
    // season silently missing from them. Resuming from the latest cached day
    // took everything below it on faith and never went back.
    expect(
      apiGet.mock.calls
        .map(([path]) => path as string)
        .find((path) => path.startsWith("/pool-scores/")),
    ).toBe("/pool-scores/my-pool/cumulative/2026-10-20/2026-12-01");
  });

  it("discards the scores of a row written by an older rule", async () => {
    // Rows from before `score_cache_version` cached days whose games had not
    // been played and never revisited them, so they hold zeros for days the
    // season has long since played.
    dbGet.mockResolvedValue({
      id: 7,
      name: "my-pool",
      context: { score_by_day: cachedThrough("2026-12-01") },
    });
    apiGet.mockImplementation(async (path: string) =>
      path.startsWith("/pool/")
        ? { ok: true, data: testPool() }
        : { ok: true, data: scores("2026-10-07") },
    );

    await fetchPoolInfo("my-pool");

    expect(
      apiGet.mock.calls
        .map(([path]) => path as string)
        .find((path) => path.startsWith("/pool-scores/")),
    ).toBe("/pool-scores/my-pool/cumulative/2026-10-07/2026-12-01");
  });

  it("keeps the days it had when the scores cannot be derived", async () => {
    dbGet.mockResolvedValue(cachedRow(scores("2026-10-07")));
    apiGet.mockImplementation(async (path: string) =>
      path.startsWith("/pool/")
        ? { ok: true, data: testPool() }
        : { ok: false, error: "scores are down" },
    );

    const result = (await fetchPoolInfo("my-pool")) as Pool;

    // A pool that renders its history from stale days beats no pool at all.
    expect(Object.keys(result.context!.score_by_day!)).toEqual(["2026-10-07"]);
  });

  it("shares one request between callers asking at the same time", async () => {
    apiGet.mockImplementation(async (path: string) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return path.startsWith("/pool/")
        ? { ok: true, data: testPool() }
        : { ok: true, data: {} };
    });

    const [first, second] = await Promise.all([
      fetchPoolInfo("my-pool"),
      fetchPoolInfo("my-pool"),
    ]);

    expect(first).toBe(second);
    expect(
      apiGet.mock.calls.filter(([path]) => path === "/pool/my-pool"),
    ).toHaveLength(1);
  });
});

interface PoolActions {
  applyPoolBroadcast: (pool: Pool) => void;
  applyDraftDelta: (delta: { PlayerDrafted: PlayerDraftedResponse }) => void;
  updatePoolInfo: (pool: Pool) => void;
}

/*
Reads the pool out of the context and publishes the paths the draft room drives
it through, so a test can push an update the way the socket does. The handle is
handed out from an effect rather than during the render that produced it.
*/
function PoolView({ onReady }: { onReady: (actions: PoolActions) => void }) {
  const { poolInfo, applyPoolBroadcast, applyDraftDelta, updatePoolInfo } =
    usePoolContext();

  React.useEffect(() => {
    onReady({ applyPoolBroadcast, applyDraftDelta, updatePoolInfo });
  }, [onReady, applyPoolBroadcast, applyDraftDelta, updatePoolInfo]);

  return (
    <dl>
      <dt>trades</dt>
      <dd data-testid="nb-trade">{poolInfo.nb_trade}</dd>
      <dd data-testid="date-updated">{poolInfo.date_updated}</dd>
    </dl>
  );
}

describe("PoolContextProvider", () => {
  const renderPool = (pool = testPool({ date_updated: 100, nb_trade: 1 })) => {
    let actions: PoolActions | null = null;
    render(
      <PoolContextProvider pool={pool}>
        <PoolView onReady={(ready) => (actions = ready)} />
      </PoolContextProvider>,
    );
    if (actions === null) {
      throw new Error("the pool context never published its actions");
    }
    return actions as PoolActions;
  };

  it("renders the pool it was given", () => {
    renderPool();

    expect(screen.getByTestId("nb-trade")).toHaveTextContent("1");
  });

  it("takes a broadcast that is newer than the pool on screen", async () => {
    const pool = renderPool();

    await act(async () =>
      pool.applyPoolBroadcast(testPool({ date_updated: 200, nb_trade: 2 })),
    );

    expect(screen.getByTestId("nb-trade")).toHaveTextContent("2");
  });

  it("ignores a broadcast older than the pool on screen", async () => {
    const pool = renderPool();

    // Trades broadcast a whole pool while the draft runs, so one can land out
    // of order next to the pick deltas; applied, it would rewind the board.
    await act(async () =>
      pool.applyPoolBroadcast(testPool({ date_updated: 50, nb_trade: 99 })),
    );

    expect(screen.getByTestId("nb-trade")).toHaveTextContent("1");
  });

  it("refuses a pool that does not hold up", async () => {
    const pool = renderPool();

    await act(async () => pool.updatePoolInfo({ name: "my-pool" } as Pool));

    // The pool on screen is the last one that made sense.
    expect(screen.getByTestId("nb-trade")).toHaveTextContent("1");
  });

  it("refetches the pool when a delta does not fit what it holds", async () => {
    apiGet.mockResolvedValue({ ok: false, error: "pool not found" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const pool = renderPool();

    // The pool holds no picks yet, so a delta that says the draft is five
    // picks deep means this client missed the ones in between.
    await act(async () =>
      pool.applyDraftDelta({
        PlayerDrafted: {
          participant_id: "user-a",
          player: { id: 1, name: "x" },
          roster: {
            chosen_forwards: [],
            chosen_defenders: [],
            chosen_goalies: [],
            chosen_reservists: [],
          },
          appended_picks: [1],
          pick_count: 5,
          status: "InProgress",
        } as unknown as PlayerDraftedResponse,
      }),
    );

    expect(warn).toHaveBeenCalled();
    expect(apiGet).toHaveBeenCalledWith("/pool/my-pool");
    warn.mockRestore();
  });
});
