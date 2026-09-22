import { describe, expect, it } from "vitest";

import { planScoreFetch } from "./pool-score-cache";

// A mid-season day, so `today` is inside the season unless a test says otherwise.
const SEASON = { seasonStart: "2025-10-07", seasonEnd: "2026-04-16" };
const TODAY = "2026-01-15";

const plan = (cachedDates: string[], today = TODAY) =>
  planScoreFetch({ ...SEASON, today, cachedDates });

describe("planScoreFetch", () => {
  it("asks for the whole season so far when nothing is cached", () => {
    expect(plan([])).toEqual({
      range: { start: SEASON.seasonStart, end: TODAY },
      trustedCachedDates: [],
    });
  });

  it("resumes from the last cached day rather than the season start", () => {
    const { range } = plan(["2025-10-07", "2025-10-08", "2025-12-31"]);

    expect(range).toEqual({ start: "2025-12-31", end: TODAY });
  });

  it("re-fetches the last cached day instead of starting after it", () => {
    // That day may have been cached while its games were still in progress, so
    // its scores can still change. Starting the day after would freeze a
    // half-played night into the standings permanently.
    const { range } = plan(["2025-12-31"]);

    expect(range?.start).toBe("2025-12-31");
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
    expect(range).toEqual({ start: "2025-10-20", end: TODAY });
  });

  it("ignores cached days in the future", () => {
    // A client whose clock ran ahead can cache a day that has not happened.
    // Pinning the range start to it would skip every real day in between.
    const { range, trustedCachedDates } = plan([
      "2025-11-01",
      "2027-01-01",
    ]);

    expect(trustedCachedDates).toEqual(["2025-11-01"]);
    expect(range).toEqual({ start: "2025-11-01", end: TODAY });
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
    // last element has to be the latest date, not the last one inserted.
    const { range, trustedCachedDates } = plan([
      "2025-12-01",
      "2025-10-20",
      "2025-11-05",
    ]);

    expect(trustedCachedDates).toEqual([
      "2025-10-20",
      "2025-11-05",
      "2025-12-01",
    ]);
    expect(range?.start).toBe("2025-12-01");
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
