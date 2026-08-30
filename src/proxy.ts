// Renamed from `middleware.ts`: the middleware file convention is deprecated
// since Next.js 16 and the file is now `proxy.ts`. next-intl still ships its
// handler under `next-intl/middleware`, which is only the import path.
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames.
  //
  // The asset extensions are excluded so they are served as-is instead of being
  // redirected to a locale prefix. `.webmanifest` matters in particular: the
  // PWA manifest is a single origin-wide document, and a browser that follows a
  // redirect to /en/manifest.webmanifest treats the app as not installable.
  //
  // `.txt` and `.xml` are here for the same reason, for robots.txt and
  // sitemap.xml. Crawlers only ever read those two at the origin root: a 307 to
  // /en/robots.txt reads as "this site has no robots.txt", and the sitemap
  // redirect makes every URL inside it untrusted.
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.(?:json|png|ico|svg|txt|xml|webmanifest)$).*)",
    "/(en|fr)/:path*",
  ],
};
