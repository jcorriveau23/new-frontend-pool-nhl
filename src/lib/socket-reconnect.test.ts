import { describe, expect, it } from "vitest";

import {
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
  reconnectDelay,
} from "./socket-reconnect";

// `random` is injected so the schedule can be pinned to its bounds instead of
// asserted loosely: 0 gives the floor of each window, just under 1 the ceiling.
const lowest = () => 0;
const highest = () => 0.999999;

describe("reconnectDelay", () => {
  it("starts the first retry within a second", () => {
    expect(reconnectDelay(0, lowest)).toBe(RECONNECT_BASE_DELAY_MS / 2);
    expect(reconnectDelay(0, highest)).toBeLessThanOrEqual(
      RECONNECT_BASE_DELAY_MS
    );
  });

  it("doubles the window on each consecutive failure", () => {
    expect(reconnectDelay(1, lowest)).toBe(1_000);
    expect(reconnectDelay(2, lowest)).toBe(2_000);
    expect(reconnectDelay(3, lowest)).toBe(4_000);
  });

  it("holds at the cap instead of growing without bound", () => {
    // A draft left open overnight must still be retrying on a sane interval.
    for (const attempt of [6, 10, 50, 1_000]) {
      expect(reconnectDelay(attempt, highest)).toBeLessThanOrEqual(
        RECONNECT_MAX_DELAY_MS
      );
      expect(reconnectDelay(attempt, lowest)).toBe(RECONNECT_MAX_DELAY_MS / 2);
    }
  });

  it("never returns a delay that would busy-loop", () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      expect(reconnectDelay(attempt, lowest)).toBeGreaterThan(0);
    }
  });

  it("spreads a room of clients that dropped on the same tick", () => {
    // Same attempt number, different random draws: the whole point of the
    // jitter is that these do not collide.
    const delays = new Set(
      Array.from({ length: 50 }, () => reconnectDelay(5))
    );

    expect(delays.size).toBeGreaterThan(1);
  });
});
