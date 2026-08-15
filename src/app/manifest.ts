import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. This lives outside `[locale]` on purpose:
// the manifest is a single document for the whole origin, and `start_url: "/"`
// lets the proxy pick the locale from the visitor's Accept-Language header the
// same way it does for a normal first visit.
//
// Note: `proxy.ts` must not rewrite this path, or the install will silently
// fail — the browser follows the locale redirect and never sees the manifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "slapshot.xyz — NHL pool",
    short_name: "slapshot.xyz",
    description:
      "Create your own NHL pool and manage draft, alignment changes, trades and dynasty pools.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d1623",
    theme_color: "#0d1623",
    categories: ["sports"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Android crops the tile to the launcher's shape; these keep the logo
      // inside the 80% safe zone so nothing gets clipped.
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
