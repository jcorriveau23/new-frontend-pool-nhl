/*
Reading a Hanko session token without asking the server.

`validateSession()` is a round trip to the Hanko cloud — around 350ms — and
until it answered, every screen that branches on who you are rendered as a
signed-out visitor and then re-rendered. The token is already in the browser
and carries the same claims the round trip would report, so it answers on the
first paint and the round trip becomes a confirmation rather than a gate.

Pure on purpose: no Hanko instance, no network, so the rules below are the one
thing that decides whether a stored token counts as a session.
*/

export interface SessionUser {
  id: string;
  email: string | undefined;
}

// Only the claims this app reads. Everything is unknown because the token is
// attacker-supplied input as far as this module is concerned — it is checked
// for a signature by the backend on every call, never here.
interface TokenClaims {
  sub?: unknown;
  email?: unknown;
  exp?: unknown;
}

function decodeClaims(segment: string): unknown {
  // A JWT is base64url, which atob does not accept, and its padding is
  // stripped.
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), (character) =>
    character.charCodeAt(0),
  );
  // The claims hold an email address, which may be outside latin-1.
  return JSON.parse(new TextDecoder().decode(bytes));
}

function emailOf(claim: unknown): string | undefined {
  if (typeof claim !== "object" || claim === null || !("address" in claim)) {
    return undefined;
  }
  return typeof claim.address === "string" ? claim.address : undefined;
}

/*
Who a token says you are, or null for anything that cannot be read as a
session.

An expired token is one of those: Hanko hands back whatever it has stored, so
a tab left open overnight would otherwise come back as signed in. The caller
cannot tell a malformed token from no token at all, and has no reason to —
both mean the same thing on screen.
*/
export function sessionUserFromToken(
  jwt: string | null | undefined,
): SessionUser | null {
  if (!jwt) {
    return null;
  }

  const segments = jwt.split(".");
  if (segments.length !== 3) {
    return null;
  }

  let claims: TokenClaims;
  try {
    const decoded = decodeClaims(segments[1]);
    if (typeof decoded !== "object" || decoded === null) {
      return null;
    }
    claims = decoded as TokenClaims;
  } catch {
    return null;
  }

  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    return null;
  }

  // `exp` is in seconds, the way JWT dates always are.
  if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now()) {
    return null;
  }

  return { id: claims.sub, email: emailOf(claims.email) };
}
