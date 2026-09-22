// Renamed from `middleware.ts`: the middleware file convention is deprecated
// since Next.js 16 and the file is now `proxy.ts`. next-intl still ships its
// handler under `next-intl/middleware`, which is only the import path.
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

/*
Content-Security-Policy.

This is the one security header that cannot live in the deploy repo's Caddyfile
with the others: a strict policy needs a fresh nonce per request, and only the
process that renders the HTML can put that nonce on the script tags it emits.
Caddy has no way to mint a value Next.js will also use.

Next.js reads the nonce off the *request* `Content-Security-Policy` header and
applies it to the framework scripts, the page bundles and its own inline
scripts, so nothing has to be tagged by hand. That header is internal — it is
attached to the request handed to the renderer and never reaches the browser,
which is what lets report-only mode still produce correctly nonced pages
instead of a page-wide flood of false violations.

Nonces force dynamic rendering. That costs nothing here: every page in this app
already renders per request.
*/

// Report-only by default, so a mistake in the policy above shows up as console
// warnings and reports rather than a blank page. Set CSP_ENFORCE=true once the
// reports come back clean.
const isEnforcing = process.env.CSP_ENFORCE === "true";

const buildCsp = (
  nonce: string,
  { isDev, isSecure }: { isDev: boolean; isSecure: boolean }
): string => {
  // The Hanko instance is a separate origin the browser talks to directly, and
  // it differs per tenant, so it is read from the environment rather than
  // hardcoded. Falls back to nothing when unset, which only affects login.
  const hankoOrigin = (() => {
    const raw = process.env.NEXT_PUBLIC_HANKO_API_URL;
    if (!raw) return "";
    try {
      return new URL(raw).origin;
    } catch {
      return "";
    }
  })();

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    // Matches the X-Frame-Options: DENY already set in Caddy, for the browsers
    // that prefer the CSP directive over the legacy header.
    "frame-ancestors 'none'",
    "form-action 'self'",
    // 'strict-dynamic' lets the nonced Next.js bootstrap load the rest of the
    // chunks without every chunk URL having to be allowlisted. In development
    // React uses eval() to rebuild server stacks in the browser; production
    // does not.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    // 'unsafe-inline' rather than the nonce, deliberately: a nonce covers
    // <style> elements but not inline `style=` attributes, and Recharts, the
    // carousel and the resizable sidebar all position themselves with those.
    // A nonce here would break them while blocking nothing an attacker who can
    // already inject markup could not do with a class.
    "style-src 'self' 'unsafe-inline'",
    // Team logos are SVGs, which next/image serves straight from the remote
    // host instead of through the optimizer — so the origin has to be allowed
    // even though PNG headshots arrive via /_next/image as 'self'.
    "img-src 'self' blob: data: https://assets.nhle.com",
    // next/font self-hosts the Geist faces at build time, so no font CDN.
    "font-src 'self'",
    // 'self' covers the same-origin draft WebSocket (/api-rust/ws) as well as
    // the REST calls the rewrite proxies to the Rust backend.
    `connect-src 'self'${hankoOrigin ? ` ${hankoOrigin}` : ""}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    // Violations are posted to a route handler so they land in the server log,
    // where they can actually be watched. report-uri is deprecated in favour of
    // report-to, but it is the one every current browser still honours.
    "report-uri /api/csp-report",
    // Only when the page itself was served over https. Keyed on the request
    // rather than on NODE_ENV, because a production build served over plain
    // http — `next start` locally, or the container before Caddy fronts it —
    // would otherwise upgrade its own same-origin calls to https://, and a
    // different scheme is a different origin, so `connect-src 'self'` rejects
    // them. The browser reports the pre-upgrade URL, which makes it look like
    // 'self' is failing to match a same-origin request.
    ...(isSecure ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
};

export default function proxy(request: NextRequest): NextResponse {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  // Caddy terminates TLS and forwards over http, so the forwarded header is
  // what says how the browser actually reached us; the request protocol is the
  // fallback for running without a proxy in front.
  // A chain of proxies appends rather than replaces, so the first entry is the
  // one the browser actually spoke.
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isSecure = forwardedProto
    ? forwardedProto.split(",")[0].trim() === "https"
    : request.nextUrl.protocol === "https:";
  const csp = buildCsp(nonce, {
    isDev: process.env.NODE_ENV === "development",
    isSecure,
  });

  // next-intl rebuilds the forwarded request headers from `request.headers`,
  // so anything set here reaches the renderer through its rewrite.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = handleI18nRouting(
    new NextRequest(request, { headers: requestHeaders })
  );

  response.headers.set(
    isEnforcing
      ? "Content-Security-Policy"
      : "Content-Security-Policy-Report-Only",
    csp
  );

  return response;
}

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
  //
  // Next's CSP guide suggests also skipping prefetches here. That does not
  // apply to this app: this proxy does the locale routing too, and a prefetch
  // that skips it would be resolved against the wrong locale.
  //
  // `monitoring` is the Sentry tunnel route configured in next.config.mjs.
  // Locale-redirecting it would break browser error reporting: the SDK POSTs
  // to /monitoring and a 307 to /en/monitoring drops the event.
  matcher: [
    "/((?!api|monitoring|_next/static|_next/image|.*\\.(?:json|png|ico|svg|txt|xml|webmanifest)$).*)",
    "/(en|fr)/:path*",
  ],
};
