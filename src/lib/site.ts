/*
The site's public origin, used to build the absolute URLs that robots.txt and
sitemap.xml require — relative paths are invalid in both formats.

Overridable so a staging host does not advertise slapshot.xyz as its canonical
origin, which would point Google at production for pages it crawled elsewhere.
*/
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://slapshot.xyz"
).replace(/\/$/, "");
