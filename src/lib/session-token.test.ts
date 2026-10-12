import { afterEach, describe, expect, it, vi } from "vitest";

import { sessionUserFromToken } from "@/lib/session-token";

const NOW = Date.UTC(2026, 9, 12);
// Seconds, the way `exp` is always expressed.
const HOUR_AHEAD = NOW / 1000 + 3600;
const HOUR_AGO = NOW / 1000 - 3600;

function base64url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// A token only has to look like one: nothing here verifies a signature.
function token(claims: unknown): string {
  return `header.${base64url(JSON.stringify(claims))}.signature`;
}

afterEach(() => {
  vi.useRealTimers();
});

function atNow<T>(read: () => T): T {
  vi.useFakeTimers({ now: NOW });
  try {
    return read();
  } finally {
    vi.useRealTimers();
  }
}

describe("sessionUserFromToken", () => {
  it("reads the subject and the email address", () => {
    const user = atNow(() =>
      sessionUserFromToken(
        token({
          sub: "cf1b44fd-e7a2-471e-8602-4cded1a58e8e",
          email: { address: "jf@example.com", is_primary: true },
          exp: HOUR_AHEAD,
        }),
      ),
    );

    expect(user).toEqual({
      id: "cf1b44fd-e7a2-471e-8602-4cded1a58e8e",
      email: "jf@example.com",
    });
  });

  it("reads a token that carries no expiry", () => {
    expect(sessionUserFromToken(token({ sub: "user-a" }))).toEqual({
      id: "user-a",
      email: undefined,
    });
  });

  it("decodes an address outside latin-1", () => {
    const user = sessionUserFromToken(
      token({ sub: "user-a", email: { address: "jérôme@example.com" } }),
    );

    expect(user?.email).toBe("jérôme@example.com");
  });

  // The point of the expiry check: Hanko returns whatever it has stored, so a
  // tab left open overnight would otherwise come back as signed in.
  it("treats an expired token as no session", () => {
    const user = atNow(() =>
      sessionUserFromToken(token({ sub: "user-a", exp: HOUR_AGO })),
    );

    expect(user).toBeNull();
  });

  it.each([
    ["nothing", undefined],
    ["null", null],
    ["an empty string", ""],
    ["a token with too few segments", "header.payload"],
    ["a token with too many segments", "a.b.c.d"],
    ["a payload that is not base64", "header.!!!!.signature"],
  ])("returns null for %s", (_label, value) => {
    expect(sessionUserFromToken(value)).toBeNull();
  });

  it.each([
    ["a payload that is not an object", 42],
    ["a null payload", null],
    ["claims with no subject", { exp: HOUR_AHEAD }],
    ["an empty subject", { sub: "" }],
    ["a non-string subject", { sub: 7 }],
  ])("returns null for %s", (_label, claims) => {
    expect(sessionUserFromToken(token(claims))).toBeNull();
  });

  it.each([
    ["an email that is not an object", "jf@example.com"],
    ["an email object with no address", { is_primary: true }],
    ["an address that is not a string", { address: 7 }],
  ])("keeps the session but no address for %s", (_label, email) => {
    const user = sessionUserFromToken(token({ sub: "user-a", email }));

    expect(user).toEqual({ id: "user-a", email: undefined });
  });
});
