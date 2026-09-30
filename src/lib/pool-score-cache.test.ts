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

  it("resumes near the last cached day rather than the season start", () => {
    const { range } = plan(["2025-10-07", "2025-10-08", "2025-12-31"]);

    expect(range).toEqual({ start: "2025-12-28", end: TODAY });
  });

  it("re-fetches the days leading up to the last cached one", () => {
    // Those days may have been cached while their scores could still change: a
    // night the poller missed the end of, or a late scoring correction.
    // Starting at the last cached day would freeze them into the standings as
    // soon as the next day had been cached.
    const { range } = plan(["2025-12-29", "2025-12-30", "2025-12-31"]);

    expect(range?.start).toBe("2025-12-28");
  });

  it("reaches back across a month boundary", () => {
    const { range } = plan(["2026-01-02"]);

    expect(range?.start).toBe("2025-12-30");
  });

  it("does not reach back before the season start", () => {
    const { range } = plan(["2025-10-07", "2025-10-08"]);

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
    expect(range).toEqual({ start: "2025-10-17", end: TODAY });
  });

  it("ignores cached days in the future", () => {
    // A client whose clock ran ahead can cache a day that has not happened.
    // Pinning the range start to it would skip every real day in between.
    const { range, trustedCachedDates } = plan(["2025-11-01", "2027-01-01"]);

    expect(trustedCachedDates).toEqual(["2025-11-01"]);
    expect(range).toEqual({ start: "2025-10-29", end: TODAY });
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
    expect(range?.start).toBe("2025-11-28");
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
