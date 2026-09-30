import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DropPeriod, Player, PoolState, Position } from "@/data/pool/model";
import {
  testPlayer,
  testPool,
  testPoolContext,
  testSettings,
} from "@/test/pool-fixtures";

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

import { useWaiverClaim } from "@/hooks/use-waiver-claim";

const ONE_DROP_A_SEASON = { max_drops: 1, period: DropPeriod.SEASON };

// Alice (user-a) holds players 1 to 5; the pool has free agency unless a test
// says otherwise.
const setPool = (
  overrides: Parameters<typeof testPool>[0] = {},
  playersOwner: Record<number, string> = {},
) => {
  const poolInfo = testPool({
    settings: testSettings({ player_drop_settings: ONE_DROP_A_SEASON }),
    ...overrides,
  });
  contextValue.current = testPoolContext(poolInfo, {
    updatePoolInfo,
    playersOwner,
  });
  return poolInfo;
};

const DROPPED: Player = testPlayer(2, "John Tavares", Position.F, 11_000_000);
const FREE_AGENT: Player = testPlayer(9, "Matias Maccelli", Position.F);

beforeEach(() => {
  // Mid-season, so the effective date is tomorrow and inside the season.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-10T12:00:00"));
  userValue.current = "user-a";
  setPool();
  apiPost.mockResolvedValue({ ok: true, data: testPool() });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useWaiverClaim", () => {
  describe("canClaim", () => {
    it("lets a pooler claim on their own roster", () => {
      const { result } = renderHook(() => useWaiverClaim("user-a"));

      expect(result.current.canClaim).toBe(true);
      expect(result.current.blockedReason).toBeNull();
    });

    it("keeps a pooler off someone else's roster", () => {
      userValue.current = "user-b";
      const { result } = renderHook(() => useWaiverClaim("user-a"));

      expect(result.current.canClaim).toBe(false);
    });

    it("lets the owner claim on anyone's roster", () => {
      const { result } = renderHook(() => useWaiverClaim("user-b"));

      expect(result.current.canClaim).toBe(true);
    });

    it("refuses on a pool without free agency", () => {
      setPool({ settings: testSettings() });
      const { result } = renderHook(() => useWaiverClaim("user-a"));

      expect(result.current.budget.isEnabled).toBe(false);
      expect(result.current.canClaim).toBe(false);
    });

    it("refuses on a pool that is not running", () => {
      setPool({ status: PoolState.Final });
      const { result } = renderHook(() => useWaiverClaim("user-a"));

      expect(result.current.canClaim).toBe(false);
    });
  });

  describe("blockedReason", () => {
    it("says so once the budget is spent", () => {
      const pool = testPool();
      setPool({
        context: {
          ...pool.context!,
          roster_transactions: [
            {
              participant: "user-a",
              effective_date: "2026-10-20",
              dropped_player_id: 7,
              added_player_id: 8,
              date_created: 0,
            },
          ],
        },
      });
      const { result } = renderHook(() => useWaiverClaim("user-a"));

      expect(result.current.budget.remaining).toBe(0);
      expect(result.current.blockedReason).toBe("NoDropLeft");
    });

    it("says so once the season is over", () => {
      vi.setSystemTime(new Date("2027-05-01T12:00:00"));
      const { result } = renderHook(() => useWaiverClaim("user-a"));

      expect(result.current.blockedReason).toBe("FreeAgencyClosedForTheSeason");
    });
  });

  describe("replacementUnavailableReason", () => {
    it("accepts an undrafted player", () => {
      const { result } = renderHook(() => useWaiverClaim("user-a"));

      act(() => result.current.setPlayerToDrop(DROPPED));

      expect(
        result.current.replacementUnavailableReason(FREE_AGENT),
      ).toBeNull();
    });

    it("names the pooler holding a drafted player", () => {
      setPool({}, { [FREE_AGENT.id]: "Bob" });
      const { result } = renderHook(() => useWaiverClaim("user-a"));

      expect(result.current.replacementUnavailableReason(FREE_AGENT)).toBe(
        'PlayerHeldBy:{"userName":"Bob"}',
      );
    });

    it("refuses a player the roster has no spot for", () => {
      // A full bench and a goalie dropped for a forward: the forward line is
      // already full, so the newcomer has nowhere to go.
      setPool({
        settings: testSettings({
          player_drop_settings: ONE_DROP_A_SEASON,
          number_reservists: 1,
        }),
      });
      const { result } = renderHook(() => useWaiverClaim("user-a"));

      act(() =>
        result.current.setPlayerToDrop(
          testPlayer(4, "Joseph Woll", Position.G),
        ),
      );

      expect(result.current.replacementUnavailableReason(FREE_AGENT)).toBe(
        "NoRoomForPlayer",
      );
    });
  });

  describe("claim", () => {
    it("does nothing without a player to drop", async () => {
      const { result } = renderHook(() => useWaiverClaim("user-a"));

      await act(async () => {
        expect(await result.current.claim(FREE_AGENT)).toBe(false);
      });

      expect(apiPost).not.toHaveBeenCalled();
    });

    it("files the swap and closes the search", async () => {
      const { result } = renderHook(() => useWaiverClaim("user-a"));
      act(() => result.current.setPlayerToDrop(DROPPED));

      await act(async () => {
        expect(await result.current.claim(FREE_AGENT)).toBe(true);
      });

      const [path, body, jwt] = apiPost.mock.calls[0];
      expect(path).toBe("/drop-add-player");
      expect(body).toMatchObject({
        pool_name: "my-pool",
        participant_id: "user-a",
        dropped_player_id: 2,
        added_player: { id: 9 },
      });
      expect(jwt).toBe("a-jwt");
      expect(updatePoolInfo).toHaveBeenCalledOnce();
      expect(toastSuccess.mock.calls[0][0]).toContain(
        '"droppedPlayerName":"John Tavares"',
      );
      expect(result.current.playerToDrop).toBeNull();
      expect(result.current.isClaiming).toBe(false);
    });

    it("reports a refused swap and keeps the search open", async () => {
      apiPost.mockResolvedValue({ ok: false, error: "budget spent" });
      const { result } = renderHook(() => useWaiverClaim("user-a"));
      act(() => result.current.setPlayerToDrop(DROPPED));

      await act(async () => {
        expect(await result.current.claim(FREE_AGENT)).toBe(false);
      });

      expect(updatePoolInfo).not.toHaveBeenCalled();
      expect(toastError.mock.calls[0][0]).toContain('"error":"budget spent"');
      expect(result.current.playerToDrop).toEqual(DROPPED);
      expect(result.current.isClaiming).toBe(false);
    });

    it("clears the in-flight flag when the request throws", async () => {
      apiPost.mockRejectedValue(new Error("network down"));
      const { result } = renderHook(() => useWaiverClaim("user-a"));
      act(() => result.current.setPlayerToDrop(DROPPED));

      await act(async () => {
        await expect(result.current.claim(FREE_AGENT)).rejects.toThrow(
          "network down",
        );
      });

      expect(result.current.isClaiming).toBe(false);
    });
  });
});
