/*
Rules deciding when a pooler is allowed to change its starting lineup.

They mirror the backend `modify_roster` validation so the UI can tell the pooler
what is going to happen before it hits save instead of only reporting the error
that comes back.
*/
import { Pool } from "@/data/pool/model";

// Past noon, a roster change is counted for the next day by the backend.
export const ROSTER_MODIFICATION_CUTOFF_HOUR = 12;

export interface RosterModificationWindow {
  // Day the modification would apply to, formatted as "YYYY-MM-DD".
  effectiveDate: string;
  isOpen: boolean;
  // First allowed date from the effective date onward, null when the pool has
  // no modification date left for the season.
  nextOpenDate: string | null;
  upcomingDates: string[];
}

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(
    2,
    "0"
  )}-${`${date.getDate()}`.padStart(2, "0")}`;

export const getEffectiveRosterDate = (now: Date): string => {
  const effectiveDate = new Date(now);

  if (now.getHours() >= ROSTER_MODIFICATION_CUTOFF_HOUR) {
    effectiveDate.setDate(effectiveDate.getDate() + 1);
  }

  return toDateKey(effectiveDate);
};

export const getRosterModificationWindow = (
  pool: Pool,
  now: Date
): RosterModificationWindow => {
  const effectiveDate = getEffectiveRosterDate(now);
  const allowedDates = [...pool.settings.roster_modification_date].sort();
  const upcomingDates = allowedDates.filter((date) => date >= effectiveDate);

  return {
    effectiveDate,
    // The allowed dates only start to matter once the season is running, before
    // that the lineup can be reworked freely.
    isOpen:
      effectiveDate <= pool.season_start ||
      allowedDates.includes(effectiveDate),
    nextOpenDate: upcomingDates[0] ?? null,
    upcomingDates,
  };
};
