import { describe, expect, it } from "vitest";

import { SeasonInfo } from "./season-info";
import { draftStatsSeason } from "./player-table-query";

const season = (id: number, start: string): SeasonInfo => ({
  start_season_date: start,
  end_season_date: `${Math.floor(id / 10000) + 1}-04-15`,
  season: id,
  trade_deadline_date: `${Math.floor(id / 10000) + 1}-03-01`,
});

const SEASONS = [
  season(20242025, "2024-10-08"),
  season(20252026, "2025-10-07"),
  season(20262027, "2026-09-29"),
];

describe("draftStatsSeason", () => {
  it("stays on the current season before a game has been played", () => {
    // Nothing of this season is in the books, so its numbers are last
    // season's finals; there is nothing to protect the board from.
    expect(draftStatsSeason(SEASONS, new Date(2026, 8, 15))).toBe(null);
  });

  it("falls back to the season that just ended once games have counted", () => {
    // Four games in, which is exactly when a late draft goes wrong.
    expect(draftStatsSeason(SEASONS, new Date(2026, 9, 3))).toBe(20252026);
  });

  it("treats opening day itself as started", () => {
    expect(draftStatsSeason(SEASONS, new Date(2026, 8, 29))).toBe(20252026);
  });

  it("stays on the current season when there is no previous one", () => {
    expect(
      draftStatsSeason([season(20262027, "2026-09-29")], new Date(2026, 9, 3)),
    ).toBe(null);
  });

  it("stays on the current season with nothing on record at all", () => {
    expect(draftStatsSeason([], new Date(2026, 9, 3))).toBe(null);
  });

  it("reads a date the backend did not zero-pad", () => {
    const unpadded = [
      season(20242025, "2024-10-08"),
      season(20252026, "2025-10-7"),
    ];

    expect(draftStatsSeason(unpadded, new Date(2025, 9, 8))).toBe(20242025);
    expect(draftStatsSeason(unpadded, new Date(2025, 9, 6))).toBe(null);
  });
});
