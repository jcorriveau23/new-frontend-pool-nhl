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

const scores = (day: string) => ({
  [day]: { "user-a": { roster: {}, points: 1 } },
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
    expect(dbPut).toHaveBeenCalledWith(result, "name");
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
    dbGet.mockResolvedValue({
      id: 7,
      name: "my-pool",
      context: {
        score_by_day: {
          ...scores("2026-10-07"),
          ...scores("2026-10-08"),
        },
      },
    });
    apiGet.mockImplementation(async (path: string) =>
      path.startsWith("/pool/")
        ? { ok: true, data: testPool() }
        : { ok: true, data: scores("2026-10-08") },
    );

    const result = (await fetchPoolInfo("my-pool")) as Pool;

    const scorePath = apiGet.mock.calls
      .map(([path]) => path as string)
      .find((path) => path.startsWith("/pool-scores/"))!;
    // The last cached day is asked for again: it may have been stored while
    // its games were still being played.
    // From the last cached day (it may have been stored mid-game) to today.
    expect(scorePath).toBe(
      "/pool-scores/my-pool/cumulative/2026-10-08/2026-12-01",
    );
    expect(Object.keys(result.context!.score_by_day!).sort()).toEqual([
      "2026-10-07",
      "2026-10-08",
    ]);
    // The row id is carried over so the write updates in place.
    expect(result.id).toBe(7);
  });

  it("keeps the days it had when the scores cannot be derived", async () => {
    dbGet.mockResolvedValue({
      id: 7,
      name: "my-pool",
      context: { score_by_day: scores("2026-10-07") },
    });
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
