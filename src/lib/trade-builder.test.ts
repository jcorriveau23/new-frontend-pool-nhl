import { describe, expect, it } from "vitest";

import {
  DraftPick,
  Pool,
  PoolState,
  PoolUser,
  Trade,
  TradeStatus,
} from "@/data/pool/model";
import {
  buildTrade,
  findTradeIssue,
  initialTradeSelection,
  manageableParticipants,
  selectedPicksFor,
  toggleInSet,
} from "./trade-builder";

const user = (id: string): PoolUser =>
  ({ id, name: `pooler-${id}`, is_owned: true }) as PoolUser;

const pick = (round: number, from: string): DraftPick =>
  ({ round, from }) as DraftPick;

// Only what these rules read: the participants, the owner and the picks.
const pool = (overrides: Partial<Pool> = {}): Pool =>
  ({
    name: "my-pool",
    owner: "owner",
    participants: [user("a"), user("b"), user("c")],
    settings: { assistants: [], dynasty_settings: { tradable_picks: 1 } },
    context: { past_tradable_picks: [] },
    ...overrides,
  }) as unknown as Pool;

const trade = (overrides: Partial<Trade> = {}): Trade =>
  ({
    id: 7,
    proposed_by: "b",
    ask_to: "c",
    from_items: { players: [1, 2], picks: [pick(1, "b")] },
    to_items: { players: [3], picks: [] },
    date_created: 0,
    status: TradeStatus.Open,
    effective_date: "2026-12-01",
    draft_pick_index: null,
    ...overrides,
  }) as Trade;

const today = new Date("2026-11-15T09:00:00");

describe("manageableParticipants", () => {
  it("gives a regular pooler only their own team", () => {
    expect(manageableParticipants(pool(), "a").map((p) => p.id)).toEqual(["a"]);
  });

  it("gives the owner every team", () => {
    expect(
      manageableParticipants(pool({ owner: "a" }), "a").map((p) => p.id),
    ).toEqual(["a", "b", "c"]);
  });

  it("gives a visitor no team at all", () => {
    expect(manageableParticipants(pool(), undefined)).toEqual([]);
  });
});

describe("initialTradeSelection", () => {
  const participants = [user("a")];

  it("opens an existing trade on exactly what it says", () => {
    const selection = initialTradeSelection(
      pool(),
      participants,
      "a",
      trade(),
      null,
      today,
    );

    expect(selection.fromPoolerId).toBe("b");
    expect(selection.toPoolerId).toBe("c");
    expect([...selection.fromPlayers]).toEqual([1, 2]);
    expect([...selection.fromPicks]).toEqual(["1-b"]);
    expect([...selection.toPlayers]).toEqual([3]);
    expect(selection.effectiveDate).toEqual(new Date("2026-12-01T00:00:00"));
  });

  it("falls back to today for a trade filed without a date", () => {
    const selection = initialTradeSelection(
      pool(),
      participants,
      "a",
      trade({ effective_date: null }),
      null,
      today,
    );

    expect(selection.effectiveDate).toEqual(today);
  });

  it("puts the user's own team on the proposing side", () => {
    const selection = initialTradeSelection(
      pool(),
      participants,
      "a",
      null,
      null,
      today,
    );

    expect(selection.fromPoolerId).toBe("a");
    expect(selection.toPoolerId).toBe("b");
    expect(selection.fromPlayers.size).toBe(0);
  });

  it("puts an asset of their own on their side", () => {
    const selection = initialTradeSelection(
      pool(),
      participants,
      "a",
      null,
      { poolerId: "a", playerId: 42 },
      today,
    );

    expect(selection.fromPoolerId).toBe("a");
    expect([...selection.fromPlayers]).toEqual([42]);
    expect(selection.toPlayers.size).toBe(0);
  });

  it("puts somebody else's asset on the partner side", () => {
    const selection = initialTradeSelection(
      pool(),
      participants,
      "a",
      null,
      { poolerId: "c", playerId: 42 },
      today,
    );

    expect(selection.fromPoolerId).toBe("a");
    expect(selection.toPoolerId).toBe("c");
    expect([...selection.toPlayers]).toEqual([42]);
  });

  it("selects a pick the dialog was opened on", () => {
    const selection = initialTradeSelection(
      pool(),
      participants,
      "a",
      null,
      { poolerId: "c", pick: pick(2, "c") },
      today,
    );

    expect([...selection.toPicks]).toEqual(["2-c"]);
  });

  it("leaves both sides empty when nobody manages a team", () => {
    const selection = initialTradeSelection(
      pool({ participants: [] }),
      [],
      undefined,
      null,
      null,
      today,
    );

    expect(selection.fromPoolerId).toBe("");
    expect(selection.toPoolerId).toBe("");
  });
});

