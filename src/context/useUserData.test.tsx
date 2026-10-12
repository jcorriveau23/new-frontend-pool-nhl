/*
What these cover is the flicker the survivor page showed on every reload while
signed in: the user was only known once Hanko's `validateSession()` came back
over the network, so the first paint was a signed-out one and the page re-laid
itself out a few hundred milliseconds later. The assertions below are about
*when* the user is known, which is the whole point.
*/

import * as React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserProvider, useUser } from "@/context/useUserData";

const getSessionToken = vi.fn<() => string | null>();
const validateSession = vi.fn();

vi.mock("@/context/hanko", () => ({
  getHanko: () => ({
    getSessionToken,
    validateSession,
    onSessionCreated: () => () => {},
    onSessionExpired: () => () => {},
    onUserLoggedOut: () => () => {},
  }),
}));

function base64url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const HOUR_AHEAD = Math.floor(Date.now() / 1000) + 3600;

function token(claims: Record<string, unknown>): string {
  return `header.${base64url(JSON.stringify({ exp: HOUR_AHEAD, ...claims }))}.signature`;
}

// Never settles, which is what stands in for the round trip still being in
// flight at the moment the page paints.
function pending(): Promise<never> {
  return new Promise(() => {});
}

let commits = 0;

function Consumer() {
  const { info, isResolved } = useUser();

  // Counted in an effect rather than during render: a commit is what costs a
  // re-layout, and a render phase may be thrown away.
  React.useEffect(() => {
    commits += 1;
  });

  return (
    <div>
      <span data-testid="id">{info?.id ?? "none"}</span>
      <span data-testid="email">{info?.email ?? "none"}</span>
      <span data-testid="valid">{String(info?.isValid ?? "none")}</span>
      <span data-testid="resolved">{String(isResolved)}</span>
    </div>
  );
}

function renderConsumer() {
  commits = 0;
  return render(
    <UserProvider>
      <Consumer />
    </UserProvider>,
  );
}

beforeEach(() => {
  getSessionToken.mockReset();
  validateSession.mockReset();
});

describe("UserProvider", () => {
  it("knows the user from the stored token before the server answers", () => {
    getSessionToken.mockReturnValue(
      token({ sub: "user-a", email: { address: "jf@example.com" } }),
    );
    validateSession.mockReturnValue(pending());

    renderConsumer();

    // No `await`: this is the state the first paint is given.
    expect(screen.getByTestId("id")).toHaveTextContent("user-a");
    expect(screen.getByTestId("email")).toHaveTextContent("jf@example.com");
    expect(screen.getByTestId("valid")).toHaveTextContent("true");
    expect(screen.getByTestId("resolved")).toHaveTextContent("true");
  });

  it("resolves as signed out with no token, without waiting either", () => {
    getSessionToken.mockReturnValue(null);
    validateSession.mockReturnValue(pending());

    renderConsumer();

    expect(screen.getByTestId("valid")).toHaveTextContent("false");
    expect(screen.getByTestId("resolved")).toHaveTextContent("true");
  });

  /*
  The second half of the fix. Knowing the user early is no good if the
  confirmation then re-renders everything anyway: the pick screen's loader
  depends on the user id, so a redundant render there meant a redundant refetch
  and a second skeleton.
  */
  it("does not re-render when the server confirms what the token said", async () => {
    getSessionToken.mockReturnValue(
      token({ sub: "user-a", email: { address: "jf@example.com" } }),
    );
    validateSession.mockResolvedValue({
      is_valid: true,
      user_id: "user-a",
      claims: { subject: "user-a", email: { address: "jf@example.com" } },
    });

    renderConsumer();
    const beforeConfirmation = commits;

    await vi.waitFor(() => expect(validateSession).toHaveBeenCalled());
    // Let the `.then` run.
    await Promise.resolve();

    expect(commits).toBe(beforeConfirmation);
    expect(screen.getByTestId("id")).toHaveTextContent("user-a");
  });

  it("signs the user out when the server disagrees with the token", async () => {
    getSessionToken.mockReturnValue(token({ sub: "user-a" }));
    validateSession.mockResolvedValue({ is_valid: false });

    renderConsumer();
    expect(screen.getByTestId("id")).toHaveTextContent("user-a");

    await vi.waitFor(() =>
      expect(screen.getByTestId("valid")).toHaveTextContent("false"),
    );
  });

  /*
  A validate that failed on the network says nothing about whether the session
  is good, so the token stands — losing your session because a request timed
  out would be a worse bug than the one being fixed.
  */
  it("keeps a readable token when the confirmation fails", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    getSessionToken.mockReturnValue(token({ sub: "user-a" }));
    validateSession.mockRejectedValue(new Error("offline"));

    renderConsumer();

    await vi.waitFor(() => expect(logged).toHaveBeenCalled());
    expect(screen.getByTestId("id")).toHaveTextContent("user-a");
    expect(screen.getByTestId("valid")).toHaveTextContent("true");

    logged.mockRestore();
  });

  it("signs out when the confirmation fails and there was no token", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    getSessionToken.mockReturnValue(null);
    validateSession.mockRejectedValue(new Error("offline"));

    renderConsumer();

    await vi.waitFor(() => expect(logged).toHaveBeenCalled());
    expect(screen.getByTestId("valid")).toHaveTextContent("false");

    logged.mockRestore();
  });

  it("throws when used outside the provider", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Consumer />)).toThrow(
      "useUser must be used within a UserProvider",
    );

    logged.mockRestore();
  });
});
