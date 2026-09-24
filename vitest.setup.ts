/*
What a component test needs before it can render anything.

Two kinds of thing live here: browser APIs jsdom does not implement but the
shadcn/base-ui primitives call, and the Next.js modules that only resolve
inside a running app — next-intl's navigation in particular, which is why
importing a context module used to fail outright under vitest.
*/

import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import * as React from "react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom implements neither, and the sidebar, dialogs and charts all read them.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof window.ResizeObserver;
}

/*
jsdom ships no PointerEvent, and base-ui constructs one to decide whether a
click came from a pointer or the keyboard — a checkbox throws without it.
*/
if (!window.PointerEvent) {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.pointerType = params.pointerType ?? "mouse";
      this.isPrimary = params.isPrimary ?? true;
    }
  }

  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

// Radix and base-ui call these on open/close; jsdom has no layout engine and
// no web-animations, and the scroll area polls `getAnimations` on a timer —
// which throws after the test that opened it has already finished.
Element.prototype.scrollIntoView ??= vi.fn();
Element.prototype.getAnimations ??= (() => []) as never;
Element.prototype.hasPointerCapture ??= (() => false) as never;
Element.prototype.setPointerCapture ??= (() => {}) as never;
Element.prototype.releasePointerCapture ??= (() => {}) as never;

/*
Translations resolve to their own key, so an assertion reads the same in both
locales and a missing message shows up as the key rather than as empty text.
The interpolations are appended, which is what lets a test assert on the value
a message was given.
*/
const translate = (key: string, values?: Record<string, unknown>) =>
  values === undefined || Object.keys(values).length === 0
    ? key
    : `${key}:${JSON.stringify(values)}`;

vi.mock("next-intl", () => ({
  useTranslations: () => translate,
  useLocale: () => "en",
  useFormatter: () => ({
    dateTime: (date: Date) => date.toISOString(),
    number: (value: number) => String(value),
  }),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async () => translate,
  getLocale: async () => "en",
}));

export const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

/*
`@/i18n/routing` is next-intl's navigation wrapper. It cannot resolve under
vitest, and it is what every component reaches for to link or navigate, so it
is replaced by a plain anchor and the router above.
*/
vi.mock("@/i18n/routing", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string | { pathname: string };
    children: React.ReactNode;
  }) =>
    React.createElement(
      "a",
      { href: typeof href === "string" ? href : href.pathname, ...props },
      children,
    ),
  useRouter: () => routerMock,
  usePathname: () => "/",
  redirect: vi.fn(),
  routing: { locales: ["en", "fr"], defaultLocale: "en" },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));
