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
  // The server should not volunteer its framework and version to a scanner.
  poweredByHeader: false,
  async headers() {
    /*
    Deliberately not a Content-Security-Policy. A useful one here has to allow
    the Hanko element scripts, the NHL image CDN and the draft WebSocket, and
    Next needs a per-request nonce through `proxy.ts` for its inline bootstrap
    scripts — that is a change with its own testing story, not a line to slip
    into a release week. These five are the ones that carry no such risk.

    If the reverse proxy in front of this already adds any of them, drop it
    here rather than serving the header twice.
    */
    return [
      {
        source: "/:path*",
        headers: [
          // Stop the browser from second-guessing a declared Content-Type,
          // which is what turns an uploaded file into a script.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Same-origin navigations keep the full referrer, cross-origin ones
          // send the bare origin, and an HTTPS->HTTP downgrade sends nothing.
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Nothing here is meant to be framed, and a pool page inside someone
          // else's frame is a clickjacking target for the draft controls.
          { key: "X-Frame-Options", value: "DENY" },
          // The app asks for none of these, so the grants start empty.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Two years, subdomains included. Deliberately without `preload`:
          // that ships the domain in a browser-baked list and is slow and
          // painful to reverse, which is not a commitment to make days before
          // a first launch.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
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
