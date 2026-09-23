/*
Browser reads of this app's own route handlers (`src/app/api`).

They answer with the document on success and a JSON error otherwise, and the
callers are react-query queries that tell an empty result from a failed request
by the `null` — the same contract the server actions these replaced had.
*/

export async function fetchRouteJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    // fetch only rejects on network-level failures (offline, DNS), which would
    // otherwise surface as an unhandled rejection inside the query.
    return null;
  }
}
