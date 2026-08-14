// Renamed from `middleware.ts`: the middleware file convention is deprecated
// since Next.js 16 and the file is now `proxy.ts`. next-intl still ships its
// handler under `next-intl/middleware`, which is only the import path.
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.json$|.*\\.png$).*)", // exclude api, json, png and other route to avoid warning in console.
    "/(en|fr)/:path*",
  ],
};
