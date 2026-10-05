import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PoolState } from "@/data/pool/model";
import { poolUser, testPool } from "@/test/pool-fixtures";

const apiPost = vi.fn();
const updatePoolInfo = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

const contextValue = vi.hoisted(() => ({ current: {} as object }));
const userValue = vi.hoisted(() => ({
  current: "user-a" as string | undefined,
}));

vi.mock("@/context/pool-context", async () => {
  const { hasPoolPrivilege } = await import("@/lib/pool-roster");
  return { usePoolContext: () => contextValue.current, hasPoolPrivilege };
});

vi.mock("@/context/useSessionData", () => ({
  useSession: () => ({ info: { jwt: "a-jwt" } }),
}));

vi.mock("@/context/useUserData", () => ({
  useUser: () => ({ info: { id: userValue.current } }),
}));

vi.mock("@/lib/client-api", () => ({
  apiPost: (...args: unknown[]) => apiPost(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

import { eventKey, useLineupEvents } from "@/hooks/use-lineup-events";

const ALICE = poolUser("user-a", "Alice");
const BOB = poolUser("user-b", "Bob");

// Only the fields the hook reads: the pool it files against, the poolers it
// names in a toast, and the callback it hands the updated pool to.
const setPool = (overrides: Parameters<typeof testPool>[0] = {}) => {
  const poolInfo = testPool(overrides);
  contextValue.current = {
    poolInfo,
    updatePoolInfo,
    dictUsers: { [ALICE.id]: ALICE, [BOB.id]: BOB },
  };
  return poolInfo;
};

beforeEach(() => {
  // The fixture season runs from 2026-10-07, so the day has to be pinned: a
  // real date drifting past opening night would change the range on offer.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-10T09:00:00"));
  userValue.current = "user-a";
  setPool();
  apiPost.mockResolvedValue({ ok: true, data: testPool() });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useLineupEvents", () => {
  describe("canEdit", () => {
    it("lets the owner edit the history", () => {
      const { result } = renderHook(() => useLineupEvents());

      expect(result.current.canEdit).toBe(true);
    });

    it("keeps a pooler out of it", () => {
      // Editing the events rewrites days already scored, so it is not a
      // pooler's to do even on their own lineup.
      userValue.current = "user-b";
      const { result } = renderHook(() => useLineupEvents());

      expect(result.current.canEdit).toBe(false);
    });

    it("refuses on a pool that is not running", () => {
      setPool({ status: PoolState.Final });
      const { result } = renderHook(() => useLineupEvents());

      expect(result.current.canEdit).toBe(false);
    });
  });

  describe("backdateRange", () => {
    it("runs from opening night to the day it is edited on", () => {
      const { result } = renderHook(() => useLineupEvents());

      expect(result.current.backdateRange).toMatchObject({
        earliestDate: "2026-10-07",
        latestDate: "2026-11-10",
        canBackdate: true,
      });
    });
  });

  describe("reDate", () => {
    it("names both days and hands back the updated pool", async () => {
      const { result } = renderHook(() => useLineupEvents());

      await act(async () => {
        expect(
          await result.current.reDate("user-a", "2026-11-10", "2026-10-07"),
        ).toBe(true);
      });

      const [path, body, jwt] = apiPost.mock.calls[0];
      expect(path).toBe("/update-lineup-event");
      expect(body).toEqual({
        pool_name: "my-pool",
        participant_id: "user-a",
        from_date: "2026-11-10",
        to_date: "2026-10-07",
      });
      expect(jwt).toBe("a-jwt");
      expect(updatePoolInfo).toHaveBeenCalledOnce();
      // The pooler the event belongs to is named, not the one signed in.
      expect(toastSuccess.mock.calls[0][0]).toContain('"userName":"Alice"');
      expect(result.current.pendingEvent).toBeNull();
    });

    it("reports a refused edit and leaves the pool alone", async () => {
      apiPost.mockResolvedValue({ ok: false, error: "opening night" });
      const { result } = renderHook(() => useLineupEvents());

      await act(async () => {
        expect(
          await result.current.reDate("user-a", "2026-10-07", "2026-11-01"),
        ).toBe(false);
      });

      expect(updatePoolInfo).not.toHaveBeenCalled();
      expect(toastError.mock.calls[0][0]).toContain('"error":"opening night"');
      expect(result.current.pendingEvent).toBeNull();
    });
  });

  describe("drop", () => {
    it("leaves the day out, which is what tells the two edits apart", async () => {
      const { result } = renderHook(() => useLineupEvents());

      await act(async () => {
        expect(await result.current.drop("user-b", "2026-11-01")).toBe(true);
      });

      const [, body] = apiPost.mock.calls[0];
      expect(body).toEqual({
        pool_name: "my-pool",
        participant_id: "user-b",
        from_date: "2026-11-01",
      });
      expect(body).not.toHaveProperty("to_date");
      expect(toastSuccess.mock.calls[0][0]).toContain('"userName":"Bob"');
    });

    it("reports a refused drop", async () => {
      apiPost.mockResolvedValue({ ok: false, error: "no event there" });
      const { result } = renderHook(() => useLineupEvents());

      await act(async () => {
        expect(await result.current.drop("user-a", "2026-10-20")).toBe(false);
      });

      expect(updatePoolInfo).not.toHaveBeenCalled();
      expect(toastError.mock.calls[0][0]).toContain('"error":"no event there"');
    });
  });

  it("marks only the event an edit is in flight for", async () => {
    let resolveCall: (value: unknown) => void = () => {};
    apiPost.mockReturnValue(
      new Promise((resolve) => {
        resolveCall = resolve;
      }),
    );
    const { result } = renderHook(() => useLineupEvents());

    let pending: Promise<boolean> = Promise.resolve(false);
    act(() => {
      pending = result.current.drop("user-a", "2026-11-01");
    });

    // Keyed by pooler and day, so one row spins without locking the others.
    expect(result.current.pendingEvent).toBe(eventKey("user-a", "2026-11-01"));

    await act(async () => {
      resolveCall({ ok: true, data: testPool() });
      await pending;
    });

    expect(result.current.pendingEvent).toBeNull();
  });
});
