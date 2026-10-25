/*
What one participant's season says, behind their name in the standings.

The grid answers "what did everybody pick on this date". This answers the one
it cannot on a phone — "how has this person got this far" — and the thing worth
testing is that it agrees with the grid it was opened from: a date whose games
are over but which nobody has settled reads as the result here too, not as "not
settled" beside a cell showing a win.
*/

import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  DateClock,
  ParticipantStatus,
  PickOutcome,
  RevealedPick,
  SurvivorPool,
  SurvivorStandingRow,
  SurvivorState,
  WeekStatus,
} from "@/data/survivor/model";
import ParticipantHistoryDialog from "./participant-history-dialog";

const week = (number: number, status = WeekStatus.Settled) => ({
  week: number,
  pick_date: `2026-10-${10 + number * 7}`,
  status,
  eligible_team_ids: [],
  settled_at: null,
});

const POOL = {
  name: "survivor",
  owner: "a",
  status: SurvivorState.InProgress,
  settings: {
    assistants: [],
    max_participants: 100,
    strikes_allowed: 1,
    missed_pick_is_strike: true,
    allow_pick_change: true,
    public_picks: false,
    league_team_count: 32,
  },
  participants: [],
  weeks: [week(1), week(2), week(3, WeekStatus.Open)],
  winners: null,
  date_updated: 0,
  season: 2026,
  season_start: "2026-10-07",
  season_end: "2027-04-15",
} satisfies SurvivorPool;

// Team 10 is the Toronto Maple Leafs and team 8 the Montréal Canadiens.
const ROW: SurvivorStandingRow = {
  participant_id: "me",
  name: "Jean-François",
  status: ParticipantStatus.Alive,
  strikes: 1,
  eliminated_week: null,
  wins: 1,
  picks: {
    "1": { team_id: 10, outcome: PickOutcome.Won },
    "2": { team_id: 8, outcome: PickOutcome.Lost },
  },
};

const open = async (
  {
    row = ROW,
    revealedWeeks = [1, 2],
    clocks = [],
  }: {
    row?: SurvivorStandingRow;
    revealedWeeks?: number[];
    clocks?: DateClock[];
  } = {},
  pool: SurvivorPool = POOL,
) => {
  render(
    <ParticipantHistoryDialog
      pool={pool}
      row={row}
      revealedWeeks={revealedWeeks}
      clocks={clocks}
      trigger={<button type="button">the name</button>}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "the name" }));
  return screen.getByRole("table");
};

const rowFor = (table: HTMLElement, label: string) =>
  within(table)
    .getAllByRole("row")
    .find((candidate) => candidate.textContent?.includes(label));

describe("ParticipantHistoryDialog", () => {
  it("walks the season, naming each date and what it came to", async () => {
    const table = await open();

    const first = rowFor(table, 'SurvivorWeekLabel:{"week":1}');
    expect(first).toHaveTextContent("Toronto Maple Leafs");
    expect(first).toHaveTextContent("SurvivorOutcomeWon");

    const second = rowFor(table, 'SurvivorWeekLabel:{"week":2}');
    expect(second).toHaveTextContent("Montréal Canadiens");
    expect(second).toHaveTextContent("SurvivorOutcomeLost");
  });

  it("leads with how the season stands", async () => {
    await open();

    expect(
      screen.getByText('SurvivorHistoryWins:{"count":1}'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('SurvivorHistoryStrikes:{"count":1}'),
    ).toBeInTheDocument();
    // Two dates picked, two teams spent.
    expect(
      screen.getByText('SurvivorHistoryTeamsUsed:{"count":2}'),
    ).toBeInTheDocument();
  });

  it("keeps a date they let go by rather than skipping it", async () => {
    // "You missed week 2" is part of a season. A list that left it out would
    // read as a season of nothing but picks.
    const table = await open({
      row: { ...ROW, picks: { "1": ROW.picks["1"] as RevealedPick } },
    });

    const missed = rowFor(table, 'SurvivorWeekLabel:{"week":2}');
    expect(missed).toHaveTextContent("SurvivorHistoryNoPick");
  });

  it("reads a decided game as its result before the date is settled", async () => {
    /*
    The agreement with the grid. The pick is still `Pending` — only a
    settlement writes an outcome — so without the date's clock this row would
    say "not settled" while the cell it was opened from shows a win.
    */
    const table = await open({
      row: {
        ...ROW,
        picks: { "3": { team_id: 10, outcome: PickOutcome.Pending } },
      },
      revealedWeeks: [3],
      clocks: [
        {
          week: 3,
          started_team_ids: [10],
          won_team_ids: [10],
          lost_team_ids: [],
          pick_window_closed: true,
        },
      ],
    });

    expect(rowFor(table, 'SurvivorWeekLabel:{"week":3}')).toHaveTextContent(
      "SurvivorPickWonUnsettled",
    );
  });

  it("says when somebody is out, and since when", async () => {
    await open({
      row: {
        ...ROW,
        status: ParticipantStatus.Eliminated,
        eliminated_week: 2,
      },
    });

    expect(
      screen.getByText('SurvivorHistoryOut:{"week":2}'),
    ).toBeInTheDocument();
  });

  it("says so for a pool with nothing revealed yet", async () => {
    // Before the first puck drop of the first date there is no season to show,
    // and an empty table would read as somebody who never picked.
    render(
      <ParticipantHistoryDialog
        pool={POOL}
        row={ROW}
        revealedWeeks={[]}
        clocks={[]}
        trigger={<button type="button">the name</button>}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "the name" }));

    expect(screen.getByText("SurvivorHistoryNothingYet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
