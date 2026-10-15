import { describe, expect, it } from "vitest";

import { Pool, PoolState } from "@/data/pool/model";
import {
  buildDraftBoard,
  buildDraftRounds,
  draftedPlayerAt,
  flattenDraftBoard,
  hasDraftBoard,
  picksMade,
  playersToDraft,
} from "./draft-board";

const ORDER = ["alice", "bob", "cat"];

// Only the fields the board reads. A roster of one forward and one goalie, so
// two rounds fill it and the arithmetic stays checkable by eye.
const pool = (
  overrides: {
    draftOrder?: string[] | null;
    drafted?: number[];
    players?: Record<string, { id: number; name: string }>;
    pastTradablePicks?: Record<string, string>[] | null;
    protected?: number | null;
    reservists?: number;
    status?: PoolState;
    poolers?: number;
  } = {},
): Pool =>
  ({
    name: "les-boys",
    status: overrides.status ?? PoolState.Draft,
    draft_order:
      overrides.draftOrder === undefined ? ORDER : overrides.draftOrder,
    nb_player_drafted: (overrides.drafted ?? []).length,
    participants: ORDER.map((id) => ({ id, name: id, is_owned: true })),
    settings: {
      number_poolers: overrides.poolers ?? ORDER.length,
      number_forwards: 1,
      number_defenders: 0,
      number_goalies: 1,
      number_reservists: overrides.reservists ?? 0,
      dynasty_settings:
        overrides.protected === undefined || overrides.protected === null
          ? null
          : {
              next_season_number_players_protected: overrides.protected,
              tradable_picks: 2,
              past_season_pool_name: [],
              next_season_pool_name: null,
            },
    },
    context: {
      players_name_drafted: overrides.drafted ?? [],
      players: overrides.players ?? {},
      past_tradable_picks: overrides.pastTradablePicks ?? null,
    },
  }) as unknown as Pool;

const drafters = (rounds: ReturnType<typeof buildDraftRounds>) =>
  rounds.map((round) => round.picks.map((pick) => pick.drafter));

describe("playersToDraft", () => {
  it("counts the whole roster, bench included", () => {
    expect(playersToDraft(pool({ reservists: 3 }))).toBe(5);
  });

  it("leaves out the players a dynasty pool let its poolers keep", () => {
    expect(playersToDraft(pool({ reservists: 3, protected: 2 }))).toBe(3);
  });
});

describe("buildDraftRounds", () => {
  it("reverses the order on every other round", () => {
    expect(drafters(buildDraftRounds(pool()))).toEqual([
      ["alice", "bob", "cat"],
      ["cat", "bob", "alice"],
    ]);
  });

  it("lays out exactly as many rounds as it takes to fill every roster", () => {
    expect(buildDraftRounds(pool({ reservists: 2 }))).toHaveLength(4);
  });

  /*
  Serpentine is applied whatever `draft_type` says, which is what the draft
  screen has always drawn — the board was lifted out of it unchanged rather
  than corrected on the way. A pool set to Standard is therefore drawn as a
  serpentine, and whether that matches the order the backend actually plays is
  a question for the backend, not for this extraction.
  */
  it("snakes a Standard pool too, as the screen it came from always has", () => {
    const standard = pool();
    standard.settings.draft_type = "Standard" as never;

    expect(drafters(buildDraftRounds(standard))[1]).toEqual([
      "cat",
      "bob",
      "alice",
    ]);
  });

  it("has no board for a pool with no draft order or no context", () => {
    expect(buildDraftRounds(pool({ draftOrder: null }))).toEqual([]);
    const contextless = pool();
    contextless.context = null;
    expect(buildDraftRounds(contextless)).toEqual([]);
  });

  it("has no board for a pool whose rosters need nobody drafted", () => {
    expect(buildDraftRounds(pool({ protected: 2 }))).toEqual([]);
  });

  describe("a dynasty pool, whose picks have been tradable since last season", () => {
    // Alice bought Bob's first-rounder, so she picks twice in round one and
    // Bob not at all.
    const tradedFirstRound = [
      { alice: "alice", bob: "alice", cat: "cat" },
      { alice: "alice", bob: "bob", cat: "cat" },
    ];

    it("plays each slot of the order with whoever owns that pick now", () => {
      const rounds = buildDraftRounds(
        pool({ pastTradablePicks: tradedFirstRound, protected: 0 }),
      );

      expect(drafters(rounds)[0]).toEqual(["alice", "alice", "cat"]);
    });

    it("says which pooler an acquired pick came from, and nothing for an own pick", () => {
      const [firstRound] = buildDraftRounds(
        pool({ pastTradablePicks: tradedFirstRound, protected: 0 }),
      );

      expect(firstRound.picks.map((pick) => pick.from)).toEqual([
        null,
        "bob",
        null,
      ]);
    });

    it("keeps the draft order itself past the rounds that were tradable", () => {
      const rounds = buildDraftRounds(
        pool({
          pastTradablePicks: [tradedFirstRound[0]],
          protected: 0,
          reservists: 1,
        }),
      );

      // Round two onwards is nobody's to trade, so it is the plain order and
      // is not reversed.
      expect(drafters(rounds)[1]).toEqual(ORDER);
    });

    /*
    Alice bought both of Bob's picks, so the two tradable rounds hand her four
    players and Bob none. The draft then keeps going until Bob's roster is
    full too — and every slot it lays out for somebody who is already over
    their two players is marked rather than played.
    */
    it("marks a pick that falls to a pooler whose roster is already full", () => {
      const rounds = buildDraftRounds(
        pool({
          pastTradablePicks: [
            { alice: "alice", bob: "alice", cat: "cat" },
            { alice: "alice", bob: "alice", cat: "cat" },
          ],
          protected: 0,
        }),
      );
      const skipped = rounds
        .flatMap((round) => round.picks)
        .filter((pick) => pick.done === true);

      expect(rounds).toHaveLength(4);
      expect(skipped.map((pick) => pick.drafter)).toEqual([
        "alice",
        "cat",
        "alice",
        "cat",
      ]);
    });

    /*
    A pool naming an owner who is not in it counts picks towards nobody, so no
    round ever fills a roster. It used to meet that by looping until the tab
    stopped responding; it stops at the ceiling instead.
    */
    it("stops rather than looping forever on a pick owned by nobody", () => {
      const rounds = buildDraftRounds(
        pool({
          pastTradablePicks: Array.from({ length: 400 }, () => ({
            alice: "ghost",
            bob: "ghost",
            cat: "ghost",
          })),
          protected: 0,
        }),
      );

      expect(rounds).toHaveLength(200);
    });
  });
});

