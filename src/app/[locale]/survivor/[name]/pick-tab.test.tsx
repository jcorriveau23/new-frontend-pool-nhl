/*
The pick screen's loading gate.

This is where the reload flicker was visible: the screen dropped its skeleton
as soon as it saw no token, which on a signed-in reload meant it painted "you
are not a participant" to somebody who is one, then put the skeleton back and
finally the grid once the token arrived. The session now says whether it has
been read, and the skeleton waits on that.
*/

import * as React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ParticipantStatus,
  SurvivorPool,
  SurvivorUser,
  SurvivorWeek,
  SurvivorState,
  WeekStatus,
} from "@/data/survivor/model";
import PickTab from "./pick-tab";

const fetchPickOptions = vi.fn();

vi.mock("@/lib/survivor-api", () => ({
  fetchPickOptions: (...args: unknown[]) => fetchPickOptions(...args),
  makeSurvivorPick: vi.fn(),
}));

const session = { info: { jwt: "" }, isResolved: false };

vi.mock("@/context/useSessionData", () => ({
  useSession: () => session,
}));

vi.mock("@/context/useUserData", () => ({
  useUser: () => ({ info: { id: "user-a" }, isResolved: true }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const PARTICIPANT: SurvivorUser = {
  id: "user-a",
  name: "jf",
  status: ParticipantStatus.Alive,
  strikes: 0,
  eliminated_week: null,
  date_joined: 0,
  is_owned: true,
};

const WEEK: SurvivorWeek = {
  week: 1,
  pick_date: "2026-10-17",
  status: WeekStatus.Open,
  eligible_team_ids: [1, 2],
  settled_at: null,
};

// Only the fields the screen reads.
const POOL = {
  name: "survivor",
  owner: "someone-else",
  status: SurvivorState.InProgress,
  settings: {
    assistants: [],
    max_participants: 100,
    strikes_allowed: 0,
    missed_pick_is_strike: true,
    allow_pick_change: true,
    league_team_count: 32,
  },
  participants: [PARTICIPANT],
  weeks: [WEEK],
  winners: null,
  date_updated: 0,
  season: 2026,
  season_start: "2026-10-07",
  season_end: "2027-04-15",
} satisfies SurvivorPool;

const skeletons = () => document.querySelectorAll('[data-slot="skeleton"]');

function renderTab() {
  return render(<PickTab pool={POOL} week={WEEK} participant={PARTICIPANT} />);
}

beforeEach(() => {
  fetchPickOptions.mockReset();
  session.info = { jwt: "" };
  session.isResolved = false;
});

describe("PickTab loading gate", () => {
  /*
  The regression itself. Before the fix this rendered the "not a participant"
  alert, which is what flashed on every reload.
  */
  it("keeps the skeleton up while the session is still being read", () => {
    renderTab();

    expect(skeletons().length).toBeGreaterThan(0);
    expect(
      screen.queryByText("SurvivorNotAParticipant"),
    ).not.toBeInTheDocument();
    expect(fetchPickOptions).not.toHaveBeenCalled();
  });

  it("says so once the session is read and there is no token", () => {
    session.isResolved = true;

    renderTab();

    expect(screen.getByText("SurvivorNotAParticipant")).toBeInTheDocument();
    expect(skeletons()).toHaveLength(0);
  });

  it("loads the picks when the session carries a token", async () => {
    session.isResolved = true;
    session.info = { jwt: "a-jwt" };
    fetchPickOptions.mockResolvedValue({
      ok: true,
      data: {
        week: 1,
        pick_date: "2026-10-17",
        eligible_team_ids: [1, 2],
        available_team_ids: [1, 2],
        used_team_ids: [],
        current_pick: null,
        is_blocked: false,
        can_pick: true,
      },
    });

    renderTab();

    await vi.waitFor(() => expect(skeletons()).toHaveLength(0));
    expect(fetchPickOptions).toHaveBeenCalledWith(
      "survivor",
      1,
      "a-jwt",
      undefined,
    );
    expect(
      screen.queryByText("SurvivorNotAParticipant"),
    ).not.toBeInTheDocument();
  });
});
