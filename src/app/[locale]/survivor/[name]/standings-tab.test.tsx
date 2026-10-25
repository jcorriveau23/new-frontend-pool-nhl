/*
What the standings grid says about a date that is still waiting to be settled.

Such a date holds three things at once, and saying which is which is the only
part of the grid that is not simply "what they picked": picks their owner is
still free to change, picks that are in and undecided, and picks the games have
already decided. The last of those arrives hours before anybody presses settle,
and the column has to show the result without claiming it has been counted.

The week's stats dialog is mocked out — it is covered in its own file and pulls
Recharts behind a lazy import.
*/

import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  ParticipantStatus,
  PickOutcome,
  RevealedPick,
  SurvivorPool,
  SurvivorStandingRow,
  SurvivorStandings,
  SurvivorState,
  WeekStatus,
} from "@/data/survivor/model";
import StandingsTab from "./standings-tab";

vi.mock("./week-stats-dialog", () => ({
  default: ({ trigger }: { trigger: React.ReactElement }) => trigger,
}));

vi.mock("./participant-history-dialog", () => ({
  default: ({ trigger }: { trigger: React.ReactElement }) => trigger,
}));

const week = (number: number, status = WeekStatus.Open) => ({
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
    strikes_allowed: 0,
    missed_pick_is_strike: true,
    allow_pick_change: true,
    public_picks: false,
    league_team_count: 32,
  },
  participants: [],
  weeks: [week(1, WeekStatus.Settled), week(2)],
  winners: null,
  date_updated: 0,
  season: 2026,
  season_start: "2026-10-07",
  season_end: "2027-04-15",
} satisfies SurvivorPool;

const row = (
  id: string,
  picks: Record<string, RevealedPick>,
): SurvivorStandingRow => ({
  participant_id: id,
  name: id,
  status: ParticipantStatus.Alive,
  strikes: 0,
  eliminated_week: null,
  wins: 0,
  picks,
});

// Team 10 is the Toronto Maple Leafs, playing the game that has started, and
// team 6 the Boston Bruins, playing one that has not.
const STANDINGS: SurvivorStandings = {
  pool_name: "survivor",
  status: SurvivorState.InProgress,
  alive_count: 2,
  eliminated_count: 0,
  revealed_weeks: [1, 2],
  rows: [
    row("locked-pick", { "2": { team_id: 10, outcome: PickOutcome.Pending } }),
    row("open-pick", { "2": { team_id: 6, outcome: PickOutcome.Pending } }),
  ],
  winners: null,
  date_clocks: [
    {
      week: 2,
      started_team_ids: [10],
      won_team_ids: [],
      lost_team_ids: [],
      pick_window_closed: false,
    },
  ],
};

// The same date with its games over: Toronto won, Boston lost, and nobody has
// settled it.
const DECIDED: SurvivorStandings = {
  ...STANDINGS,
  date_clocks: [
    {
      week: 2,
      started_team_ids: [6, 10],
      won_team_ids: [10],
      lost_team_ids: [6],
      pick_window_closed: true,
    },
  ],
};

const renderTab = (standings: SurvivorStandings = STANDINGS) =>
  render(<StandingsTab pool={POOL} standings={standings} selectedWeek={2} />);

