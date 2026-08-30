import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/site";

/*
Served at /robots.txt. Lives outside `[locale]` for the same reason as
`manifest.ts`: it is a single origin-wide document, and a crawler that follows
a redirect to /en/robots.txt treats the origin as having no robots file at all.
`proxy.ts` has to leave `.txt` and `.xml` alone for that to hold.
*/

// Paths that must not be indexed, written without the locale prefix.
const PRIVATE_PATHS = [
  // A pool's own pages. The Caddyfile sets Referrer-Policy specifically so a
  // pool name never travels to a third-party site; letting the same name into
  // a search index would undo that far more thoroughly.
  "/pool/",

  // The signed-in user's pool list, and the rest of the authenticated area.
  // These render nothing useful to a crawler anyway — it has no session — so
  // indexing them costs crawl budget and returns an empty shell.
  "/pools/",
  "/create-pool",
  "/profile",
  "/login",
];

export default function robots(): MetadataRoute.Robots {
  // Every page is served under a locale prefix (next-intl's `localePrefix`
  // defaults to `always`), so a bare `/pool/` rule would match no real URL.
  // The rules are expanded per locale rather than written as `/*/pool/`
  // because wildcard support in the middle of a path is a Google extension,
  // not part of the original robots.txt spec.
  const disallow = [
    "/api/",
    ...routing.locales.flatMap((locale) =>
      PRIVATE_PATHS.map((path) => `/${locale}${path}`),
    ),
  ];

  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
