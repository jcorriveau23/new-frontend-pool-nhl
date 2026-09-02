import createNextIntlPlugin from "next-intl/plugin";
// Imported from the `/config` entry point: the same re-export on the package
// root is deprecated and warns.
import { withSentryConfig } from "@sentry/nextjs/config";

const withNextIntl = createNextIntlPlugin();

// Source maps are only uploaded when a CI job supplies all three values. A
// normal `npm run build` — a local checkout, a fork, a PR from outside — has
// none of them and skips the upload rather than failing the build.
const sentryUploadEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT
);

// The production domains the app is served from. Extra origins (a LAN address
// used to test on a phone, a staging host) are added through
// EXTRA_ALLOWED_ORIGINS as a comma-separated list, so a developer's local
// network address never has to be committed — and, with no default, never
// ships in a production build either.
const productionOrigins = ["slapshot.xyz", "www.slapshot.xyz"];
const extraOrigins = (process.env.EXTRA_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...productionOrigins, ...extraOrigins];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server bundle so the Docker runtime stage does not
  // need a second `npm ci` or the full node_modules tree.
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.nhle.com",
      },
    ],
  },
  // Next advertises `X-Powered-By: Next.js` unless this is off. Kept here
  // rather than stripped in Caddy because it is Next's own header and this is
  // the switch that stops it being sent at all.
  //
  // The security headers that used to live here now sit in the Caddyfile of
  // the deploy repo, where one copy covers the frontend, the backend and the
  // injury file, and changing them does not need an image rebuild.
  poweredByHeader: false,
  async rewrites() {
    // Proxy client-side /api-rust calls to the backend so the app works
    // without the host reverse proxy (e.g. next dev on localhost:3000).
    return [
      {
        source: "/api-rust/:path*",
        destination: `${process.env.API_URL ?? "http://localhost"}/api-rust/:path*`,
      },
    ];
  },
  allowedDevOrigins: allowedOrigins,
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Without a token there is nothing to upload, and the plugin's default is to
  // say so on every build. Silence it in that case so a normal build stays
  // clean, but keep the output when an upload is actually being attempted —
  // that is when a failure matters.
  silent: !sentryUploadEnabled,
  sourcemaps: {
    disable: !sentryUploadEnabled,
    // Uploaded maps are deleted from the build output afterwards, so the
    // container does not serve the app's source to anyone who asks.
    deleteSourcemapsAfterUpload: true,
  },

  // Routes browser events through this app's own origin instead of straight to
  // ingest.sentry.io. Ad blockers drop requests to Sentry's domain, and the
  // errors most worth seeing come from the people most likely to be running
  // one. It also keeps the CSP connect-src limited to 'self'.
  //
  // A fixed path rather than `true`, which generates a fresh random route on
  // every build: `proxy.ts` has to exclude this path from locale routing, and
  // it cannot exclude a name it does not know. Keep the two in step.
  tunnelRoute: "/monitoring",

  // No build-time telemetry to Sentry about this project.
  telemetry: false,
});
