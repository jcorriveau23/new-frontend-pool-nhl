/*
`isResolved` is the field the pick screen gates its skeleton on, so what
matters here is that it is already true on the first paint and that it tells
"not read yet" apart from "signed out".
*/

import * as React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserSessionProvider, useSession } from "@/context/useSessionData";

const getSessionToken = vi.fn<() => string | null>();
const listeners: Record<string, () => void> = {};

vi.mock("@/context/hanko", () => ({
  getHanko: () => ({
    getSessionToken,
    onSessionCreated: (callback: () => void) => {
      listeners.created = callback;
      return () => delete listeners.created;
    },
    onSessionExpired: (callback: () => void) => {
      listeners.expired = callback;
      return () => delete listeners.expired;
    },
    onUserLoggedOut: (callback: () => void) => {
      listeners.loggedOut = callback;
      return () => delete listeners.loggedOut;
    },
  }),
}));

function Consumer() {
  const { info, isResolved } = useSession();

  return (
    <div>
      <span data-testid="jwt">{info?.jwt === "" ? "empty" : info?.jwt}</span>
      <span data-testid="valid">{String(info?.isValid ?? "none")}</span>
      <span data-testid="resolved">{String(isResolved)}</span>
    </div>
  );
}

function renderConsumer() {
  return render(
    <UserSessionProvider>
      <Consumer />
    </UserSessionProvider>,
  );
}

beforeEach(() => {
  getSessionToken.mockReset();
});

describe("UserSessionProvider", () => {
  // No `await`: reading the token is a local lookup, and it used to sit behind
  // a dynamic import of hanko-elements.
  it("has the token on the first paint", () => {
    getSessionToken.mockReturnValue("a-jwt");

    renderConsumer();

    expect(screen.getByTestId("jwt")).toHaveTextContent("a-jwt");
    expect(screen.getByTestId("valid")).toHaveTextContent("true");
    expect(screen.getByTestId("resolved")).toHaveTextContent("true");
  });

  it("resolves as signed out when there is no token", () => {
    getSessionToken.mockReturnValue(null);

    renderConsumer();

    expect(screen.getByTestId("jwt")).toHaveTextContent("empty");
    expect(screen.getByTestId("valid")).toHaveTextContent("false");
    expect(screen.getByTestId("resolved")).toHaveTextContent("true");
  });

  it("picks up a login that happened elsewhere", () => {
    getSessionToken.mockReturnValue(null);
    renderConsumer();

    getSessionToken.mockReturnValue("a-jwt");
    React.act(() => listeners.created?.());

    expect(screen.getByTestId("jwt")).toHaveTextContent("a-jwt");
  });

  it.each(["expired", "loggedOut"])("drops the token on %s", (event) => {
    getSessionToken.mockReturnValue("a-jwt");
    renderConsumer();

    React.act(() => listeners[event]?.());

    expect(screen.getByTestId("jwt")).toHaveTextContent("empty");
    expect(screen.getByTestId("valid")).toHaveTextContent("false");
  });

  it("throws when used outside the provider", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Consumer />)).toThrow(
      "useSession must be used within a SessionProvider.",
    );

    logged.mockRestore();
  });
});