describe("toggleInSet", () => {
  it("adds a value that is not selected, and removes one that is", () => {
    expect([...toggleInSet(new Set([1]), 2)]).toEqual([1, 2]);
    expect([...toggleInSet(new Set([1, 2]), 1)]).toEqual([2]);
  });

  it("leaves the set it was given alone", () => {
    const selected = new Set([1]);
    toggleInSet(selected, 2);

    expect([...selected]).toEqual([1]);
  });
});

describe("findTradeIssue", () => {
  const poolers = { fromPooler: user("a"), toPooler: user("b") };

  it("takes a trade with both sides and an asset", () => {
    expect(
      findTradeIssue({ isSignedIn: true, ...poolers, selectedCount: 1 }),
    ).toBeNull();
  });

  it("refuses a visitor before anything else", () => {
    expect(
      findTradeIssue({ isSignedIn: false, ...poolers, selectedCount: 0 }),
    ).toBe("not-signed-in");
  });

  it("stays quiet while a side names no pooler", () => {
    expect(
      findTradeIssue({
        isSignedIn: true,
        fromPooler: user("a"),
        toPooler: undefined,
        selectedCount: 1,
      }),
    ).toBe("incomplete");
  });

  it("refuses a pooler trading with themselves", () => {
    expect(
      findTradeIssue({
        isSignedIn: true,
        fromPooler: user("a"),
        toPooler: user("a"),
        selectedCount: 1,
      }),
    ).toBe("same-pooler");
  });

  it("refuses a trade with nothing in it", () => {
    expect(
      findTradeIssue({ isSignedIn: true, ...poolers, selectedCount: 0 }),
    ).toBe("no-assets");
  });
});

describe("selectedPicksFor and buildTrade", () => {
  // A running pool trades next season's picks, each still owned by the pooler
  // it belongs to. Same shape as the pool-picks tests build.
  const poolWithPicks = pool({
    status: PoolState.InProgress,
    draft_order: ["a", "b", "c"],
    context: {
      tradable_picks: [
        { a: "a", b: "b", c: "c" },
        { a: "a", b: "b", c: "c" },
      ],
      past_tradable_picks: [],
      players_name_drafted: [],
    },
  } as unknown as Partial<Pool>);

  it("turns the selected keys back into pick documents", () => {
    const picks = selectedPicksFor(poolWithPicks, "a", new Set(["0-a", "1-a"]));

    expect(picks.map((p) => `${p.round}-${p.from}`).sort()).toEqual([
      "0-a",
      "1-a",
    ]);
  });

  it("builds a new trade with both sides and no id", () => {
    const built = buildTrade({
      poolInfo: poolWithPicks,
      fromPoolerId: "a",
      toPoolerId: "b",
      fromPlayers: new Set([10, 11]),
      toPlayers: new Set([20]),
      fromPicks: new Set(["0-a"]),
      toPicks: new Set(),
      effectiveDate: "2026-12-24",
    });

    expect(built).toMatchObject({
      proposed_by: "a",
      ask_to: "b",
      id: 0,
      status: TradeStatus.Open,
      effective_date: "2026-12-24",
      draft_pick_index: null,
    });
    expect(built.from_items.players).toEqual([10, 11]);
    expect(built.from_items.picks).toHaveLength(1);
    expect(built.to_items.picks).toEqual([]);
  });

  it("keeps the id of the trade being replaced", () => {
    const built = buildTrade({
      poolInfo: poolWithPicks,
      fromPoolerId: "a",
      toPoolerId: "b",
      fromPlayers: new Set(),
      toPlayers: new Set(),
      fromPicks: new Set(),
      toPicks: new Set(),
      effectiveDate: null,
      editingTradeId: 12,
    });

    expect(built.id).toBe(12);
    expect(built.effective_date).toBeNull();
  });
});
