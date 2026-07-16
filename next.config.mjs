import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
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
  experimental: {
    serverActions: {
      allowedOrigins: ["192.168.0.80"],
    },
  },
};

export default withNextIntl(nextConfig);
