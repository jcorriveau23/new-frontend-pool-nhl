/*
Rules deciding when a pooler is allowed to change its starting lineup.

They mirror the backend `modify_roster` validation so the UI can tell the pooler
what is going to happen before it hits save instead of only reporting the error
that comes back.
*/
import { Pool } from "@/data/pool/model";

// Past noon, a roster change is counted for the next day by the backend.
export const ROSTER_MODIFICATION_CUTOFF_HOUR = 12;

/*
The zone that noon is measured in, matching the backend's `clock.rs`.

The pooler's own clock cannot stand in for it. The NHL schedules on Eastern time
and so do the pool's rules, so a laptop set to Pacific reading 10:00 is already
past the cutoff as far as the backend is concerned — and a laptop set to Eastern
reading 11:00 is not, which is the whole point: the two sides have to name the
same zone or the date shown here is not the date the move lands on.
*/
export const POOL_TIME_ZONE = "America/Toronto";

export interface RosterModificationWindow {
  // Day the modification would apply to, formatted as "YYYY-MM-DD".
  effectiveDate: string;
  isOpen: boolean;
  // First allowed date from the effective date onward, null when the pool has
  // no modification date left for the season.
  nextOpenDate: string | null;
  upcomingDates: string[];
}

const poolClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: POOL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

// What a clock on the wall in the pool's zone reads at `now`: the day and the
// hour the cutoff is about to be compared against.
const readPoolClock = (now: Date): { dateKey: string; hour: number } => {
  const parts = poolClock.formatToParts(now);
  const valueOf = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    dateKey: `${valueOf("year")}-${valueOf("month")}-${valueOf("day")}`,
    hour: Number(valueOf("hour")),
  };
};

// Date keys are plain ISO days, so the day is stepped in UTC, where no offset
// and no daylight-saving jump can land it on the wrong one.
const nextDateKey = (dateKey: string): string => {
  const day = new Date(`${dateKey}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);

  return day.toISOString().slice(0, 10);
};

export const getEffectiveRosterDate = (now: Date): string => {
  const { dateKey, hour } = readPoolClock(now);

  return hour >= ROSTER_MODIFICATION_CUTOFF_HOUR
    ? nextDateKey(dateKey)
    : dateKey;
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
