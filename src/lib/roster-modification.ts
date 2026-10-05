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
    "0",
  )}-${`${date.getDate()}`.padStart(2, "0")}`;

export const getEffectiveRosterDate = (now: Date): string => {
  const effectiveDate = new Date(now);

  if (now.getHours() >= ROSTER_MODIFICATION_CUTOFF_HOUR) {
    effectiveDate.setDate(effectiveDate.getDate() + 1);
  }

  return toDateKey(effectiveDate);
};

export interface BackdateRange {
  // The day a move counts from when no date is picked: what every move did
  // before a date could be named at all.
  defaultDate: string;
  // The earliest day a move can be backdated to. Before opening night there is
  // no day for a lineup to apply to, so the backend lands anything earlier on
  // the season start and so does the picker.
  earliestDate: string;
  // The latest, which is also the default: a move cannot be dated forward. The
  // roster changes the moment the move is filed, so a later date would score a
  // lineup the roster no longer backs until the date came around.
  latestDate: string;
  // Whether there is more than one day to choose between. False on opening day,
  // when today already is the earliest the move could count from.
  canBackdate: boolean;
}

/*
The days a roster move may be made to count from.

Mirrors the backend `validate_roster_move_date` so the picker cannot offer a day
the endpoint would refuse. Picking one is the owner's and the assistants' to do
— it rewrites days already scored — which is the caller's to check, not this
range's.
*/
export const getBackdateRange = (pool: Pool, now: Date): BackdateRange => {
  const filedDate = getEffectiveRosterDate(now);
  const defaultDate =
    filedDate < pool.season_start ? pool.season_start : filedDate;

  // Past the last day of the season the default is a day that is never scored,
  // so the picker stops at the last one that is.
  const latestDate =
    defaultDate > pool.season_end ? pool.season_end : defaultDate;

  return {
    defaultDate,
    earliestDate: pool.season_start,
    latestDate,
    canBackdate: pool.season_start < latestDate,
  };
};

export const getRosterModificationWindow = (
  pool: Pool,
  now: Date,
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
