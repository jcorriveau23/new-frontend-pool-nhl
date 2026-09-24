import { describe, expect, it } from "vitest";

import { PoolState } from "@/data/pool/model";
import { parsePool } from "./schema";

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
  status: PoolState.InProgress,
  context: {
    pooler_roster: {
      a: {
        chosen_forwards: [1],
        chosen_defenders: [],
        chosen_goalies: [],
        chosen_reservists: [],
      },
    },
    players_name_drafted: [1],
    players: { "1": { id: 1, name: "player-1" } },
  },
  season_start: "2026-10-07",
  season_end: "2027-04-15",
  ...overrides,
});

describe("parsePool", () => {
  it("takes a pool the app can read", () => {
    expect(parsePool(pool())?.name).toBe("my-pool");
  });

  it("takes a pool that has no context yet", () => {
    expect(parsePool(pool({ context: null }))).not.toBeNull();
  });

  it("hands back the very document it was given", () => {
    const document = pool();

    expect(parsePool(document)).toBe(document);
  });

  it("takes fields the frontend does not know about yet", () => {
    expect(parsePool(pool({ a_field_added_later: 42 }))).not.toBeNull();
  });

  it("refuses a status that is not a pool state", () => {
    expect(parsePool(pool({ status: "Paused" }))).toBeNull();
  });

  it("refuses a pool missing what the tables read", () => {
    expect(parsePool(pool({ participants: undefined }))).toBeNull();
    expect(parsePool(pool({ season_start: undefined }))).toBeNull();
    expect(parsePool(pool({ settings: { number_poolers: 6 } }))).toBeNull();
  });

  it("refuses a roster that is not one", () => {
    expect(
      parsePool(
        pool({
          context: {
            pooler_roster: { a: { chosen_forwards: "1,2" } },
            players_name_drafted: [],
            players: {},
          },
        }),
      ),
    ).toBeNull();
  });

  it("refuses anything that is not a document at all", () => {
    expect(parsePool(null)).toBeNull();
    expect(parsePool("<html>502 Bad Gateway</html>")).toBeNull();
    expect(parsePool([])).toBeNull();
  });
});
