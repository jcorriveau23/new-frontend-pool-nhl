import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GamesNightStatus } from "@/context/games-night-context";
import { Pool } from "@/data/pool/model";
import { testPool, testPoolContext } from "@/test/pool-fixtures";

/*
Which of the two daily views a night lands on.

The pool's own day exists before any of its games do: the backend writes a
zeroed `score_by_day` entry as soon as the date is reachable, so the presence
of that entry says nothing about whether a puck has dropped. The night's
status is what decides, and these pin that — a day of zeros on a schedule that
has not started is the bug this covers.
*/

const DATE = "2026-10-19";

let gamesNightStatus: GamesNightStatus | null = GamesNightStatus.NOT_STARTED;
let poolContext: ReturnType<typeof testPoolContext>;

vi.mock("@/context/games-night-context", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/context/games-night-context")>();
  return { ...actual, useGamesNightContext: () => ({ gamesNightStatus }) };
});

vi.mock("@/context/date-context", () => ({
  useDateContext: () => ({
    currentDate: new Date(`${DATE}T00:00:00`),
    selectedDate: null,
    updateDateWithString: () => {},
  }),
}));

vi.mock("@/context/pool-context", () => ({
  usePoolContext: () => poolContext,
}));

vi.mock("./stats-content", () => ({
  default: () => <div>stats-content</div>,
}));

vi.mock("./preview-content", () => ({
  default: () => <div>preview-content</div>,
}));

vi.mock("@/components/pool-user-selector", () => ({
  PoolerUserGlobalSelector: () => <div>pooler-selector</div>,
}));

import DailyTab from "./daily-tab";

const poolOn = (scoredDays: string[]): Pool => {
  const pool = testPool();
  pool.context!.score_by_day = Object.fromEntries(
    scoredDays.map((day) => [day, {}]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;
  return pool;
};

const setup = (status: GamesNightStatus, scoredDays: string[]) => {
  gamesNightStatus = status;
  poolContext = testPoolContext(poolOn(scoredDays), {
    dailyPointsMade: { dateOfInterest: DATE, totalDailyPoints: [] },
  });
};

beforeEach(() => {
  setup(GamesNightStatus.NOT_STARTED, []);
});

describe("the daily tab", () => {
  it("previews a night that has not started, zeroed day entry and all", () => {
    setup(GamesNightStatus.NOT_STARTED, [DATE]);

    render(<DailyTab />);

    expect(screen.getByText("preview-content")).toBeInTheDocument();
    expect(screen.queryByText("stats-content")).not.toBeInTheDocument();
  });

  it("shows the standings once the night is under way", () => {
    setup(GamesNightStatus.LIVE, [DATE]);

    render(<DailyTab />);

    expect(screen.getByText("stats-content")).toBeInTheDocument();
  });

  it("shows the standings on a night that is over", () => {
    setup(GamesNightStatus.COMPLETED, [DATE]);

    render(<DailyTab />);

    expect(screen.getByText("stats-content")).toBeInTheDocument();
  });

  it("falls back to the preview when the day was never scored", () => {
    setup(GamesNightStatus.COMPLETED, []);

    render(<DailyTab />);

    expect(screen.getByText("preview-content")).toBeInTheDocument();
  });

  it("says so when the schedule is empty", () => {
    setup(GamesNightStatus.NO_GAMES, []);

    render(<DailyTab />);

    expect(screen.getByText("NoGameOnThatDateTitle")).toBeInTheDocument();
    expect(screen.queryByText("preview-content")).not.toBeInTheDocument();
  });
});
