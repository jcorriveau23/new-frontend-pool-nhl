import { describe, expect, it } from "vitest";

import { Pool, PoolUser } from "@/data/pool/model";
import {
  findLastScoredDate,
  getPlayersOwner,
  getProtectedPlayers,
  hasPoolPrivilege,
} from "./pool-roster";

const user = (id: string, name: string): PoolUser =>
  ({ id, name }) as PoolUser;

const roster = (
  forwards: number[] = [],
  defenders: number[] = [],
  goalies: number[] = [],
  reservists: number[] = []
) => ({
  chosen_forwards: forwards,
  chosen_defenders: defenders,
  chosen_goalies: goalies,
  chosen_reservists: reservists,
});

// Only the fields these functions read. The real Pool carries far more, none of
// which changes their behaviour.
const pool = (overrides: Record<string, unknown> = {}): Pool =>
  ({
    owner: "owner-id",
    settings: { assistants: [] },
    participants: [],
    context: null,
    ...overrides,
  }) as unknown as Pool;

describe("getPlayersOwner", () => {
  it("maps every position, reservists included, to the pooler holding them", () => {
    const result = getPlayersOwner(
      pool({
        participants: [user("a", "Alex"), user("b", "Sam")],
        context: {
          pooler_roster: {
            a: roster([1, 2], [3], [4], [5]),
            b: roster([6], [7], [8], [9]),
          },
        },
      })
    );

    expect(result).toEqual({
      1: "Alex",
      2: "Alex",
      3: "Alex",
      4: "Alex",
      5: "Alex",
      6: "Sam",
      7: "Sam",
      8: "Sam",
      9: "Sam",
    });
  });

  it("returns nothing when the pool has no draft context yet", () => {
    expect(
      getPlayersOwner(pool({ participants: [user("a", "Alex")] }))
    ).toEqual({});
  });

  it("skips a participant with no roster entry instead of throwing", () => {
    // `participants` and `pooler_roster` are separate fields and are not always
    // in step — a pooler added before the draft exists in one and not the
    // other. This used to throw and take the whole pool page down.
    const result = getPlayersOwner(
      pool({
        participants: [user("a", "Alex"), user("ghost", "Nobody")],
        context: { pooler_roster: { a: roster([1]) } },
      })
    );

    expect(result).toEqual({ 1: "Alex" });
  });

  it("survives a roster missing a position list", () => {
    const result = getPlayersOwner(
      pool({
        participants: [user("a", "Alex")],
        context: {
          pooler_roster: {
            a: { chosen_forwards: [1] } as never,
          },
        },
      })
    );

    expect(result).toEqual({ 1: "Alex" });
  });
});

describe("getProtectedPlayers", () => {
  const dictUsers = { a: user("a", "Alex"), b: user("b", "Sam") };

  it("names the pooler protecting each player", () => {
    const result = getProtectedPlayers(
      pool({ context: { protected_players: { a: [1, 2], b: [3] } } }),
      dictUsers
    );

    expect(result).toEqual({ 1: "Alex", 2: "Alex", 3: "Sam" });
  });

  it("returns null for a pool with no protection round", () => {
    // A standard (non-dynasty) pool. Null is meaningful here: the UI uses it to
    // hide the protection column entirely rather than show it empty.
    expect(
      getProtectedPlayers(pool({ context: { protected_players: null } }), dictUsers)
    ).toBeNull();
    expect(getProtectedPlayers(pool(), dictUsers)).toBeNull();
  });

  it("skips a protected list belonging to a departed pooler", () => {
    // Dynasty pools carry protection lists across seasons, so the list can name
    // someone who is no longer a participant.
    const result = getProtectedPlayers(
      pool({ context: { protected_players: { a: [1], gone: [2] } } }),
      dictUsers
    );

    expect(result).toEqual({ 1: "Alex" });
  });
});

describe("findLastScoredDate", () => {
  it("returns the latest day, not the last key inserted", () => {
    // `score_by_day` is an object merged from a cache and a response, so its
    // key order does not follow the calendar.
    expect(
      findLastScoredDate(
        pool({
          context: {
            score_by_day: {
              "2025-12-01": {},
              "2026-01-15": {},
              "2025-10-20": {},
            },
          },
        })
      )
    ).toBe("2026-01-15");
  });

  it("returns null when there is nothing scored yet", () => {
    expect(findLastScoredDate(null)).toBeNull();
    expect(findLastScoredDate(pool())).toBeNull();
    expect(
      findLastScoredDate(pool({ context: { score_by_day: null } }))
    ).toBeNull();
  });

  it("returns null for an empty score map rather than undefined", () => {
    // The caller treats null as "no scores" and falls back to today; undefined
    // would leak into a date string.
    expect(
      findLastScoredDate(pool({ context: { score_by_day: {} } }))
    ).toBeNull();
  });
});

describe("hasPoolPrivilege", () => {
  const p = pool({
    owner: "owner-id",
    settings: { assistants: ["helper-id"] },
  });

  it("grants the owner", () => {
    expect(hasPoolPrivilege("owner-id", p)).toBe(true);
  });

  it("grants an assistant", () => {
    expect(hasPoolPrivilege("helper-id", p)).toBe(true);
  });

  it("refuses anybody else", () => {
    expect(hasPoolPrivilege("stranger", p)).toBe(false);
  });

  it("refuses a signed-out visitor", () => {
    expect(hasPoolPrivilege(undefined, p)).toBe(false);
  });

  it("refuses a signed-out visitor even if the assistants list holds an empty string", () => {
    // The previous implementation compared `user ?? ""` against the list, so a
    // stray empty entry — which the settings form can produce — handed pool
    // privilege to every visitor.
    expect(
      hasPoolPrivilege(
        undefined,
        pool({ settings: { assistants: [""] } })
      )
    ).toBe(false);
  });
});
