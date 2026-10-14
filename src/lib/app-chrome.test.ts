import { describe, expect, it } from "vitest";

import { routePageReadsNhlData, routeShowsGameFeed } from "@/lib/app-chrome";

describe("routeShowsGameFeed", () => {
  it("keeps the strip off the pages that show no hockey", () => {
    expect(routeShowsGameFeed("/login")).toBe(false);
    expect(routeShowsGameFeed("/privacy-policy")).toBe(false);
    expect(routeShowsGameFeed("/term-of-service")).toBe(false);
  });

  it("shows it on the landing page", () => {
    expect(routeShowsGameFeed("/")).toBe(true);
  });

  it("shows it on every hockey route", () => {
    expect(routeShowsGameFeed("/pools/20262027")).toBe(true);
    expect(routeShowsGameFeed("/pool/my-pool")).toBe(true);
    expect(routeShowsGameFeed("/survivor/my-pool")).toBe(true);
    expect(routeShowsGameFeed("/standing/2026")).toBe(true);
    expect(routeShowsGameFeed("/players")).toBe(true);
    expect(routeShowsGameFeed("/injuries")).toBe(true);
  });

  it("treats a trailing slash as the same route", () => {
    expect(routeShowsGameFeed("/login/")).toBe(false);
    expect(routeShowsGameFeed("/privacy-policy///")).toBe(false);
    expect(routeShowsGameFeed("/players/")).toBe(true);
  });

  // The deny-list is exact: a page nested under one of those paths is a real
  // route of its own, not the content page, so it keeps the strip.
  it("does not deny-list routes merely nested under a content page", () => {
    expect(routeShowsGameFeed("/login/callback")).toBe(true);
  });
});

describe("routePageReadsNhlData", () => {
  /*
  The landing page is the whole reason these are two questions: it shows the
  strip while its own content reads nothing, which is what allows it to
  prerender. If this ever returns true for "/", the build fails on a
  `useSearchParams` bailout rather than quietly going dynamic.
  */
  it("is false for the landing page even though it shows the strip", () => {
    expect(routeShowsGameFeed("/")).toBe(true);
    expect(routePageReadsNhlData("/")).toBe(false);
  });

  it("is false on the pages that show no hockey at all", () => {
    expect(routePageReadsNhlData("/login")).toBe(false);
    expect(routePageReadsNhlData("/privacy-policy")).toBe(false);
    expect(routePageReadsNhlData("/term-of-service")).toBe(false);
  });

  it("is true on the hockey screens", () => {
    expect(routePageReadsNhlData("/pool/my-pool")).toBe(true);
    expect(routePageReadsNhlData("/pools/20262027")).toBe(true);
    expect(routePageReadsNhlData("/players")).toBe(true);
    expect(routePageReadsNhlData("/profile")).toBe(true);
  });

  it("normalises the pathname the same way", () => {
    expect(routePageReadsNhlData("")).toBe(false);
    expect(routePageReadsNhlData("//")).toBe(false);
    expect(routePageReadsNhlData("/players/")).toBe(true);
  });

  // next-intl hands over a locale-free pathname. If that ever regressed, these
  // would read a locale prefix as a hockey route rather than fail loudly, so
  // this pins the assumption the module is written against.
  it("expects pathnames with no locale prefix", () => {
    expect(routePageReadsNhlData("/en")).toBe(true);
    expect(routePageReadsNhlData("/fr/privacy-policy")).toBe(true);
  });
});
