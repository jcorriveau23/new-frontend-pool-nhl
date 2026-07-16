/*
Server-side fetch helpers.

The backend base URL is configurable via the API_URL environment variable so
the app can run without the host reverse proxy (e.g. in a Docker bridge
network with API_URL=http://server:8000). It defaults to the reverse proxy
on localhost.
*/
const API_URL = process.env.API_URL ?? "http://localhost";

export function backendUrl(path: string): string {
  return `${API_URL}/api-rust${path}`;
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      console.error(
        `Request to ${url} failed with status ${res.status}: ${await res.text()}`
      );
      return null;
    }
    return await res.json();
  } catch (e: unknown) {
    console.error(`Request to ${url} failed: ${e}`);
    return null;
  }
}
