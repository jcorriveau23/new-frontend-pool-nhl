import { describe, expect, it } from "vitest";

import {
  ParticipantStatus,
  PickOutcome,
  RevealedPick,
  SurvivorStandingRow,
} from "@/data/survivor/model";
import { outcomesPresent, survivorWeekStats } from "@/lib/survivor-week-stats";

const row = (
  id: string,
  picks: Record<string, RevealedPick>,
  overrides: Partial<SurvivorStandingRow> = {},
): SurvivorStandingRow => ({
  participant_id: id,
  name: id,
  status: ParticipantStatus.Alive,
  strikes: 0,
  eliminated_week: null,
  wins: 0,
  picks,
  ...overrides,
});

const pick = (teamId: number, outcome = PickOutcome.Pending): RevealedPick => ({
  team_id: teamId,
  outcome,
});

describe("survivorWeekStats", () => {
  it("counts the field on each team, most picked first", () => {
    const stats = survivorWeekStats(
      [
        row("a", { "1": pick(10) }),
        row("b", { "1": pick(10) }),
        row("c", { "1": pick(8) }),
      ],
      1,
    );

    expect(stats.teams).toEqual([
      { teamId: 10, count: 2, share: 2 / 3, outcome: PickOutcome.Pending },
      { teamId: 8, count: 1, share: 1 / 3, outcome: PickOutcome.Pending },
    ]);
    expect(stats.mostPicked?.teamId).toBe(10);
    expect(stats.picksMade).toBe(3);
  });

  it("breaks a tie on the team id so the bars do not shuffle between renders", () => {
    const stats = survivorWeekStats(
      [row("a", { "1": pick(30) }), row("b", { "1": pick(4) })],
      1,
    );

    expect(stats.teams.map((team) => team.teamId)).toEqual([4, 30]);
  });

  it("shares each team against the picks made, not against the field", () => {
    // One of the three did not pick. Dividing by the field would report 33%
    // for a team that two of the two voters were on.
    const stats = survivorWeekStats(
      [row("a", { "1": pick(10) }), row("b", { "1": pick(10) }), row("c", {})],
      1,
    );

    expect(stats.teams[0].share).toBe(1);
    expect(stats.picksMade).toBe(2);
    expect(stats.noPick).toBe(1);
  });

  it("measures the date against whoever was still in it", () => {
    /*
    The one that would otherwise make every week in a long-running pool look
    like half the field forgot to pick. `b` went out in week 1, so week 2 is a
    field of one, not of two.
    */
    const rows = [
      row("a", { "1": pick(10, PickOutcome.Won), "2": pick(8) }),
      row(
        "b",
        { "1": pick(6, PickOutcome.Lost) },
        {
          status: ParticipantStatus.Eliminated,
          eliminated_week: 1,
        },
      ),
    ];

    expect(survivorWeekStats(rows, 1).fieldSize).toBe(2);

    const second = survivorWeekStats(rows, 2);
    expect(second.fieldSize).toBe(1);
    expect(second.noPick).toBe(0);
  });

  it("keeps somebody in the field of the week that took them out", () => {
    // They played it and went out on it, so the date had them in it.
    const stats = survivorWeekStats(
      [
        row(
          "b",
          { "3": pick(6, PickOutcome.Lost) },
          {
            status: ParticipantStatus.Eliminated,
            eliminated_week: 3,
          },
        ),
      ],
      3,
    );

    expect(stats.fieldSize).toBe(1);
    expect(stats.picksMade).toBe(1);
    expect(stats.eliminated).toBe(1);
  });

  it("ignores a pick filed ahead by somebody who never reached the date", () => {
    /*
    Any open date can be picked for, so this really happens: `b` filed week 4
    in October and went out in week 1. The pick is still in the payload, and
    counting it would put a dead participant on the week 4 chart.
    */
    const stats = survivorWeekStats(
      [
        row("a", { "4": pick(10) }),
        row(
          "b",
          { "4": pick(8) },
          {
            status: ParticipantStatus.Eliminated,
            eliminated_week: 1,
          },
        ),
      ],
      4,
    );

    expect(stats.picksMade).toBe(1);
    expect(stats.teams.map((team) => team.teamId)).toEqual([10]);
  });

  it("counts picks per outcome rather than per team", () => {
    // Two people on the losing team is two losses, not one.
    const stats = survivorWeekStats(
      [
        row("a", { "1": pick(10, PickOutcome.Won) }),
        row("b", { "1": pick(8, PickOutcome.Lost) }),
        row("c", { "1": pick(8, PickOutcome.Lost) }),
        row("d", { "1": pick(6, PickOutcome.Void) }),
      ],
      1,
    );

    expect(stats.byOutcome).toEqual({
      [PickOutcome.Won]: 1,
      [PickOutcome.Lost]: 2,
      [PickOutcome.Void]: 1,
      [PickOutcome.Pending]: 0,
    });
  });

  it("reads a revealed date that has not been settled as pending throughout", () => {
    // The window between the last puck drop and the owner settling, which is
    // when the chart is most worth looking at.
    const stats = survivorWeekStats(
      [row("a", { "1": pick(10) }), row("b", { "1": pick(8) })],
      1,
    );

    expect(stats.byOutcome[PickOutcome.Pending]).toBe(2);
    expect(stats.eliminated).toBe(0);
  });

  it("prefers a decided outcome over pending for the same team", () => {
    // Only reachable mid-settlement, and showing the result beats showing the
    // date as still open.
    const stats = survivorWeekStats(
      [
        row("a", { "1": pick(10, PickOutcome.Pending) }),
        row("b", { "1": pick(10, PickOutcome.Won) }),
      ],
      1,
    );

    expect(stats.teams[0].outcome).toBe(PickOutcome.Won);
  });

  it("answers for a date nobody picked without dividing by zero", () => {
    const stats = survivorWeekStats([row("a", {}), row("b", {})], 1);

    expect(stats.teams).toEqual([]);
    expect(stats.mostPicked).toBeNull();
    expect(stats.picksMade).toBe(0);
    expect(stats.noPick).toBe(2);
  });

  it("answers for an empty pool", () => {
    const stats = survivorWeekStats([], 1);

    expect(stats.fieldSize).toBe(0);
    expect(stats.mostPicked).toBeNull();
  });
});

describe("outcomesPresent", () => {
  it("lists only the outcomes the date produced, in a fixed order", () => {
    // A date nobody lost on should not carry a "Lost" key in the legend.
    const stats = survivorWeekStats(
      [
        row("a", { "1": pick(8, PickOutcome.Lost) }),
        row("b", { "1": pick(10, PickOutcome.Won) }),
      ],
      1,
    );

    expect(outcomesPresent(stats)).toEqual([PickOutcome.Won, PickOutcome.Lost]);
  });

  it("is empty for a date nobody picked", () => {
    expect(outcomesPresent(survivorWeekStats([row("a", {})], 1))).toEqual([]);
  });
});
