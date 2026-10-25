/*
Which tab the survivor page opens on, and where that is kept.

It lives in the URL as `activeTab`, the way the roster pool holds it, so the
standings are a link somebody can send and a reload comes back to the tab you
were reading. The three tabs themselves are mocked out here: what is under test
is the routing between them, not what any of them renders.

The case worth having a test for is the settings tab, which only exists for
somebody who can administer the pool. A link to it opened by anybody else has
to land somewhere — Base UI renders no panel for a value with no trigger, so
without the fallback the page comes up blank — and `canAdminister` is false for
one render even for the owner, while the signed-in user is still resolving.
*/

import * as React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DateClock,
  ParticipantStatus,
  PickOutcome,
  SurvivorPickView,
  SurvivorPool,
  SurvivorState,
  SurvivorStandings,
  SurvivorUser,
  WeekStatus,
} from "@/data/survivor/model";
import { fetchMyPicks, fetchSurvivorStandings } from "@/lib/survivor-api";
import { routerMock } from "../../../../../vitest.setup";
import SurvivorPoolPage from "./survivor-pool";

// The URL the page reads, swapped per test.
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

// Who is signed in, swapped per test: the owner can administer the pool,
// anybody else cannot.
let userId = "owner";

vi.mock("@/context/useUserData", () => ({
  useUser: () => ({ info: { id: userId }, isResolved: true }),
}));

vi.mock("@/context/useSessionData", () => ({
  useSession: () => ({ info: { jwt: "a-jwt" }, isResolved: true }),
}));

vi.mock("@/lib/survivor-api", () => ({
  fetchSurvivorStandings: vi.fn(),
  fetchMyPicks: vi.fn(),
  joinSurvivorPool: vi.fn(),
}));

/*
Enough of a board for the standings tab to render rather than sit on its
skeleton; the tab itself is mocked below, so none of it is read. What the tests
below do read is `date_clocks`, which is what decides whether the page keeps
looking for results.
*/
const standings = (date_clocks: DateClock[] = []): SurvivorStandings => ({
  pool_name: "survivor",
  status: SurvivorState.InProgress,
  alive_count: 1,
  eliminated_count: 0,
  revealed_weeks: [],
  rows: [],
  winners: null,
  date_clocks,
});

const answerWith = (date_clocks: DateClock[] = []) =>
  vi
    .mocked(fetchSurvivorStandings)
    .mockResolvedValue({ ok: true, data: standings(date_clocks) });

// The caller's own picks, which is how the page knows whether they still owe
// one. Empty is somebody who has not picked for the date being played.
const myPicks = (picks: SurvivorPickView[] = []) =>
  vi.mocked(fetchMyPicks).mockResolvedValue({ ok: true, data: picks });

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// The tabs' own content, so this file is about the routing between them.
// The pick screen, with its one message back to the page: a pick was filed.
vi.mock("./pick-tab", () => ({
  default: ({ onPickFiled }: { onPickFiled: () => void }) => (
    <button type="button" onClick={onPickFiled}>
      the pick screen
    </button>
  ),
}));
vi.mock("./standings-tab", () => ({
  default: () => <div>the standings</div>,
}));
vi.mock("./admin-tab", () => ({
  default: () => <div>the controls</div>,
}));

const OWNER: SurvivorUser = {
  id: "owner",
  name: "jf",
  status: ParticipantStatus.Alive,
  strikes: 0,
  eliminated_week: null,
  date_joined: 0,
  is_owned: true,
};

const POOL = {
  name: "survivor",
  owner: "owner",
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
  participants: [OWNER],
  weeks: [
    {
      week: 1,
      pick_date: "2026-10-17",
      status: WeekStatus.Open,
      eligible_team_ids: [],
      settled_at: null,
    },
  ],
  winners: null,
  date_updated: 0,
  season: 2026,
  season_start: "2026-10-07",
  season_end: "2027-04-15",
} satisfies SurvivorPool;

