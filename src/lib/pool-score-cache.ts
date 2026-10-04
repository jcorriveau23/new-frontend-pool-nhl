/*
Decides which days of pool scores still have to be fetched, and which of them
are safe to keep.

Scores are derived server-side from lineup events and daily stats, and a full
season is expensive to rebuild on every page load. Past days stop changing a few
days after their games are final, so the client keeps them in Dexie and asks the
backend only for what the cache cannot answer.

This is the decision half of that, kept pure and away from the fetch and the
IndexedDB read in `fetchPoolInfo` so the range arithmetic — which has more edge
cases than it looks — can be tested on its own.

All dates are `yyyy-MM-dd` strings, which order correctly under plain string
comparison and carry no timezone question.

The invariant the whole thing rests on: `/pool-scores/{name}/cumulative/{a}/{b}`
answers with one entry per calendar day of the range, whether or not anybody
played that day, whether or not the day has even happened — a day nothing
happened on and a day that has not happened yet both come back as zeros. So the
cache cannot read a day's contents to tell whether it is final, and a day
missing from the middle of the cache is a hole rather than an off day. Both
facts are what the two rules below exist for.
*/

// How many days back from the end of the range are re-derived on every load. A
// day is not settled when its last game ends: the poller can miss the end of a
// night and be backfilled the next morning, and the NHL revises scoring for a
// day or two afterwards.
export const REFETCH_TRAILING_DAYS = 3;

/*
Marks a Dexie row as written by code that keeps only settled days.

Bumped when the rule that decides what may be cached changes, which drops every
score a previous rule had allowed in. Version 1 — unmarked, since it predates
this field — cached the day it was loaded on, including days whose games had not
been played: those days came back as zeros, were stored as zeros, and then fell
out of the re-derived tail three days later and stayed at zero for the rest of
the season. The standings summed them silently.
*/
export const SCORE_CACHE_VERSION = 2;

// `date` moved by `days`, forwards or backwards. Done in UTC so the result
// depends only on the string and not on the timezone of the machine running it.
const shiftDays = (date: string, days: number): string => {
  const moved = new Date(`${date}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
};

// The last day worth asking about: days that have not happened have no scores,
// and during a live season `season_end` is months away.
const lastDayOfInterest = (seasonEnd: string, today: string): string =>
  today < seasonEnd ? today : seasonEnd;

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
  const end = lastDayOfInterest(seasonEnd, today);

  // Only days inside the current season count. A dynasty pool reuses the same
  // Dexie row across seasons, so without this filter last season's days would
  // be treated as already-fetched and the new season would start at the wrong
  // day. Days after `end` are dropped for the same reason in reverse: a client
  // whose clock ran ahead must not pin the range to a day that has not come.
  const trustedCachedDates = cachedDates
    .filter((date) => date >= seasonStart && date <= end)
    .sort();

  // The first day the cache cannot answer for. The cache is only believed as a
  // dense run from the season start: anything past the first hole is behind a
  // day we have to fetch anyway, so it costs nothing to re-derive it, and
  // believing it instead is how a pool's standings lose a week of the season
  // and never get it back.
  const cached = new Set(trustedCachedDates);
  let firstMissing = seasonStart;
  while (firstMissing <= end && cached.has(firstMissing)) {
    firstMissing = shiftDays(firstMissing, 1);
  }

  // The tail is always re-derived, whatever the cache holds. Anchored on `end`
  // rather than on the last cached day: what makes a day unsettled is how
  // recent it is, not where the cache happens to stop.
  const trailingStart = shiftDays(end, -REFETCH_TRAILING_DAYS);

  const earliest = firstMissing < trailingStart ? firstMissing : trailingStart;
  const start = earliest > seasonStart ? earliest : seasonStart;

  // The season has not started yet — a pool created for next year, or the
  // off-season before opening night. Requesting `seasonStart..today` here would
  // send the backend a backwards range.
  if (end < start) {
    return { range: null, trustedCachedDates };
  }

  return { range: { start, end }, trustedCachedDates };
}

/*
The days of a derived-scores map that may be written to IndexedDB.

Only days older than the re-derived tail: a day inside it, or one that has not
happened, would be stored from a response that is still allowed to change, and
nothing would ever go back for it once the tail moved past. Dropping them costs
nothing — `planScoreFetch` asks for that whole window on every load regardless
of what the cache holds.

`null` in, `null` out, so a pool whose scores were never assembled stays that
way rather than being cached as "no days".
*/
export function settledScoreDates<T>(
  scoreByDay: Record<string, T> | null,
  { seasonEnd, today }: { seasonEnd: string; today: string },
): Record<string, T> | null {
  if (scoreByDay === null) {
    return null;
  }

  const trailingStart = shiftDays(
    lastDayOfInterest(seasonEnd, today),
    -REFETCH_TRAILING_DAYS,
  );

  return Object.fromEntries(
    Object.entries(scoreByDay).filter(([date]) => date < trailingStart),
  );
}
