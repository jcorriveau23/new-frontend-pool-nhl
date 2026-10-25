/*
The week's pick stats, as the dialog presents them.

The counting itself is covered in `survivor-week-stats.test.ts`; what this file
is for is the part a reader depends on and a chart cannot provide: the headline
numbers, the outcomes named in words, and the table view that carries the same
figures when the bars do not reach somebody. The bar chart is mocked out — it
is lazy-loaded behind `next/dynamic` and needs a measured DOM that jsdom has
none of.
*/

import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  DateClock,
  ParticipantStatus,
  PickOutcome,
  RevealedPick,
  SurvivorStandingRow,
} from "@/data/survivor/model";
import WeekStatsDialog from "./week-stats-dialog";

vi.mock("@/components/chart/lazy", () => ({
  SurvivorWeekPicksChart: ({ picksMade }: { picksMade: number }) => (
    <div>the chart of {picksMade}</div>
  ),
}));

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

// Team 10 is the Toronto Maple Leafs and team 8 the Montréal Canadiens, which
// is what the stats name rather than their ids.
const SETTLED_WEEK = [
  row("a", { "1": pick(10, PickOutcome.Won) }),
  row("b", { "1": pick(10, PickOutcome.Won) }),
  row(
    "c",
    { "1": pick(8, PickOutcome.Lost) },
    {
      status: ParticipantStatus.Eliminated,
      eliminated_week: 1,
    },
  ),
  row("d", {}),
];

const open = async (
  rows: SurvivorStandingRow[],
  // The date's clock, for a date still waiting to be settled. Null is the
  // settled date every test below but the last two reads.
  clock: DateClock | null = null,
) => {
  render(
    <WeekStatsDialog
      week={1}
      pickDate="2026-10-17"
      rows={rows}
      clock={clock}
      trigger={<button type="button">week 1</button>}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "week 1" }));
};

/*
Switch to the table and hand it back.

Scoped reads go through it because the legend above carries the same outcome
words, so an unscoped `getByText` would match either.
*/
const openTable = async () => {
  await userEvent.click(
    screen.getByRole("button", { name: /SurvivorWeekShowTable/ }),
  );
  return screen.getByRole("table");
};

describe("WeekStatsDialog", () => {
  it("leads with the headline numbers for the date", async () => {
    await open(SETTLED_WEEK);

    // Four were in the field and three picked.
    expect(screen.getByText("3/4")).toBeInTheDocument();
    expect(
      screen.getByText('SurvivorWeekNoPickCount:{"count":1}'),
    ).toBeInTheDocument();
    // Two of the three picks were on the Leafs.
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("Toronto Maple Leafs")).toBeInTheDocument();
  });

  it("counts the people the date took out", async () => {
    await open(SETTLED_WEEK);

    const eliminated = screen.getByText("SurvivorWeekEliminated").parentElement;
    expect(eliminated).toHaveTextContent("1");
  });

  it("names each outcome in words beside its colour", async () => {
    /*
    The legend is not decoration. The fills are teal and orange because green
    and red are the pair a colourblind reader cannot separate, and even then
    the words are what carry the meaning — so they are on screen rather than
    behind a hover.
    */
    await open(SETTLED_WEEK);

    expect(screen.getByText("SurvivorOutcomeWon")).toBeInTheDocument();
    expect(screen.getByText("SurvivorOutcomeLost")).toBeInTheDocument();
    // Nobody's game was called off, so there is no "no result" key.
    expect(screen.queryByText("SurvivorOutcomeVoid")).not.toBeInTheDocument();
  });

  it("swaps the chart for a table carrying the same figures", async () => {
    await open(SETTLED_WEEK);

    expect(screen.getByText("the chart of 3")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /SurvivorWeekShowTable/ }),
    );

    expect(screen.queryByText("the chart of 3")).not.toBeInTheDocument();
    /*
    A row per team, with the count, the share and the result spelled out.
    Scoped to the table because the headline numbers above it name the
    most-picked team too, and the cell's own accessible name carries the
    logo's alt text alongside the label.
    */
    const leafsRow = within(screen.getByRole("table"))
      .getAllByRole("row")
      .find((candidate) =>
        candidate.textContent?.includes("Toronto Maple Leafs"),
      );
    expect(leafsRow).toHaveTextContent("2");
    expect(leafsRow).toHaveTextContent("67%");
    expect(leafsRow).toHaveTextContent("SurvivorOutcomeWon");
  });

  it("reads a date nothing has reported a result for as pending", async () => {
    // No clock: a date whose games the league's feed could not be read for, or
    // a backend older than the results. The chart is pure distribution and
    // nothing has an outcome — which is how every unsettled date read before
    // the clock carried one.
    await open([row("a", { "1": pick(10) }), row("b", { "1": pick(8) })]);

    expect(screen.getByText("SurvivorOutcomePending")).toBeInTheDocument();
    expect(screen.queryByText("SurvivorOutcomeWon")).not.toBeInTheDocument();
  });

  it("opens as the table when the whole field was on one team", async () => {
    /*
    One bar is not a chart: its length compares against nothing and its number
    is already in the tiles. The toggle is still there, so the week is not a
    special case to anybody reading it.
    */
    await open([row("a", { "1": pick(10) }), row("b", { "1": pick(10) })]);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /SurvivorWeekShowChart/ }),
    ).toBeInTheDocument();
  });

  it("says so for a date nobody picked, and offers no table of nothing", async () => {
    await open([row("a", {}), row("b", {})]);

    expect(screen.getByText("0/2")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /SurvivorWeekShowTable/ }),
    ).not.toBeInTheDocument();
  });

  /*
  A date whose games are over and whose settlement has not run.

  Every pick is still `Pending` — the settlement is what writes an outcome — so
  without the clock the dialog would name every team "not settled" while the
  grid it opens over shows who won.
  */
  const UNSETTLED_WEEK = [
    row("a", { "1": pick(10) }),
    row("b", { "1": pick(10) }),
    row("c", { "1": pick(8) }),
  ];

  const DECIDED: DateClock = {
    week: 1,
    started_team_ids: [8, 10],
    won_team_ids: [10],
    lost_team_ids: [8],
    pick_window_closed: true,
  };

  it("names what the games did on a date nobody has settled", async () => {
    await open(UNSETTLED_WEEK, DECIDED);

    const table = await openTable();
    expect(within(table).getByText("SurvivorOutcomeWon")).toBeInTheDocument();
    expect(within(table).getByText("SurvivorOutcomeLost")).toBeInTheDocument();
    expect(
      within(table).queryByText("SurvivorOutcomePending"),
    ).not.toBeInTheDocument();
  });

  it("says those results have not been counted yet", async () => {
    // The eliminated tile beside them reads nought, and correctly: nothing is
    // applied until the date is settled.
    await open(UNSETTLED_WEEK, DECIDED);

    expect(
      screen.getByText('SurvivorWeekResultsNotSettled:{"week":1}'),
    ).toBeInTheDocument();
    const eliminated = screen.getByText("SurvivorWeekEliminated").parentElement;
    expect(eliminated).toHaveTextContent("0");
  });

  it("says nothing about results a date has not produced", async () => {
    // Mid-afternoon: the picks are public, no game is over, and there is
    // nothing to explain away.
    await open(UNSETTLED_WEEK, {
      week: 1,
      started_team_ids: [10],
      won_team_ids: [],
      lost_team_ids: [],
      pick_window_closed: false,
    });

    expect(
      screen.queryByText(/SurvivorWeekResultsNotSettled/),
    ).not.toBeInTheDocument();
  });
});
