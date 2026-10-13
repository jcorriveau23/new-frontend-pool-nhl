import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/*
The favorites store, which is localStorage and a module-level cache.

What these are here for is the stored shape, because it has been through three:
a plain list of names, then names with a season, and now a pool kind alongside
the name. Every favorite anybody has saved is in one of the older two, and
reading one of them as the wrong kind points its sidebar shortcut at a page
that does not exist.

The module caches its snapshot so `useSyncExternalStore` keeps seeing one
reference, so each test re-imports it rather than sharing that cache.
*/
const load = async () => {
  vi.resetModules();
  return import("./use-favorite-pools");
};

const stored = () =>
  JSON.parse(window.localStorage.getItem("favorite-pools") ?? "null");

beforeEach(() => {
  window.localStorage.clear();
});

describe("useFavoritePools", () => {
  it("reads a favorite saved as a bare name as a roster pool", async () => {
    window.localStorage.setItem("favorite-pools", JSON.stringify(["old-pool"]));
    const { useFavoritePools, poolHref } = await load();

    const { result } = renderHook(() => useFavoritePools());

    expect(result.current.favorites).toEqual([
      { kind: "pool", name: "old-pool", season: null },
    ]);
    expect(poolHref(result.current.favorites[0])).toBe("/pool/old-pool");
  });

  it("reads a favorite saved before the kind existed as a roster pool", async () => {
    window.localStorage.setItem(
      "favorite-pools",
      JSON.stringify([{ name: "old-pool", season: 20252026 }]),
    );
    const { useFavoritePools } = await load();

    const { result } = renderHook(() => useFavoritePools());

    expect(result.current.isFavorite("pool", "old-pool")).toBe(true);
    expect(result.current.isFavorite("survivor", "old-pool")).toBe(false);
  });

  it("keeps a roster pool and a survivor pool of the same name apart", async () => {
    const { useFavoritePools, poolHref } = await load();
    const { result } = renderHook(() => useFavoritePools());

    act(() => result.current.toggleFavorite("survivor", "shared", 20262027));

    expect(result.current.isFavorite("survivor", "shared")).toBe(true);
    // The two collections may each hold a pool called "shared", so starring one
    // must not star the other.
    expect(result.current.isFavorite("pool", "shared")).toBe(false);

    act(() => result.current.toggleFavorite("pool", "shared", 20262027));
    expect(result.current.favorites).toHaveLength(2);
    expect(result.current.favorites.map(poolHref)).toEqual([
      "/survivor/shared",
      "/pool/shared",
    ]);

    // And unstarring one leaves the other alone.
    act(() => result.current.toggleFavorite("survivor", "shared"));
    expect(result.current.isFavorite("survivor", "shared")).toBe(false);
    expect(result.current.isFavorite("pool", "shared")).toBe(true);
  });

  it("stores the kind, so a reload does not forget which page it was", async () => {
    const { useFavoritePools } = await load();
    const { result } = renderHook(() => useFavoritePools());

    act(() =>
      result.current.toggleFavorite("survivor", "beat-the-field", 2026),
    );

    expect(stored()).toEqual([
      { kind: "survivor", name: "beat-the-field", season: 2026 },
    ]);
  });

  it("backfills the season of the favorite it was asked about", async () => {
    window.localStorage.setItem(
      "favorite-pools",
      JSON.stringify([
        { kind: "pool", name: "shared", season: null },
        { kind: "survivor", name: "shared", season: null },
      ]),
    );
    const { useFavoritePools } = await load();
    const { result } = renderHook(() => useFavoritePools());

    act(() => result.current.recordSeason("survivor", "shared", 20262027));

    expect(stored()).toEqual([
      { kind: "pool", name: "shared", season: null },
      { kind: "survivor", name: "shared", season: 20262027 },
    ]);
  });
});
