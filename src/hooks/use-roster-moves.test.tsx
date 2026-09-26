import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Player, PoolState, Position } from "@/data/pool/model";
import { poolUser, testPlayer, testPool } from "@/test/pool-fixtures";

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

import { useRosterMoves } from "@/hooks/use-roster-moves";

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

const A_PLAYER: Player = testPlayer(9, "Matias Maccelli", Position.F, 900_000);

beforeEach(() => {
  userValue.current = "user-a";
  setPool();
  apiPost.mockResolvedValue({ ok: true, data: testPool() });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useRosterMoves", () => {
  it("puts a player on a pooler's bench", async () => {
    const { result } = renderHook(() => useRosterMoves());

    await act(async () => {
      expect(await result.current.addPlayer("user-b", A_PLAYER)).toBe(true);
    });

    const [path, body, jwt] = apiPost.mock.calls[0];
    expect(path).toBe("/add-player");
    expect(body).toMatchObject({
      pool_name: "my-pool",
      added_player_user_id: "user-b",
      player: { id: 9 },
    });
    expect(jwt).toBe("a-jwt");
    expect(updatePoolInfo).toHaveBeenCalledOnce();
    // The pooler the move was for is named, not the one signed in.
    expect(toastSuccess.mock.calls[0][0]).toContain('"userName":"Bob"');
  });

  it("takes a player off a roster by id", async () => {
    const { result } = renderHook(() => useRosterMoves());

    await act(async () => {
      await result.current.removePlayer("user-a", A_PLAYER);
    });

    const [path, body] = apiPost.mock.calls[0];
    expect(path).toBe("/remove-player");
    expect(body).toMatchObject({
      pool_name: "my-pool",
      removed_player_user_id: "user-a",
      player_id: 9,
    });
    expect(toastSuccess).toHaveBeenCalledOnce();
  });

  it("reports a refused move and leaves the pool alone", async () => {
    apiPost.mockResolvedValue({ ok: false, error: "this player is picked" });
    const { result } = renderHook(() => useRosterMoves());

    await act(async () => {
      expect(await result.current.addPlayer("user-b", A_PLAYER)).toBe(false);
    });

    expect(toastError.mock.calls[0][0]).toContain("this player is picked");
    expect(updatePoolInfo).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("reports which player a move is in flight for, and clears it", async () => {
    // Held open so the pending state can be observed mid-flight.
    let land: (value: unknown) => void = () => {};
    apiPost.mockReturnValue(
      new Promise((resolve) => {
        land = resolve;
      }),
    );
    const { result } = renderHook(() => useRosterMoves());

    expect(result.current.pendingPlayerId).toBeNull();

    act(() => {
      void result.current.removePlayer("user-a", A_PLAYER);
    });
    await waitFor(() => expect(result.current.pendingPlayerId).toBe(9));

    await act(async () => {
      land({ ok: true, data: testPool() });
    });
    expect(result.current.pendingPlayerId).toBeNull();
  });

  it("is the owner's to use, on a running pool", () => {
    const { result, rerender } = renderHook(() => useRosterMoves());
    expect(result.current.canManageRoster).toBe(true);

    // A participant with no rights on the pool.
    userValue.current = "user-b";
    rerender();
    expect(result.current.canManageRoster).toBe(false);

    // The owner, on a pool that is not running any more.
    userValue.current = "user-a";
    setPool({ status: PoolState.Final });
    rerender();
    expect(result.current.canManageRoster).toBe(false);
  });
});
