/*
The build identifiers shown in the footer, so a bug report can name the exact
frontend and backend builds it came from — and link straight to the release
notes for each.

Both repos cut releases from git tags rather than from package.json /
Cargo.toml (both of which are pinned and never bumped), so the tag is injected
at build time in each repo's Dockerfile and read back here.

`getVersions` is a server-side helper — it reaches the backend via fetch.
Client components receive the values as props from a server component, the same
way `season-info.ts` is consumed.
*/
import { cache } from "react";
import { backendUrl, fetchJson } from "@/lib/server-api";

const WEB_REPO = "https://github.com/jcorriveau23/new-frontend-pool-nhl";
const API_REPO = "https://github.com/jcorriveau23/backend-pool-nhl";

export interface Build {
  version: string;
  // null when the version does not name a published release — see releaseUrl.
  releaseUrl: string | null;
}

export interface Versions {
  // Always present: it is compiled into the bundle, not fetched.
  web: Build;
  // null when the backend is unreachable or too old to serve /version, in
  // which case the footer shows the web build alone.
  api: Build | null;
}

// Inlined into the bundle by Next at build time from the NEXT_PUBLIC_APP_VERSION
// build arg. Unset for `next dev` and for any image built outside the release
// workflow, which is what "dev" marks — deliberately not version-shaped, so it
// can never be mistaken for a release.
export const WEB_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";

// A release page exists only for a real tag. Anything else — "dev", or a value
// some future build injects — is left unlinked rather than pointed at a GitHub
// 404, which is why this tests the shape instead of just excluding "dev".
function releaseUrl(repo: string, version: string): string | null {
  return /^v?\d+\.\d+\.\d+/.test(version)
    ? `${repo}/releases/tag/${encodeURIComponent(version)}`
    : null;
}

// Cached per request so a layout render only ever makes one backend call.
const getBackendBuild = cache(async (): Promise<Build | null> => {
  const payload = await fetchJson<{ version: string }>(backendUrl("/version"), {
    // A given backend build never changes its answer, so this only needs to be
    // fresh enough to catch a deploy. Without it the value would be baked into
    // the static render and outlive the deploy that changed it.
    next: { revalidate: 300 },
  });
  if (!payload?.version) return null;
  return {
    version: payload.version,
    releaseUrl: releaseUrl(API_REPO, payload.version),
  };
});

export const getVersions = cache(async (): Promise<Versions> => ({
  web: {
    version: WEB_VERSION,
    releaseUrl: releaseUrl(WEB_REPO, WEB_VERSION),
  },
  api: await getBackendBuild(),
}));
