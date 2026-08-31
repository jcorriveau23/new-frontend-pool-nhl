/*
The build identifiers shown in the footer, so a bug report can name the exact
frontend and backend builds it came from.

Both repos cut releases from git tags rather than from package.json /
Cargo.toml (both of which are pinned and never bumped), so the tag is injected
at build time in each repo's Dockerfile and read back here.

`getBackendVersion` is a server-side helper — it reaches the backend via fetch.
Client components receive the values as props from a server component, the same
way `season-info.ts` is consumed.
*/
import { cache } from "react";
import { backendUrl, fetchJson } from "@/lib/server-api";

export interface Versions {
  // Always present: it is compiled into the bundle, not fetched.
  web: string;
  // null when the backend is unreachable or too old to serve /version, in
  // which case the footer shows the web version alone.
  api: string | null;
}

// Inlined into the bundle by Next at build time from the NEXT_PUBLIC_APP_VERSION
// build arg. Unset for `next dev` and for any image built outside the release
// workflow, which is what "dev" marks — deliberately not version-shaped, so it
// can never be mistaken for a release.
export const WEB_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";

// Cached per request so a layout render only ever makes one backend call.
export const getBackendVersion = cache(async (): Promise<string | null> => {
  const payload = await fetchJson<{ version: string }>(backendUrl("/version"), {
    // A given backend build never changes its answer, so this only needs to be
    // fresh enough to catch a deploy. Without it the value would be baked into
    // the static render and outlive the deploy that changed it.
    next: { revalidate: 300 },
  });
  return payload?.version ?? null;
});

export const getVersions = cache(
  async (): Promise<Versions> => ({
    web: WEB_VERSION,
    api: await getBackendVersion(),
  })
);
