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
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ParticipantStatus,
  SurvivorPool,
  SurvivorState,
  SurvivorUser,
  WeekStatus,
} from "@/data/survivor/model";
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
  // Enough of a board for the standings tab to render rather than sit on its
  // skeleton; the tab itself is mocked below, so none of it is read.
  fetchSurvivorStandings: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      pool_name: "survivor",
      status: "InProgress",
      alive_count: 1,
      eliminated_count: 0,
      revealed_weeks: [],
      rows: [],
      winners: null,
    },
  }),
  joinSurvivorPool: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// The tabs' own content, so this file is about the routing between them.
vi.mock("./pick-tab", () => ({
  default: () => <div>the pick screen</div>,
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
});

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
