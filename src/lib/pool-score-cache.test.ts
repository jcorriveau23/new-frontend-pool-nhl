import { describe, expect, it } from "vitest";

import {
  planScoreFetch,
  SCORE_CACHE_VERSION,
  settledScoreDates,
} from "./pool-score-cache";

// A mid-season day, so `today` is inside the season unless a test says otherwise.
const SEASON = { seasonStart: "2025-10-07", seasonEnd: "2026-04-16" };
const TODAY = "2026-01-15";

const plan = (cachedDates: string[], today = TODAY) =>
  planScoreFetch({ ...SEASON, today, cachedDates });

// Every day from `from` to `to`, which is the shape a cache actually takes: the
// backend answers one entry per calendar day of the range it is given, so a
// cache assembled from its responses has no gaps.
const everyDay = (from: string, to: string): string[] => {
  const days: string[] = [];
  for (let day = from; day <= to;) {
    days.push(day);
    const next = new Date(`${day}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    day = next.toISOString().slice(0, 10);
  }
  return days;
};

describe("planScoreFetch", () => {
  it("asks for the whole season so far when nothing is cached", () => {
    expect(plan([])).toEqual({
      range: { start: SEASON.seasonStart, end: TODAY },
      trustedCachedDates: [],
    });
  });

  it("only re-derives the trailing days of a cache that covers the season", () => {
    const { range } = plan(everyDay(SEASON.seasonStart, TODAY));

    expect(range).toEqual({ start: "2026-01-12", end: TODAY });
  });

  it("re-derives the trailing days whatever the cache claims about them", () => {
    // Those days may have been cached while their scores could still change: a
    // night the poller missed the end of, or a late scoring correction.
    // Believing the cache on them would freeze them into the standings.
    const { range } = plan(everyDay(SEASON.seasonStart, "2026-01-14"));

    expect(range?.start).toBe("2026-01-12");
  });

  it("anchors the trailing window on today, not on the last cached day", () => {
    // A cache that stops short must not pull the window back with it, and one
    // that happens to hold the tail must not push the window past it.
    const { range } = plan(everyDay(SEASON.seasonStart, "2026-01-05"));

    expect(range).toEqual({ start: "2026-01-06", end: TODAY });
  });

  it("re-derives from the first hole in the cache", () => {
    // The bug this exists for: the standings sum the days `score_by_day` holds,
    // so a day missing from the middle is a week of the season silently gone.
    // Nothing used to go back for it — the plan keyed off the latest cached day
    // and took everything below it on faith.
    const cached = everyDay(SEASON.seasonStart, TODAY).filter(
      (day) => day !== "2025-11-20" && day !== "2025-11-21",
    );

    expect(plan(cached).range).toEqual({ start: "2025-11-20", end: TODAY });
  });

  it("does not reach back before the season start", () => {
    const { range } = plan(["2025-10-07", "2025-10-08"], "2025-10-09");

    expect(range?.start).toBe(SEASON.seasonStart);
  });

  it("ignores cached days from a previous season", () => {
    // A dynasty pool reuses one Dexie row across seasons. Trusting last
    // season's days would make the new season resume from a day that is not in
    // it, and the range would start before `season_start`.
    const { range, trustedCachedDates } = plan([
      "2024-11-02",
      "2025-03-30",
      "2025-10-20",
    ]);

    expect(trustedCachedDates).toEqual(["2025-10-20"]);
    expect(range).toEqual({ start: SEASON.seasonStart, end: TODAY });
  });

  it("ignores cached days in the future", () => {
    // A client whose clock ran ahead can cache a day that has not happened.
    const cached = [...everyDay(SEASON.seasonStart, TODAY), "2027-01-01"];
    const { range, trustedCachedDates } = plan(cached);

    expect(trustedCachedDates).not.toContain("2027-01-01");
    expect(range).toEqual({ start: "2026-01-12", end: TODAY });
  });

  it("stops at the end of a season that is already over", () => {
    const { range } = plan([], "2026-08-31");

    expect(range).toEqual({
      start: SEASON.seasonStart,
      end: SEASON.seasonEnd,
    });
  });

  it("asks for nothing before the season has started", () => {
    // A pool created for next season, or the off-season. `season_start..today`
    // would be a backwards range.
    const { range, trustedCachedDates } = plan([], "2025-08-01");

    expect(range).toBeNull();
    expect(trustedCachedDates).toEqual([]);
  });

  it("returns the trusted days sorted, whatever order the cache was in", () => {
    // `score_by_day` is an object, so its key order is not guaranteed and the
    // dense run has to be found by date, not by insertion order.
    const { range, trustedCachedDates } = plan([
      "2025-10-09",
      "2025-10-07",
      "2025-10-08",
    ]);

    expect(trustedCachedDates).toEqual([
      "2025-10-07",
      "2025-10-08",
      "2025-10-09",
    ]);
    expect(range?.start).toBe("2025-10-10");
  });

  it("never asks for a backwards range", () => {
    // The property that actually matters downstream: whatever the cache holds,
    // the backend is never sent start > end.
    const cases: string[][] = [
      [],
      ["2025-10-07"],
      ["2030-01-01"],
      ["2020-01-01"],
      ["2025-10-07", "2026-04-16"],
      everyDay(SEASON.seasonStart, SEASON.seasonEnd),
    ];

    for (const today of ["2025-08-01", "2025-10-07", TODAY, "2030-01-01"]) {
      for (const cached of cases) {
        const { range } = plan(cached, today);
        if (range !== null) {
          expect(range.start <= range.end).toBe(true);
        }
      }
    }
  });

  it("keeps the whole cached season when today is the season start", () => {
    const { range } = plan(["2025-10-07"], "2025-10-07");

    expect(range).toEqual({ start: "2025-10-07", end: "2025-10-07" });
  });
});

describe("settledScoreDates", () => {
  const scores = Object.fromEntries(
    everyDay(SEASON.seasonStart, "2026-01-20").map((day) => [day, day]),
  );

  it("drops the days the plan re-derives on every load", () => {
    // Keeping them is what froze a day stored before its games had been played
    // into the standings for the rest of the season.
    const kept = settledScoreDates(scores, {
      seasonEnd: SEASON.seasonEnd,
      today: TODAY,
    });

    expect(Object.keys(kept!).at(-1)).toBe("2026-01-11");
    expect(kept).not.toHaveProperty("2026-01-12");
  });

  it("keeps everything the plan does not reach back for", () => {
    const kept = settledScoreDates(scores, {
      seasonEnd: SEASON.seasonEnd,
      today: TODAY,
    });

    expect(Object.keys(kept!)).toEqual(
      everyDay(SEASON.seasonStart, "2026-01-11"),
    );
  });

  it("drops days that have not happened", () => {
    // The backend answers for a future day too, with zeros, so they reach the
    // cache like any other day.
    const kept = settledScoreDates(scores, {
      seasonEnd: SEASON.seasonEnd,
      today: TODAY,
    });

    expect(kept).not.toHaveProperty("2026-01-20");
  });

  it("measures the window from the end of a season that is over", () => {
    // Off-season: `today` is months past the last day anybody played, so
    // anchoring on it would let the whole season be cached without ever being
    // re-derived — including the last nights, which settle after it ends.
    const kept = settledScoreDates(
      Object.fromEntries(
        everyDay("2026-04-01", SEASON.seasonEnd).map((day) => [day, day]),
      ),
      { seasonEnd: SEASON.seasonEnd, today: "2026-08-31" },
    );

    expect(Object.keys(kept!).at(-1)).toBe("2026-04-12");
  });

  it("leaves a pool that has no derived days alone", () => {
    // Null is "never assembled", which is not the same as "no days".
    expect(
      settledScoreDates(null, { seasonEnd: SEASON.seasonEnd, today: TODAY }),
    ).toBeNull();
  });
});

describe("SCORE_CACHE_VERSION", () => {
  it("is past the unmarked version that cached unsettled days", () => {
    // Rows written before this field existed read back as undefined, so the
    // version that invalidates them has to be greater than 1.
    expect(SCORE_CACHE_VERSION).toBeGreaterThan(1);
  });
});
