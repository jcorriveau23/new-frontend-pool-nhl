import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

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
    // Not required by anything rendered today: every NHL logo URL ends in
    // `.svg`, and next/image serves `.svg` straight from the CDN rather than
    // proxying it through the optimizer, so those never consult this list.
    // The headshots are the ones that would — and they currently render
    // through `<AvatarImage>`, a plain <img>, which also bypasses it.
    //
    // It is here so that the day a headshot (or any other .png/.jpg on this
    // CDN) is moved to next/image, it works instead of returning
    // `400 "url" parameter is not allowed`. The optimizer is a proxy and
    // refuses any host absent from this list, so the entry is what keeps that
    // refactor from silently breaking images.
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

export default withNextIntl(nextConfig);
