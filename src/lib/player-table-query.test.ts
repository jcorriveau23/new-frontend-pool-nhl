import { describe, expect, it } from "vitest";

import { Player } from "@/data/pool/model";
import {
  comparePlayersBy,
  filterByPositions,
  isSearchActive,
  movePage,
  PlayerQueryState,
  showGoalieColumns,
  sortByColumn,
} from "./player-table-query";

const state = (
  overrides: Partial<PlayerQueryState> = {},
): PlayerQueryState => ({
  sortField: "points",
  descendingOrder: true,
  skip: 0,
  positions: ["F", "D"],
  ...overrides,
});

const player = (id: number, overrides: Partial<Player> = {}): Player =>
  ({ id, name: `player-${id}`, ...overrides }) as Player;

describe("sortByColumn", () => {
  it("flips the order when the same column is clicked again", () => {
    expect(sortByColumn(state(), "points")).toMatchObject({
      sortField: "points",
      descendingOrder: false,
    });
  });

  it("starts a different column descending", () => {
    expect(
      sortByColumn(state({ descendingOrder: false }), "goals"),
    ).toMatchObject({ sortField: "goals", descendingOrder: true });
  });

  it("goes back to the first page", () => {
    expect(sortByColumn(state({ skip: 300 }), "goals").skip).toBe(0);
  });
});

describe("movePage", () => {
  it("moves by one page at a time", () => {
    expect(movePage(state({ skip: 100 }), 1, 100)?.skip).toBe(200);
    expect(movePage(state({ skip: 100 }), -1, 100)?.skip).toBe(0);
  });

  it("refuses to move before the first page", () => {
    expect(movePage(state({ skip: 0 }), -1, 100)).toBeNull();
  });

  it("keeps everything else about the query", () => {
    expect(movePage(state({ sortField: "goals" }), 1, 100)).toMatchObject({
      sortField: "goals",
      positions: ["F", "D"],
    });
  });
});

describe("filterByPositions", () => {
  it("switches to the goalie default when goalies are picked", () => {
    expect(filterByPositions(state(), ["G"])).toMatchObject({
      positions: ["G"],
      sortField: "wins",
      skip: 0,
    });
  });

  it("switches back to the skater default when leaving goalies", () => {
    expect(
      filterByPositions(state({ positions: ["G"], sortField: "wins" }), ["F"]),
    ).toMatchObject({ positions: ["F"], sortField: "points" });
  });

  it("keeps the column when staying among skaters", () => {
    expect(
      filterByPositions(state({ sortField: "assists" }), ["F", "D"]),
    ).toMatchObject({ sortField: "assists" });
  });
});

describe("isSearchActive", () => {
  it("waits for enough characters to be worth a request", () => {
    expect(isSearchActive("mc")).toBe(false);
    expect(isSearchActive("mcd")).toBe(true);
    expect(isSearchActive("  mc  ")).toBe(false);
  });
});

describe("showGoalieColumns", () => {
  it("follows the position filter when not searching", () => {
    expect(showGoalieColumns(false, [], ["G"])).toBe(true);
    expect(showGoalieColumns(false, [], ["F", "D"])).toBe(false);
  });

  it("shows goalie columns only when every match is a goalie", () => {
    const goalie = player(1, { position: "G" } as Partial<Player>);
    const skater = player(2, { position: "F" } as Partial<Player>);

    expect(showGoalieColumns(true, [goalie], ["F"])).toBe(true);
    expect(showGoalieColumns(true, [goalie, skater], ["G"])).toBe(false);
  });

  it("falls back to the skater columns when a search found nobody", () => {
    expect(showGoalieColumns(true, [], ["G"])).toBe(false);
  });
});

describe("comparePlayersBy", () => {
  const players = [
    player(1, { points: 10 } as Partial<Player>),
    player(2, { points: 30 } as Partial<Player>),
    player(3, { points: null } as unknown as Partial<Player>),
    player(4, { points: 20 } as Partial<Player>),
  ];

  it("orders by the sorted column, descending", () => {
    expect(
      [...players].sort(comparePlayersBy("points", true)).map((p) => p.id),
    ).toEqual([2, 4, 1, 3]);
  });

  it("orders ascending, still keeping players without the stat last", () => {
    expect(
      [...players].sort(comparePlayersBy("points", false)).map((p) => p.id),
    ).toEqual([1, 4, 2, 3]);
  });

  it("compares text columns as text", () => {
    const named = [player(1, { name: "Zeta" }), player(2, { name: "Alpha" })];

    expect(
      [...named].sort(comparePlayersBy("name", false)).map((p) => p.id),
    ).toEqual([2, 1]);
  });

  it("falls back to points when no column is sorted", () => {
    expect(
      [...players].sort(comparePlayersBy(null, true)).map((p) => p.id),
    ).toEqual([2, 4, 1, 3]);
  });
});