beforeEach(() => {
  searchParams = new URLSearchParams();
  userId = "owner";
  routerMock.replace.mockReset();
  vi.mocked(fetchSurvivorStandings).mockReset();
  vi.mocked(fetchMyPicks).mockReset();
  answerWith();
  // A pick already on file, so the nudge is off unless a test asks for it.
  myPicks([
    {
      participant_id: "owner",
      week: 1,
      team_id: 10,
      outcome: PickOutcome.Pending,
    },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

// The interval the page refetches a date in play on, matched to the backend's
// own cache for a day being played.
const LIVE_REFRESH_MS = 3 * 60 * 1000;

describe("SurvivorPoolPage tabs", () => {
  it("opens on the pick screen when the URL names no tab", () => {
    render(<SurvivorPoolPage pool={POOL} />);

    expect(screen.getByText("the pick screen")).toBeInTheDocument();
  });

  it("opens on the tab the URL names", async () => {
    searchParams = new URLSearchParams("activeTab=standings");

    render(<SurvivorPoolPage pool={POOL} />);

    expect(await screen.findByText("the standings")).toBeInTheDocument();
  });

  it("writes the tab to the URL without a history entry or a jump", async () => {
    render(<SurvivorPoolPage pool={POOL} />);

    await userEvent.click(screen.getByRole("tab", { name: /SurvivorPickTab/ }));
    await userEvent.click(
      screen.getByRole("tab", { name: /SurvivorStandingsTab/ }),
    );

    // `replace`, not `push`: a tab is a view of the same page, so Back should
    // not have to walk through every tab somebody looked at.
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(routerMock.replace).toHaveBeenLastCalledWith(
      "/?activeTab=standings",
      { scroll: false },
    );
  });

  it("keeps the rest of the query string", async () => {
    // Nothing else reads one on this page today, but the date strip above it
    // carries `selectedDate`, and dropping that on a tab change would move the
    // whole chrome back to today.
    searchParams = new URLSearchParams("selectedDate=2026-10-17");

    render(<SurvivorPoolPage pool={POOL} />);
    await userEvent.click(
      screen.getByRole("tab", { name: /SurvivorStandingsTab/ }),
    );

    expect(routerMock.replace).toHaveBeenLastCalledWith(
      "/?selectedDate=2026-10-17&activeTab=standings",
      { scroll: false },
    );
  });

  it("lands on the pick screen when the URL names a tab this user has not got", () => {
    // The settings tab is the owner's. Somebody else opening a link to it gets
    // the pick screen rather than an empty page.
    userId = "somebody-else";
    searchParams = new URLSearchParams("activeTab=admin");

    render(<SurvivorPoolPage pool={POOL} />);

    expect(screen.getByText("the pick screen")).toBeInTheDocument();
    expect(screen.queryByText("the controls")).not.toBeInTheDocument();
  });

  it("opens the settings tab for somebody who can administer the pool", () => {
    searchParams = new URLSearchParams("activeTab=admin");

    render(<SurvivorPoolPage pool={POOL} />);

    expect(screen.getByText("the controls")).toBeInTheDocument();
  });

  it("lands on the pick screen for a tab name that is not one of them", () => {
    searchParams = new URLSearchParams("activeTab=whatever");

    render(<SurvivorPoolPage pool={POOL} />);

    expect(screen.getByText("the pick screen")).toBeInTheDocument();
  });
});

describe("SurvivorPoolPage, watching a date in play", () => {
  /*
  Render and wait for the first load to land.

  `shouldAdvanceTime` so the promises the load is made of still settle while
  the clock is held: without it the first fetch never resolves and there is no
  clock to poll on.
  */
  const renderAndSettle = async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<SurvivorPoolPage pool={POOL} />);
    await waitFor(() =>
      expect(fetchSurvivorStandings).toHaveBeenCalledTimes(1),
    );
    /*
    And let that answer land in state before the clock below moves.

    The interval is registered by an effect that depends on the clocks the
    answer carries, so a test that advanced time on the strength of the fetch
    alone would sometimes find no interval to fire — which it did, in the suite
    but not on its own.
    */
    await act(async () => {});
  };

  const tick = async () => {
    await act(async () => {
      vi.advanceTimersByTime(LIVE_REFRESH_MS);
    });
  };

  it("refetches the standings while a date is being played", async () => {
    /*
    What the page is for on a Saturday evening: a game ending now turns a cell
    from "locked in" into won or lost, hours before anybody settles the date.
    Fetched once, the grid would still show the afternoon as it stood when the
    tab was opened.
    */
    answerWith([
      {
        week: 1,
        started_team_ids: [8, 10],
        won_team_ids: [10],
        lost_team_ids: [],
        pick_window_closed: true,
      },
    ]);

    await renderAndSettle();
    await tick();

    expect(fetchSurvivorStandings).toHaveBeenCalledTimes(2);
  });

  it("stops once every game of the date is decided", async () => {
    // Nothing further to learn until somebody settles it, so the interval does
    // not sit there polling a payload that cannot change.
    answerWith([
      {
        week: 1,
        started_team_ids: [8, 10],
        won_team_ids: [10],
        lost_team_ids: [8],
        pick_window_closed: true,
      },
    ]);

    await renderAndSettle();
    await tick();

    expect(fetchSurvivorStandings).toHaveBeenCalledTimes(1);
  });

  it("does not poll a date that has not begun", async () => {
    // A pool with public picks has a clock on the date being played before its
    // first puck drops. Watching that would poll all week.
    answerWith([{ week: 1, started_team_ids: [] }]);

    await renderAndSettle();
    await tick();

    expect(fetchSurvivorStandings).toHaveBeenCalledTimes(1);
  });

  it("does not poll a pool with no date waiting to be settled", async () => {
    await renderAndSettle();
    await tick();

    expect(fetchSurvivorStandings).toHaveBeenCalledTimes(1);
  });
});

describe("SurvivorPoolPage, keeping the standings current", () => {
  it("refetches the standings when a pick has been filed", async () => {
    /*
    The standings belong to the page, and a pick changes them: on a date whose
    picks are public, your own cell appears the moment you file it. Before
    this the grid kept whatever it was fetched with until a reload.
    */
    render(<SurvivorPoolPage pool={POOL} />);
    await waitFor(() =>
      expect(fetchSurvivorStandings).toHaveBeenCalledTimes(1),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "the pick screen" }),
    );

    await waitFor(() =>
      expect(fetchSurvivorStandings).toHaveBeenCalledTimes(2),
    );
  });
});

