import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// The production domains the app is served from. Extra origins (a LAN address
// used to test on a phone, a staging host) are added through
// EXTRA_ALLOWED_ORIGINS as a comma-separated list, so a developer's local
// network address never has to be committed.
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
