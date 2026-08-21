import { describe, expect, it } from "vitest";

import {
  DraftPickUndoneResponse,
  PlayerDraftedResponse,
  Player,
  Pool,
  PoolerRoster,
  PoolState,
  Position,
  RosterModifiedResponse,
} from "@/data/pool/model";
import {
  applyDraftPickUndone,
  applyPlayerDrafted,
  applyRosterModified,
} from "./draft-delta";

const emptyRoster = (): PoolerRoster => ({
  chosen_forwards: [],
  chosen_defenders: [],
  chosen_goalies: [],
  chosen_reservists: [],
});

const player = (id: number, position: Position = Position.F): Player =>
  ({ id, name: `player-${id}`, position }) as Player;

const makePool = (
  playersNameDrafted: number[],
  rosters: Record<string, PoolerRoster>
): Pool =>
  ({
    name: "draft-pool",
    status: PoolState.Draft,
    date_updated: 1,
    context: {
      players_name_drafted: playersNameDrafted,
      pooler_roster: rosters,
      players: Object.fromEntries(
        playersNameDrafted.filter((id) => id > 0).map((id) => [id, player(id)])
      ),
    },
  }) as unknown as Pool;

const drafted = (
  overrides: Partial<PlayerDraftedResponse> = {}
): PlayerDraftedResponse => ({
  player: player(7),
  participant_id: "user-1",
  roster: { ...emptyRoster(), chosen_forwards: [7] },
  appended_picks: [7],
  pick_count: 1,
  status: PoolState.Draft,
  date_updated: 2,
  ...overrides,
});

describe("applyPlayerDrafted", () => {
  it("adds the player, the roster and the pick", () => {
    const pool = makePool([], { "user-1": emptyRoster() });

    const next = applyPlayerDrafted(pool, drafted())!;

    expect(next.context!.players_name_drafted).toEqual([7]);
    expect(next.context!.players[7].name).toBe("player-7");
    expect(next.context!.pooler_roster["user-1"].chosen_forwards).toEqual([7]);
    expect(next.date_updated).toBe(2);
  });

  it("leaves the pool it was given untouched", () => {
    const pool = makePool([], { "user-1": emptyRoster() });

    applyPlayerDrafted(pool, drafted());

    expect(pool.context!.players_name_drafted).toEqual([]);
    expect(pool.context!.players[7]).toBeUndefined();
  });

  it("appends the zeros of the drafters skipped after the pick", () => {
    const pool = makePool([1], { "user-1": emptyRoster() });

    const next = applyPlayerDrafted(
      pool,
      drafted({ appended_picks: [7, 0], pick_count: 3 })
    )!;

    expect(next.context!.players_name_drafted).toEqual([1, 7, 0]);
  });

  // A pick lands in the reservists when its position is full or the salary cap
  // is reached. That rule lives in the backend, and the delta carries the
  // resulting roster whole, so the client never has to reproduce it.
  it("takes the roster as sent, reservists included", () => {
    const pool = makePool([1], {
      "user-1": { ...emptyRoster(), chosen_forwards: [1] },
    });

    const next = applyPlayerDrafted(
      pool,
      drafted({
        roster: {
          ...emptyRoster(),
          chosen_forwards: [1],
          chosen_reservists: [7],
        },
        pick_count: 2,
      })
    )!;

    expect(next.context!.pooler_roster["user-1"].chosen_reservists).toEqual([7]);
    expect(next.context!.pooler_roster["user-1"].chosen_forwards).toEqual([1]);
  });

  it("carries the status flip on the final pick", () => {
    const pool = makePool([], { "user-1": emptyRoster() });

    const next = applyPlayerDrafted(
      pool,
      drafted({ status: PoolState.InProgress })
    )!;

    expect(next.status).toBe(PoolState.InProgress);
  });

  it("refuses the delta when a previous pick was missed", () => {
    // The board says this is the third pick, but we only ever saw one.
    const pool = makePool([1], { "user-1": emptyRoster() });

    expect(applyPlayerDrafted(pool, drafted({ pick_count: 3 }))).toBeNull();
  });

  it("refuses the delta when there is no draft context yet", () => {
    const pool = { name: "draft-pool", context: null } as unknown as Pool;

    expect(applyPlayerDrafted(pool, drafted())).toBeNull();
  });
});