describe("picksMade and draftedPlayerAt", () => {
  const players = { "17": { id: 17, name: "Suzuki" } };

  it("counts the position in the draft, skipped slots included", () => {
    expect(picksMade(pool({ drafted: [17, 0, 23] }))).toBe(3);
  });

  it("resolves the player taken with a pick", () => {
    expect(draftedPlayerAt(pool({ drafted: [17], players }), 0)?.name).toBe(
      "Suzuki",
    );
  });

  it("has nobody for a pick not played yet", () => {
    expect(draftedPlayerAt(pool({ drafted: [17], players }), 1)).toBeNull();
  });

  it("has nobody for a slot the draft skipped, which the list holds a 0 for", () => {
    expect(draftedPlayerAt(pool({ drafted: [17, 0], players }), 1)).toBeNull();
  });
});

describe("buildDraftBoard", () => {
  it("puts the first pooler of the order on the clock before a pick is made", () => {
    const board = buildDraftBoard(pool());

    expect(board.currentDrafter).toBe("alice");
    expect(board.currentRound).toBe(1);
  });

  it("moves on through the round, then into the reversed one", () => {
    expect(buildDraftBoard(pool({ drafted: [1, 2] })).currentDrafter).toBe(
      "cat",
    );

    const secondRound = buildDraftBoard(pool({ drafted: [1, 2, 3] }));
    expect(secondRound.currentRound).toBe(2);
    expect(secondRound.currentDrafter).toBe("cat");
  });

  it("has nobody on the clock once every pick has been played", () => {
    const board = buildDraftBoard(pool({ drafted: [1, 2, 3, 4, 5, 6] }));

    expect(board.currentDrafter).toBeNull();
    expect(board.currentRound).toBeNull();
  });

  it("counts the picks the draft will actually play, skipped ones excluded", () => {
    expect(buildDraftBoard(pool()).totalPicks).toBe(6);

    // Four rounds of three, four of which are slots for a roster that is
    // already full.
    const withSkip = buildDraftBoard(
      pool({
        pastTradablePicks: [
          { alice: "alice", bob: "alice", cat: "cat" },
          { alice: "alice", bob: "alice", cat: "cat" },
        ],
        protected: 0,
      }),
    );

    expect(withSkip.rounds.flatMap((round) => round.picks)).toHaveLength(12);
    expect(withSkip.totalPicks).toBe(8);
  });

  it("puts nobody on the clock for a pool that lays out no rounds", () => {
    expect(buildDraftBoard(pool({ poolers: 0 })).currentDrafter).toBeNull();
  });
});

describe("flattenDraftBoard", () => {
  const players = {
    "17": { id: 17, name: "Suzuki" },
    "23": { id: 23, name: "Caufield" },
  };

  it("numbers every slot of the draft from one, in the order it is played", () => {
    const picks = flattenDraftBoard(pool({ drafted: [17, 23], players }));

    expect(
      picks.map((pick) => [pick.overall, pick.round, pick.drafter]),
    ).toEqual([
      [1, 1, "alice"],
      [2, 1, "bob"],
      [3, 1, "cat"],
      [4, 2, "cat"],
      [5, 2, "bob"],
      [6, 2, "alice"],
    ]);
  });

  it("carries the player where one has been taken and nothing where none has", () => {
    const picks = flattenDraftBoard(pool({ drafted: [17, 23], players }));

    expect(picks.map((pick) => pick.playerId)).toEqual([
      17,
      23,
      null,
      null,
      null,
      null,
    ]);
  });

  it("is empty for a pool with no board", () => {
    expect(flattenDraftBoard(pool({ draftOrder: null }))).toEqual([]);
  });
});

describe("hasDraftBoard", () => {
  it("is false in the lobby, where nothing has been laid out", () => {
    expect(hasDraftBoard(pool({ status: PoolState.Created }))).toBe(false);
  });

  it("is false without a draft order, whatever state the pool is in", () => {
    expect(
      hasDraftBoard(pool({ status: PoolState.InProgress, draftOrder: null })),
    ).toBe(false);
  });

  it("is true for a pool that has one", () => {
    expect(hasDraftBoard(pool({ status: PoolState.Final }))).toBe(true);
  });
});
