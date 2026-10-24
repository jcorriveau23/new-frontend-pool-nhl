/*
The pick screen's loading gate, and the deadline it renders.

The gate is where the reload flicker was visible: the screen dropped its
skeleton as soon as it saw no token, which on a signed-in reload meant it
painted "you are not a participant" to somebody who is one, then put the
skeleton back and finally the grid once the token arrived. The session now says
whether it has been read, and the skeleton waits on that.

The deadline is per game — a team can be picked until it takes the ice — so the
second half of this file is about a screen that has to show three different
reasons a tile cannot be tapped at the same time.
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
    public_picks: false,
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

describe("PickTab deadline", () => {
  // The screen, loaded with a given pick payload over the week's two teams.
  const loadWith = async (
    options: Partial<{
      available_team_ids: number[];
      started_team_ids: number[];
      date_has_begun: boolean;
      pick_window_closed: boolean;
      can_pick: boolean;
      current_pick: number | null;
    }>,
  ) => {
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
        ...options,
      },
    });

    renderTab();
    await vi.waitFor(() => expect(skeletons()).toHaveLength(0));
  };

  /*
  The week's two teams, and how the screen labels their tiles.

  A tile that cannot be tapped says why in its accessible name, which is what
  these assert on — the test translator renders a key with its values as
  `Key:{"team":"…"}`, so the names are matched by prefix. An open tile is just
  the team's name, which is how the ids below come to be spelled out.
  */
  const STARTED_TEAM = 1;
  const OPEN_TEAM = 2;
  const OPEN_TEAM_NAME = "New York Islanders";

  const closedTile = (key: string) =>
    screen.queryByRole("button", { name: new RegExp(`^${key}:`) });

  it("closes the tile of a team whose game has started and leaves the other", async () => {
    await loadWith({ started_team_ids: [STARTED_TEAM] });

    expect(closedTile("SurvivorTeamStartedLabel")).toBeDisabled();
    // The other game has not started, so the date is still being picked for
    // and its tile is live. This is the whole of what a per-game deadline buys.
    expect(screen.getByRole("button", { name: OPEN_TEAM_NAME })).toBeEnabled();
    expect(
      screen.getByText("SurvivorPickDeadlineExplanation"),
    ).toBeInTheDocument();
  });

  it("says a team they have spent is used, not that its game started", async () => {
    // Both are true of it. The lasting reason is the one worth reading: a
    // started team reopens next Saturday, a used one does not.
    await loadWith({
      available_team_ids: [OPEN_TEAM],
      started_team_ids: [STARTED_TEAM],
    });

    expect(closedTile("SurvivorTeamUsedLabel")).toBeDisabled();
    expect(closedTile("SurvivorTeamStartedLabel")).toBeNull();
  });

  it("says the date is closed once every game of it has started", async () => {
    await loadWith({
      started_team_ids: [STARTED_TEAM, OPEN_TEAM],
      pick_window_closed: true,
      can_pick: false,
    });

    expect(screen.getByText("SurvivorPicksClosedForDate")).toBeInTheDocument();
    // And it drops the "you have until the game starts" line, which would be
    // telling somebody about a deadline that has already gone.
    expect(
      screen.queryByText("SurvivorPickDeadlineExplanation"),
    ).not.toBeInTheDocument();
  });

  it("tells a spot with no pick that they have not missed the date", async () => {
    /*
    The middle of a date, and the state somebody opening the page at 4pm lands
    in: the first game has started so the field's picks are on show, some
    teams have gone with it, and what is left is still a real choice. Without
    this they would reasonably assume the date was over.
    */
    await loadWith({
      started_team_ids: [STARTED_TEAM],
      date_has_begun: true,
    });

    expect(
      screen.getByText("SurvivorDateUnderWayCanStillPick"),
    ).toBeInTheDocument();
  });

  it("does not say that to somebody who already has a pick in", async () => {
    await loadWith({
      started_team_ids: [STARTED_TEAM],
      date_has_begun: true,
      current_pick: OPEN_TEAM,
    });

    expect(
      screen.queryByText("SurvivorDateUnderWayCanStillPick"),
    ).not.toBeInTheDocument();
  });

  it("does not say that once the whole date is shut", async () => {
    // They did miss it, and the alert above already says so.
    await loadWith({
      started_team_ids: [STARTED_TEAM, OPEN_TEAM],
      date_has_begun: true,
      pick_window_closed: true,
      can_pick: false,
    });

    expect(
      screen.queryByText("SurvivorDateUnderWayCanStillPick"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("SurvivorPicksClosedForDate")).toBeInTheDocument();
  });

  it("marks their own pick as locked once its game has started", async () => {
    await loadWith({
      started_team_ids: [STARTED_TEAM],
      date_has_begun: true,
      current_pick: STARTED_TEAM,
    });

    expect(screen.getByText(/^SurvivorYourPickLocked:/)).toBeInTheDocument();
  });

  it("leaves their pick unmarked while its game is still to come", async () => {
    // It can still be moved, so calling it locked would be wrong.
    await loadWith({
      started_team_ids: [STARTED_TEAM],
      date_has_begun: true,
      current_pick: OPEN_TEAM,
    });

    expect(screen.getByText(/^SurvivorYourPick:/)).toBeInTheDocument();
    expect(
      screen.queryByText(/^SurvivorYourPickLocked:/),
    ).not.toBeInTheDocument();
  });

  it("leaves the whole date open on a backend that sends no deadline", async () => {
    // Neither field is sent by a backend older than the rule, and absent has
    // to read as "nothing has started" — the alternative is a screen that
    // greys out every tile of a pool that is still playing fine.
    await loadWith({});

    expect(
      screen.queryByText("SurvivorPicksClosedForDate"),
    ).not.toBeInTheDocument();
    expect(closedTile("SurvivorTeamStartedLabel")).toBeNull();
    expect(screen.getByRole("button", { name: OPEN_TEAM_NAME })).toBeEnabled();
  });
});