const undone = (
  overrides: Partial<DraftPickUndoneResponse> = {}
): DraftPickUndoneResponse => ({
  player_id: 7,
  participant_id: "user-1",
  roster: emptyRoster(),
  pick_count: 1,
  date_updated: 3,
  ...overrides,
});

describe("applyDraftPickUndone", () => {
  it("removes the player, the pick and restores the roster", () => {
    const pool = makePool([1, 7], {
      "user-1": { ...emptyRoster(), chosen_forwards: [7] },
    });

    const next = applyDraftPickUndone(pool, undone())!;

    expect(next.context!.players_name_drafted).toEqual([1]);
    expect(next.context!.players[7]).toBeUndefined();
    expect(next.context!.pooler_roster["user-1"].chosen_forwards).toEqual([]);
    expect(next.date_updated).toBe(3);
  });

  it("also drops the zeros that trailed the undone pick", () => {
    const pool = makePool([1, 7, 0, 0], {
      "user-1": { ...emptyRoster(), chosen_forwards: [7] },
    });

    const next = applyDraftPickUndone(pool, undone())!;

    expect(next.context!.players_name_drafted).toEqual([1]);
  });

  it("leaves the pool it was given untouched", () => {
    const pool = makePool([1, 7], {
      "user-1": { ...emptyRoster(), chosen_forwards: [7] },
    });

    applyDraftPickUndone(pool, undone());

    expect(pool.context!.players_name_drafted).toEqual([1, 7]);
    expect(pool.context!.players[7]).toBeDefined();
  });

  it("refuses the delta when the undone pick is not the one we hold", () => {
    // We never received pick 7, so position 1 holds something else.
    const pool = makePool([1, 9], { "user-1": emptyRoster() });

    expect(applyDraftPickUndone(pool, undone())).toBeNull();
  });

  it("refuses the delta when we are behind the draft board", () => {
    const pool = makePool([1], { "user-1": emptyRoster() });

    expect(applyDraftPickUndone(pool, undone({ pick_count: 4 }))).toBeNull();
  });
});

const modified = (
  overrides: Partial<RosterModifiedResponse> = {}
): RosterModifiedResponse => ({
  participant_id: "user-1",
  roster: { ...emptyRoster(), chosen_forwards: [1], chosen_reservists: [7] },
  date_updated: 4,
  ...overrides,
});

describe("applyRosterModified", () => {
  it("replaces the roster of the participant that rearranged it", () => {
    const pool = makePool([1, 7], {
      "user-1": { ...emptyRoster(), chosen_forwards: [1, 7] },
      "user-2": emptyRoster(),
    });

    const next = applyRosterModified(pool, modified())!;

    expect(next.context!.pooler_roster["user-1"].chosen_forwards).toEqual([1]);
    expect(next.context!.pooler_roster["user-1"].chosen_reservists).toEqual([7]);
    expect(next.date_updated).toBe(4);
  });

  it("leaves the picks and the other participants alone", () => {
    const pool = makePool([1, 7], {
      "user-1": { ...emptyRoster(), chosen_forwards: [1, 7] },
      "user-2": { ...emptyRoster(), chosen_goalies: [9] },
    });

    const next = applyRosterModified(pool, modified())!;

    expect(next.context!.players_name_drafted).toEqual([1, 7]);
    expect(next.context!.players[7]).toBeDefined();
    expect(next.context!.pooler_roster["user-2"].chosen_goalies).toEqual([9]);
  });

  it("leaves the pool it was given untouched", () => {
    const pool = makePool([1, 7], {
      "user-1": { ...emptyRoster(), chosen_forwards: [1, 7] },
    });

    applyRosterModified(pool, modified());

    expect(pool.context!.pooler_roster["user-1"].chosen_forwards).toEqual([
      1, 7,
    ]);
  });

  it("refuses a roster for a participant we do not know", () => {
    const pool = makePool([1], { "user-2": emptyRoster() });

    expect(applyRosterModified(pool, modified())).toBeNull();
  });

  it("refuses the delta when there is no draft context yet", () => {
    const pool = { name: "draft-pool", context: null } as unknown as Pool;

    expect(applyRosterModified(pool, modified())).toBeNull();
  });
});
