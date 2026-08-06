/*
Season date constants, fetched from the Rust backend so the app follows the
current NHL season without a redeploy.

The backend exposes GET /api-rust/season-info returning:
  {
    "start_season_date": "2025-10-7",
    "end_season_date": "2026-04-16",
    "season": 20252026,
    "trade_deadline_date": "2026-03-07"
  }

These are server-side helpers (they reach the backend via fetch). Client
components should receive the derived values as props from a server component.
*/
import { cache } from "react";
import { backendUrl, fetchJson } from "@/lib/server-api";

export interface SeasonInfo {
  start_season_date: string;
  end_season_date: string;
  season: number;
  trade_deadline_date: string;
}

// Used when the backend is unreachable so the UI still renders. Kept in sync
// with the values the endpoint currently returns.
const FALLBACK_SEASON_INFO: SeasonInfo = {
  start_season_date: "2026-09-29",
  end_season_date: "2027-04-10",
  season: 20262027,
  trade_deadline_date: "2027-03-01",
};

// Cached per request so multiple consumers share a single backend call.
export const getSeasonInfo = cache(async (): Promise<SeasonInfo> => {
  const info = await fetchJson<SeasonInfo>(backendUrl("/season-info"), {
    // The season constants change at most once a year; revalidate daily.
    next: { revalidate: 86400 },
  });
  return info ?? FALLBACK_SEASON_INFO;
});

// The current season id, e.g. "20252026".
export const currentSeason = (info: SeasonInfo): string => String(info.season);

// The starting year of the current season, e.g. 2025.
export const lastSeasonYear = (info: SeasonInfo): number =>
  Math.floor(info.season / 10000);

// The current draft year, e.g. "2025".
export const currentDraftYear = (info: SeasonInfo): string =>
  String(lastSeasonYear(info));
