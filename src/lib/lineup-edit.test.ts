import { describe, expect, it } from "vitest";

import { Player, Position } from "@/data/pool/model";
import {
  bySalary,
  byPositionThenSalary,
  countMovedPlayers,
  findLineupIssue,
  Lineup,
  lineupSignature,
  moveToLineup,
  moveToReserves,
  starters,
  toLineup,
  totalStartersSalary,
} from "./lineup-edit";

const player = (
  id: number,
  position: Position,
  salary: number | null = 1_000_000,
): Player =>
  ({ id, name: `player-${id}`, position, salary_cap: salary }) as Player;

const lineup = (overrides: Partial<Lineup> = {}): Lineup => ({
  forwards: [player(1, Position.F), player(2, Position.F)],
  defense: [player(3, Position.D)],
  goalies: [player(4, Position.G)],
  reservists: [player(5, Position.F)],
  ...overrides,
});

const limits = { forwards: 2, defense: 1, goalies: 1 };

describe("toLineup", () => {
  it("copies every group so the roster it came from is left alone", () => {
    const roster = lineup();
    const copy = toLineup(roster);
    copy.forwards.push(player(9, Position.F));

    expect(roster.forwards).toHaveLength(2);
    expect(copy.forwards).toHaveLength(3);
  });
});

describe("lineupSignature", () => {
  it("ignores the order players are listed in", () => {
    const reordered = lineup({
      forwards: [player(2, Position.F), player(1, Position.F)],
    });

    expect(lineupSignature(reordered)).toBe(lineupSignature(lineup()));
  });

  it("changes when a player moves to the bench", () => {
    const benched = moveToReserves(lineup(), player(1, Position.F));

    expect(lineupSignature(benched)).not.toBe(lineupSignature(lineup()));
  });

  it("changes when a different player is on the roster", () => {
    const swapped = lineup({
      forwards: [player(1, Position.F), player(8, Position.F)],
    });

    expect(lineupSignature(swapped)).not.toBe(lineupSignature(lineup()));
  });
});

describe("moveToReserves / moveToLineup", () => {
  it("benches a player out of the group their position belongs to", () => {
    const benched = moveToReserves(lineup(), player(3, Position.D));

    expect(benched.defense).toEqual([]);
    expect(benched.reservists.map((p) => p.id)).toEqual([5, 3]);
  });

  it("starts a benched player back in their own group", () => {
    const started = moveToLineup(lineup(), player(5, Position.F));

    expect(started.forwards.map((p) => p.id)).toEqual([1, 2, 5]);
    expect(started.reservists).toEqual([]);
  });

  it("leaves the lineup it was given untouched", () => {
    const original = lineup();
    moveToReserves(original, player(1, Position.F));

    expect(original.forwards).toHaveLength(2);
  });
});

describe("countMovedPlayers", () => {
  const saved = lineup();

  it("counts nothing when nobody moved", () => {
    expect(countMovedPlayers(toLineup(saved), saved)).toBe(0);
  });

  it("counts a player sent to the bench and one brought back", () => {
    const edited = moveToLineup(
      moveToReserves(toLineup(saved), player(1, Position.F)),
      player(5, Position.F),
    );

    expect(countMovedPlayers(edited, saved)).toBe(2);
  });

  it("counts nothing for a player moved out and back again", () => {
    const edited = moveToLineup(
      moveToReserves(toLineup(saved), player(1, Position.F)),
      player(1, Position.F),
    );

    expect(countMovedPlayers(edited, saved)).toBe(0);
  });
});

describe("starters and totalStartersSalary", () => {
  it("counts the three starting groups, never the bench", () => {
    expect(starters(lineup()).map((p) => p.id)).toEqual([1, 2, 3, 4]);
    expect(totalStartersSalary(lineup())).toBe(4_000_000);
  });

  it("treats a player with no contract as no salary", () => {
    const withoutContract = lineup({
      forwards: [player(1, Position.F, null), player(2, Position.F)],
    });

    expect(totalStartersSalary(withoutContract)).toBe(3_000_000);
  });
});

describe("findLineupIssue", () => {
  it("takes a lineup that fits the limits and the cap", () => {
    expect(findLineupIssue(lineup(), limits, 10_000_000)).toBeNull();
  });

  it("reports the group that holds too many players", () => {
    const tooManyForwards = moveToLineup(lineup(), player(5, Position.F));

    expect(findLineupIssue(tooManyForwards, limits, null)).toEqual({
      kind: "too-many-players",
      group: "forwards",
      count: 3,
      limit: 2,
    });
  });

  it("skips the salary checks in a pool without a cap", () => {
    const withoutContract = lineup({
      goalies: [player(4, Position.G, null)],
    });

    expect(findLineupIssue(withoutContract, limits, null)).toBeNull();
  });

  it("reports a starter with no contract before the cap itself", () => {
    const withoutContract = lineup({
      goalies: [player(4, Position.G, null)],
    });

    expect(findLineupIssue(withoutContract, limits, 1)).toMatchObject({
      kind: "player-without-contract",
      player: { id: 4 },
    });
  });

  it("reports by how much the lineup goes over the cap", () => {
    expect(findLineupIssue(lineup(), limits, 3_500_000)).toEqual({
      kind: "over-salary-cap",
      overBy: 500_000,
    });
  });

  it("takes a lineup that lands exactly on the cap", () => {
    expect(findLineupIssue(lineup(), limits, 4_000_000)).toBeNull();
  });
});

describe("sorting", () => {
  it("lists the most expensive player first", () => {
    const players = [
      player(1, Position.F, 1_000_000),
      player(2, Position.F, 9_000_000),
      player(3, Position.F, null),
    ];

    expect(bySalary(players).map((p) => p.id)).toEqual([2, 1, 3]);
  });

  it("groups the bench by position, then by salary", () => {
    const players = [
      player(1, Position.G, 2_000_000),
      player(2, Position.D, 1_000_000),
      player(3, Position.F, 3_000_000),
      player(4, Position.F, 8_000_000),
    ];

    expect(byPositionThenSalary(players).map((p) => p.id)).toEqual([
      4, 3, 2, 1,
    ]);
  });
});