describe("SurvivorPoolPage, what it tells the person reading it", () => {
  it("marks the pick tab when they still owe a pick for the date being played", async () => {
    /*
    The one nudge the app has. Missing a date is what eliminates most people in
    a survivor pool, and nothing anywhere said so unless you opened the screen
    and read the grid.
    */
    myPicks([]);

    render(<SurvivorPoolPage pool={POOL} />);

    expect(
      await screen.findByLabelText("SurvivorYouHaveNotPicked"),
    ).toBeInTheDocument();
  });

  it("says nothing once the pick is in", async () => {
    render(<SurvivorPoolPage pool={POOL} />);
    await waitFor(() => expect(fetchMyPicks).toHaveBeenCalled());

    expect(
      screen.queryByLabelText("SurvivorYouHaveNotPicked"),
    ).not.toBeInTheDocument();
  });

  it("says nothing to somebody who is not in the pool", async () => {
    // No spot, nothing owed. The badge is about you, so a visitor reading a
    // pool they are not in is nudged about nothing.
    userId = "a-visitor";
    myPicks([]);

    render(<SurvivorPoolPage pool={POOL} />);
    await act(async () => {});

    expect(
      screen.queryByLabelText("SurvivorYouHaveNotPicked"),
    ).not.toBeInTheDocument();
    expect(fetchMyPicks).not.toHaveBeenCalled();
  });

  it("tells somebody who has been eliminated, and what did it", async () => {
    // Previously a skull in the standings, seen next time they happened to
    // look. The team is named because "which pick did it" is the first thing
    // anybody asks.
    const out: SurvivorPool = {
      ...POOL,
      participants: [
        {
          ...OWNER,
          status: ParticipantStatus.Eliminated,
          eliminated_week: 1,
        },
      ],
    };
    vi.mocked(fetchSurvivorStandings).mockResolvedValue({
      ok: true,
      data: {
        ...standings(),
        revealed_weeks: [1],
        rows: [
          {
            participant_id: "owner",
            name: "jf",
            status: ParticipantStatus.Eliminated,
            strikes: 0,
            eliminated_week: 1,
            wins: 0,
            picks: { "1": { team_id: 10, outcome: PickOutcome.Lost } },
          },
        ],
      },
    });

    render(<SurvivorPoolPage pool={out} />);

    expect(
      await screen.findByText('SurvivorYouWereEliminated:{"week":1}'),
    ).toBeInTheDocument();
    expect(screen.getByText(/SurvivorYouWereEliminatedBy/)).toBeInTheDocument();
    // And no nudge: there is nothing left for them to pick.
    expect(
      screen.queryByLabelText("SurvivorYouHaveNotPicked"),
    ).not.toBeInTheDocument();
  });
});
