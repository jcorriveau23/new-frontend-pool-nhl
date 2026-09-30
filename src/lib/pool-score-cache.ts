/*
Decides which days of pool scores still have to be fetched.

Scores are derived server-side from lineup events and daily stats, and a full
season is expensive to rebuild on every page load. Past days stop changing a few days after
their games are final, so the client keeps them in Dexie and asks the backend
only for the gap and the last few days before it.

This is the decision half of that, kept pure and away from the fetch and the
IndexedDB read in `fetchPoolInfo` so the range arithmetic — which has more edge
cases than it looks — can be tested on its own.

All dates are `yyyy-MM-dd` strings, which order correctly under plain string
comparison and carry no timezone question.
*/

// How many days before the last cached one are fetched again. A day is not
// settled when its last game ends: the poller can miss the end of a night and
// be backfilled the next morning, and the NHL revises scoring for a day or two
// afterwards. Re-fetching only the last cached day froze such a day for good as
// soon as the following one had been cached.
export const REFETCH_TRAILING_DAYS = 3;

// `date` moved back by `days`. Done in UTC so the result depends only on the
// string and not on the timezone of the machine running it.
const daysBefore = (date: string, days: number): string => {
  const moved = new Date(`${date}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() - days);
  return moved.toISOString().slice(0, 10);
};

export interface ScoreFetchPlan {
  // Inclusive bounds of the range to request, or null when there is nothing
  // worth asking for.
  range: { start: string; end: string } | null;
  // The cached days that are still trustworthy. The response is merged over
  // these, so a day present in both takes the freshly derived value.
  trustedCachedDates: string[];
}

export function planScoreFetch({
  seasonStart,
  seasonEnd,
  today,
  cachedDates,
}: {
  seasonStart: string;
  seasonEnd: string;
  today: string;
  // The keys of the locally cached `score_by_day`, in any order.
  cachedDates: readonly string[];
}): ScoreFetchPlan {
  // Never ask beyond today: days that have not happened have no scores, and
  // during a live season `season_end` is months away.
  const end = today < seasonEnd ? today : seasonEnd;

  // Only days inside the current season count. A dynasty pool reuses the same
  // Dexie row across seasons, so without this filter last season's days would
  // be treated as already-fetched and the new season would start at the wrong
  // day. Days after `end` are dropped for the same reason in reverse: a client
  // whose clock ran ahead must not pin the range to a day that has not come.
  const trustedCachedDates = cachedDates
    .filter((date) => date >= seasonStart && date <= end)
    .sort();

  const lastCached = trustedCachedDates[trustedCachedDates.length - 1];

  // Deliberately reaches back past the last cached day rather than starting
  // after it: that day and the few before it may have been stored while their
  // scores could still change, so they are re-fetched and overwritten. Never
  // further back than the season itself.
  const trailingStart = lastCached
    ? daysBefore(lastCached, REFETCH_TRAILING_DAYS)
    : seasonStart;
  const start = trailingStart > seasonStart ? trailingStart : seasonStart;

  // The season has not started yet — a pool created for next year, or the
  // off-season before opening night. Requesting `seasonStart..today` here would
  // send the backend a backwards range.
  if (end < start) {
    return { range: null, trustedCachedDates };
  }

  return { range: { start, end }, trustedCachedDates };
}
