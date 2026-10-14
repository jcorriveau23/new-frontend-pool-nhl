/*
Which routes mount the app's live NHL data, and how much of the page needs it.

`main-layout.tsx` is the shell every page renders inside, so until this existed
the score strip and the three reads behind it — the day's games, the day's
leaders and the injury report — ran on every route, the legal pages and the
sign-in screen included, where none of it is displayed.

Two questions, because they have different answers on the landing page. It
*shows* the strip, but the page under it is marketing copy that reads none of
this, and that gap is what lets it be prerendered: `DateProvider` reads
`useSearchParams`, so any page it wraps is rendered on demand. Mounting it
around the strip alone, behind a Suspense boundary, keeps the page itself
static while the strip still appears.

Both lists are deny-lists on purpose. A route added later gets the live chrome
without anyone having to remember to register it, so the cost of forgetting is
a wasted fetch on one page rather than a hockey screen that silently shows no
scores.
*/

// Routes that show no NHL data at all, not even the strip. Written locale-free,
// the way next-intl's `usePathname` reports them: it strips the `[locale]`
// segment, so the French sign-in page is "/login" here and not "/fr/login".
const NO_GAME_FEED_ROUTES = new Set([
  "/login",
  "/privacy-policy",
  "/term-of-service",
]);

/*
Routes whose own content reads none of it. A superset of the above: the landing
page shows the strip above marketing copy, so it belongs here but not there.
Keep it that way — moving "/" out would wrap the landing page in
`DateProvider` and its prerender would fail the build outright, not merely fall
back to rendering on demand.
*/
const CONTENT_ONLY_PAGES = new Set(["/", ...NO_GAME_FEED_ROUTES]);

// Trailing slashes and the empty string all mean the landing page. Normalising
// keeps "/login/" from reading as a hockey route and fetching three times.
function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/**
 * Whether the score strip appears on the route at `pathname`.
 */
export function routeShowsGameFeed(pathname: string): boolean {
  return !NO_GAME_FEED_ROUTES.has(normalizePathname(pathname));
}

/**
 * Whether the page's own content at `pathname` reads live NHL data, and so has
 * to render inside the date, games-night and injury providers. False on the
 * content pages, where only the strip above them needs them — if it needs them
 * at all.
 */
export function routePageReadsNhlData(pathname: string): boolean {
  return !CONTENT_ONLY_PAGES.has(normalizePathname(pathname));
}
