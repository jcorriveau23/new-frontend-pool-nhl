/*
The SHA-256 of an email address, as lowercase hex.

The backend never publishes the address an account link was filed against: a
pool is readable by anybody who can read the pool, and an invitation waiting on
somebody is not a reason to publish their email address to the whole pool. It
stores the hash of the address instead, so the only way to tell an invitation is
yours is to hash the address you signed in with and compare — which is what this
is for.

It mirrors `hash_email` in the backend, and the two have to agree character for
character: same trim, same case folding, same digest.
*/
export async function hashEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();

  if (normalized.length === 0) {
    return null;
  }

  // Only available over https and on localhost. There is nothing to fall back
  // to, so the caller treats a missing digest as "no invitation to show" rather
  // than reaching for a hand-rolled one.
  if (!globalThis.crypto?.subtle) {
    return null;
  }

  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
