/*
Rendering helpers for component tests.

A component of this app almost never stands alone: it reads react-query, and
anything that lists players reaches `PlayerLink`, which needs the injury
context. `renderWithProviders` supplies both, so a test says what it is testing
instead of restating the provider tree.
*/

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, RenderOptions } from "@testing-library/react";
import * as React from "react";
import { vi } from "vitest";

import { InjuredPlayersProvider } from "@/context/injury-context";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // A failed read is a case under test, not something to sit through four
      // retries of, and cached data must not leak from one test to the next.
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderOptions & { queryClient?: QueryClient } = {},
) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <InjuredPlayersProvider>{children}</InjuredPlayersProvider>
    </QueryClientProvider>
  );

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

export interface RouteStub {
  // Matched against the request url with `includes`, so a path is enough.
  match: string;
  // The parsed body to answer with, or a status for a read that fails.
  json?: unknown;
  status?: number;
}

/*
Stands in for the browser's fetch, answering the app's own route handlers.

Every request is recorded, so a test can assert what was asked for — that a
name search never fired below the minimum length, for instance. Anything not
matched answers 404, which the route reads turn into a failed read.
*/
export function stubFetch(routes: RouteStub[]) {
  const calls: string[] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push(url);

    const route = routes.find((candidate) => url.includes(candidate.match));
    if (route === undefined) {
      return new Response(JSON.stringify({ error: "not stubbed" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(
      route.json === undefined ? null : JSON.stringify(route.json),
      {
        status: route.status ?? 200,
        headers: { "content-type": "application/json" },
      },
    );
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    calls,
    callsMatching: (fragment: string) =>
      calls.filter((url) => url.includes(fragment)),
  };
}

// The injury file every render asks for; a test that cares stubs its own.
export const NO_INJURIES: RouteStub = {
  match: "/injured-players.json",
  json: {},
};
