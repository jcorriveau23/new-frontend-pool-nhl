/*
Client-side calls to the Rust backend.

Every browser request to the backend goes through here so the bearer token, the
JSON headers and the error shape are defined once. `next.config.mjs` rewrites
`/api-rust/*` to the backend, so paths stay relative.

Callers get a discriminated result instead of a thrown error: a failed request
is an expected outcome of these mutations (a stale session, a pool renamed by
someone else, the backend down) and the UI reports it with a toast. Only
programming errors are left to throw.
*/

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Reasons a request can fail before or after reaching the backend. The
// backend's own message is forwarded verbatim, it is already user-facing.
const UNAUTHENTICATED = "unauthenticated";
const NETWORK_UNREACHABLE = "the server could not be reached";

function apiUrl(path: string): string {
  return `/api-rust${path.startsWith("/") ? path : `/${path}`}`;
}

async function readError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.length > 0 ? text : `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

// `null` is a valid body for endpoints that answer 204, and some endpoints
// answer 200 with an empty body, so an unparseable body is only an error when
// the caller expects data.
async function readJson<T>(res: Response): Promise<ApiResult<T>> {
  const text = await res.text();
  if (text.length === 0) {
    return { ok: true, data: null as T };
  }
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, error: "the server returned a malformed response" };
  }
}

async function request<T>(
  path: string,
  init: RequestInit
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), init);
  } catch {
    // fetch only rejects on network-level failures (offline, DNS, CORS), which
    // would otherwise surface as an unhandled rejection.
    return { ok: false, error: NETWORK_UNREACHABLE };
  }

  if (!res.ok) {
    return { ok: false, error: await readError(res) };
  }

  return readJson<T>(res);
}

export function apiGet<T>(path: string): Promise<ApiResult<T>> {
  return request<T>(path, { method: "GET" });
}

/*
Authenticated POST. The token is required: passing a missing one used to send
the literal `Bearer undefined` and get a confusing backend error, so an absent
token short-circuits to an `unauthenticated` result instead.
*/
export function apiPost<T>(
  path: string,
  body: unknown,
  jwt: string | null | undefined
): Promise<ApiResult<T>> {
  if (!jwt) {
    return Promise.resolve({ ok: false, error: UNAUTHENTICATED });
  }

  return request<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });
}
