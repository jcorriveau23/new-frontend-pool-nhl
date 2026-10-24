/*
What the standings grid says about the date being played.

A date reveals its picks at its first puck drop and keeps taking them until its
last, so for one column the grid holds both at once: picks that can no longer
move and picks their owner is still free to change. Telling those apart is most
of what the reveal is worth before the games are over, and it is the only thing
in the grid that is not simply "what they picked".

The week's stats dialog is mocked out — it is covered in its own file and pulls
Recharts behind a lazy import.
*/

import * as React from "react";
import { render, screen } from "@testing-library/react";
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
  current_date: { week: 2, started_team_ids: [10] },
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
      current_date: { week: 2, started_team_ids: [] },
    });

    expect(
      screen.queryByLabelText(/SurvivorPickLocked/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/SurvivorWeekUnderWay/)).not.toBeInTheDocument();
  });

  it("marks nothing on a backend that sends no clock", () => {
    // Calling a pick final before it is would be the wrong way to be wrong.
    renderTab({ ...STANDINGS, current_date: null });

    expect(
      screen.queryByLabelText(/SurvivorPickLocked/),
    ).not.toBeInTheDocument();
  });
});