describe("StandingsTab, mid-date", () => {
  it("marks the pick whose game has started and leaves the other", async () => {
    renderTab();

    expect(
      screen.getByLabelText("Toronto Maple Leafs — SurvivorPickLocked"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Boston Bruins — SurvivorPickStillOpen"),
    ).toBeInTheDocument();
  });

  it("says the date is under way rather than leaving a column of picks unexplained", () => {
    renderTab();

    expect(
      screen.getByText('SurvivorWeekUnderWay:{"week":2}'),
    ).toBeInTheDocument();
  });

  it("falls back to the outcome on a date that is not the one being played", () => {
    // Every pick of a past date is locked, so a padlock on each would say
    // nothing; those cells read as the result instead.
    render(<StandingsTab pool={POOL} standings={STANDINGS} selectedWeek={1} />);

    expect(
      screen.queryByLabelText(/SurvivorPickLocked/),
    ).not.toBeInTheDocument();
  });

  it("marks nothing before the first puck drop", () => {
    // Nothing has started, so no pick is final — and in this private pool the
    // backend has revealed nothing either.
    renderTab({
      ...STANDINGS,
      revealed_weeks: [1],
      date_clocks: [{ week: 2, started_team_ids: [] }],
    });

    expect(
      screen.queryByLabelText(/SurvivorPickLocked/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/SurvivorWeekUnderWay/)).not.toBeInTheDocument();
  });

  it("marks nothing on a backend that sends no clock", () => {
    // Calling a pick final before it is would be the wrong way to be wrong.
    renderTab({ ...STANDINGS, date_clocks: [] });

    expect(
      screen.queryByLabelText(/SurvivorPickLocked/),
    ).not.toBeInTheDocument();
  });

  it("still reads the single clock an older backend sends", () => {
    // The deploy window: the list is absent, and the one date it described is
    // marked exactly as before.
    renderTab({
      ...STANDINGS,
      date_clocks: undefined,
      current_date: { week: 2, started_team_ids: [10] },
    });

    expect(
      screen.getByLabelText("Toronto Maple Leafs — SurvivorPickLocked"),
    ).toBeInTheDocument();
  });
});

describe("StandingsTab, a date played but not settled", () => {
  it("shows who won and who lost", () => {
    // The whole point: the games are over, so the grid says what happened
    // instead of sitting on a column of picks until somebody presses settle.
    renderTab(DECIDED);

    expect(
      screen.getByLabelText("Toronto Maple Leafs — SurvivorPickWonUnsettled"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Boston Bruins — SurvivorPickLostUnsettled"),
    ).toBeInTheDocument();
  });

  it("says the results have not been counted yet", () => {
    /*
    Both halves of it. The colours would otherwise read as a board that has
    been updated, while the wins column beside them still says zero — which is
    correct, and inexplicable without this line.
    */
    renderTab(DECIDED);

    expect(
      screen.getByText('SurvivorWeekResultsNotSettled:{"week":2}'),
    ).toBeInTheDocument();
  });

  it("stops calling the date under way once nothing is left to pick", () => {
    // "The teams yet to play can still be picked" is false once every game
    // has started, so that line gives way to the one above.
    renderTab(DECIDED);

    expect(screen.queryByText(/SurvivorWeekUnderWay/)).not.toBeInTheDocument();
  });

  it("puts no padlock on a pick its game has decided", () => {
    // A decided pick is locked too, but the result is the thing worth saying
    // about it — a padlock there reads as the only thing worth knowing.
    renderTab(DECIDED);

    expect(
      screen.queryByLabelText(/SurvivorPickLocked/),
    ).not.toBeInTheDocument();
  });

  it("leaves a pick the settlement has already recorded alone", () => {
    // What a pick cost is decided once. A feed that has since changed its mind
    // does not get to rewrite a settled cell.
    renderTab({
      ...DECIDED,
      rows: [
        row("settled-pick", {
          "2": { team_id: 10, outcome: PickOutcome.Lost },
        }),
      ],
    });

    expect(
      screen.getByLabelText("Toronto Maple Leafs — SurvivorOutcomeLost"),
    ).toBeInTheDocument();
  });
});

describe("StandingsTab, finding somebody", () => {
  // A field big enough for the controls to be worth showing: under the
  // threshold the grid is read in one glance and a search box is furniture.
  const CROWD: SurvivorStandings = {
    ...STANDINGS,
    rows: Array.from({ length: 14 }, (_, index) =>
      index === 3
        ? { ...row("me", {}), name: "Jean-François" }
        : row(`p${index}`, {}),
    ),
  };

  const renderCrowd = (ownParticipantId?: string) =>
    render(
      <StandingsTab
        pool={POOL}
        standings={CROWD}
        selectedWeek={2}
        ownParticipantId={ownParticipantId ?? null}
      />,
    );

  it("offers no search box for a pool read in one glance", () => {
    renderTab();

    expect(
      screen.queryByLabelText("SurvivorFindParticipant"),
    ).not.toBeInTheDocument();
  });

  it("filters the rows to what was typed", async () => {
    renderCrowd();

    await userEvent.type(
      screen.getByLabelText("SurvivorFindParticipant"),
      "jean",
    );

    expect(screen.getByText("Jean-François")).toBeInTheDocument();
    expect(screen.queryByText("p0")).not.toBeInTheDocument();
    // And says how much of the field is left, so a search that matched one
    // person does not read as a pool of one.
    expect(
      screen.getByText('SurvivorFindCount:{"count":1,"total":14}'),
    ).toBeInTheDocument();
  });

  it("marks the caller's own row and offers to find it", () => {
    renderCrowd("me");

    expect(screen.getByText("SurvivorYouMarker")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /SurvivorJumpToMe/ }),
    ).toBeInTheDocument();
  });

  it("offers no jump to somebody who is not in the pool", () => {
    // Nothing to jump to, so the control would do nothing.
    renderCrowd();

    expect(
      screen.queryByRole("button", { name: /SurvivorJumpToMe/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("SurvivorYouMarker")).not.toBeInTheDocument();
  });

  it("opens a participant's season from their name", () => {
    // The trigger is what the mocked dialog renders, so this asserts the grid
    // hands every name one.
    renderTab();

    expect(
      screen.getByRole("button", {
        name: 'SurvivorHistoryFor:{"name":"locked-pick"}',
      }),
    ).toBeInTheDocument();
  });
});
