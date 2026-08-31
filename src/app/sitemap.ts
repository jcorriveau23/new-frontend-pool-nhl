import type { MetadataRoute } from "next";
import { getServerSideStandingSeasons } from "@/actions/standing";
import { routing } from "@/i18n/routing";
import { getAllTeamForSeason } from "@/lib/nhl";
import { getSeasonInfo, lastSeasonYear } from "@/lib/season-info";
import { siteUrl } from "@/lib/site";

/*
Served at /sitemap.xml, outside `[locale]` for the same reason as `robots.ts`.

What is deliberately *not* here is the interesting part. Two route families
would dominate this file by count and are both left out:

  - /player/[id] — ~23k players. Every one of these competes with NHL.com,
    ESPN and Hockey-Reference on queries they already own, and none of them
    adds anything those sites do not have. Submitting 23k pages of restated
    third-party stats from a domain with no authority is how a site gets
    classified as thin and suppressed wholesale, taking the pages that could
    have ranked down with it.

  - /game/[id] — thousands per season, interesting for about a day each, and
    stale forever after.

Both remain reachable by internal links, which is the right way to expose an
archive: crawlable, but not asserted as the site's own content.

The archive depth below is a compromise. Older seasons are legitimate pages,
but the crawl budget of a small site is better spent on the ones anyone
actually searches for.
*/

// Seasons of standings, drafts and rosters to advertise, counting back from
// the current one.
const ARCHIVE_SEASONS = 10;

// The NHL standings API is a third party and `fetchJson` returns null when it
// is unreachable. A sitemap missing its standings rows is a much better
// outcome than a 500, which Search Console reads as the whole file being
// broken — so every dynamic section degrades to nothing rather than throwing.
export const revalidate = 86400;

type Entry = MetadataRoute.Sitemap[number];

// One logical page becomes one entry whose canonical URL is the default
// locale, with the other locale declared as an alternate. Emitting both
// locales as separate top-level entries instead would present them as two
// competing pages rather than one page in two languages.
function entry(path: string, rest: Omit<Entry, "url" | "alternates">): Entry {
  return {
    url: `${siteUrl}/${routing.defaultLocale}${path}`,
    ...rest,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [locale, `${siteUrl}/${locale}${path}`]),
      ),
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const seasonInfo = await getSeasonInfo();
  const lastYear = lastSeasonYear(seasonInfo);
  const years = Array.from({ length: ARCHIVE_SEASONS }, (_, i) => lastYear - i);

  const staticPages: Entry[] = [
    entry("", { lastModified: now, changeFrequency: "daily", priority: 1 }),
    entry("/players", {
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    }),
    // `now` is the live standing and the only standings URL worth a high
    // priority; the dated ones below are the archive.
    entry("/standing/now", {
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    }),
    entry("/privacy-policy", { changeFrequency: "yearly", priority: 0.1 }),
    entry("/term-of-service", { changeFrequency: "yearly", priority: 0.1 }),
  ];

  // Historical standings are addressed by the season's last date, not its
  // year — `/standing/2025-04-17`. The list comes from the NHL API, so it is
  // the one section that can come back empty.
  const standingSeasons = await getServerSideStandingSeasons();
  const standingPages: Entry[] = (standingSeasons?.seasons ?? [])
    .slice(-ARCHIVE_SEASONS)
    .map((season) =>
      entry(`/standing/${season.standingsEnd}`, {
        lastModified: new Date(season.standingsEnd),
        changeFrequency: "yearly",
        priority: 0.4,
      }),
    );

  // A closed season's page is frozen, so its `lastmod` has to be frozen too.
  // Stamping `now` on it would be a lie that repeats every time this file is
  // revalidated, and Google's documented response to lastmod it can show to be
  // unreliable is to ignore lastmod for the entire site — spending the credit
  // of the three pages where the date is actually true. Only the current
  // season, which really does change, gets today's date.
  const draftPages: Entry[] = years.map((year, i) =>
    entry(`/draft/${year}`, {
      // The entry draft is held at the end of June, so the page settles in July.
      lastModified: i === 0 ? now : new Date(`${year}-07-01`),
      // Only the most recent draft still changes.
      changeFrequency: i === 0 ? "weekly" : "yearly",
      priority: i === 0 ? 0.7 : 0.4,
    }),
  );

  const rosterSeasonPages: Entry[] = years.map((year, i) =>
    entry(`/roster/${year}${year + 1}`, {
      // A season ends in April; by July its rosters are final for good.
      lastModified: i === 0 ? now : new Date(`${year + 1}-07-01`),
      changeFrequency: i === 0 ? "weekly" : "yearly",
      priority: i === 0 ? 0.7 : 0.4,
    }),
  );

  // Per-team rosters for the current season only. Every past season would
  // multiply this by ~32 for pages nobody searches, which is exactly the
  // thin-content trade the player pages are excluded over.
  const currentSeason = Number(`${lastYear}${lastYear + 1}`);
  const teamPages: Entry[] = getAllTeamForSeason(currentSeason).map((teamId) =>
    entry(`/roster/${currentSeason}/${teamId}`, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    }),
  );

  return [
    ...staticPages,
    ...standingPages,
    ...draftPages,
    ...rosterSeasonPages,
    ...teamPages,
  ];
}
