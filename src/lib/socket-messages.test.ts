import { describe, expect, it } from "vitest";

import { PoolState } from "@/data/pool/model";
import { classifySocketMessage } from "./socket-messages";

const pool = (overrides: Record<string, unknown> = {}) => ({
  name: "my-pool",
  owner: "owner",
  participants: [{ id: "a", name: "Alice", is_owned: true }],
  settings: {
    number_poolers: 6,
    number_forwards: 9,
    number_defenders: 4,
    number_goalies: 2,
    number_reservists: 0,
    salary_cap: null,
    assistants: [],
  },
  status: PoolState.Draft,
  context: null,
  season_start: "2026-10-07",
  season_end: "2027-04-15",
  ...overrides,
});

const roomUser = {
  id: "a",
  name: "Alice",
  email: null,
  is_ready: true,
};

describe("classifySocketMessage", () => {
  it("recognises a pool broadcast and hands the pool over", () => {
    const message = classifySocketMessage({ Pool: { pool: pool() } });

    expect(message.kind).toBe("pool");
    expect(message.kind === "pool" && message.pool?.name).toBe("my-pool");
  });

  it("reports a broadcast whose pool does not hold up", () => {
    const message = classifySocketMessage({
      Pool: { pool: { name: "my-pool", status: "NotAState" } },
    });

    expect(message).toEqual({ kind: "pool", pool: null });
  });

  it("keeps the fields the schema does not name", () => {
    const message = classifySocketMessage({
      Pool: { pool: pool({ a_field_added_later: 42 }) },
    });

    expect(
      message.kind === "pool" &&
        (message.pool as unknown as Record<string, unknown>)
          .a_field_added_later,
    ).toBe(42);
  });

  it("recognises each of the three draft deltas", () => {
    for (const key of ["PlayerDrafted", "DraftPickUndone", "RosterModified"]) {
      const frame = { [key]: { anything: true } };

      expect(classifySocketMessage(frame)).toEqual({
        kind: "draft-delta",
        delta: frame,
      });
    }
  });

  it("recognises the room users", () => {
    const message = classifySocketMessage({
      Users: { room_users: { a: roomUser } },
    });

    expect(message).toEqual({ kind: "users", roomUsers: { a: roomUser } });
  });

  it("ignores a frame it does not understand", () => {
    expect(classifySocketMessage({ Something: {} }).kind).toBe("unknown");
    expect(classifySocketMessage({ Users: { room_users: [1] } }).kind).toBe(
      "unknown",
    );
    expect(classifySocketMessage("a string").kind).toBe("unknown");
    expect(classifySocketMessage(null).kind).toBe("unknown");
  });
});
