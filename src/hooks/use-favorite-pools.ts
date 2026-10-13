"use client";

import * as React from "react";

// Favorite pools are a per-device preference: there is no backend endpoint to
// store them on, so they live in localStorage, keyed by pool name (the same
// identifier the /pool/[name] and /survivor/[name] routes use).
const STORAGE_KEY = "favorite-pools";

/*
Which game a favorite is for.

Part of a favorite's identity rather than a label on it: survivor pools are
their own collection, so a survivor pool and a roster pool may share a name,
and they are on different routes. Everything here takes the kind alongside the
name for that reason.
*/
export type PoolKind = "pool" | "survivor";

export interface FavoritePool {
  kind: PoolKind;
  name: string;
  // Season the pool belongs to, e.g. 20252026, used to group the sidebar
  // shortcuts. Null for favorites saved before the season was stored, until a
  // page that knows it calls recordSeason.
  season: number | null;
}

// Where a favorite links to. The two kinds are separate pages, not two tabs of
// one.
export function poolHref({ kind, name }: FavoritePool): string {
  return kind === "survivor" ? `/survivor/${name}` : `/pool/${name}`;
}

const EMPTY: readonly FavoritePool[] = [];

// Cached between reads so useSyncExternalStore keeps seeing the same reference
// while nothing changes, otherwise it would re-render forever.
let snapshot: readonly FavoritePool[] = EMPTY;
let hasSnapshot = false;
let storageBound = false;

const listeners = new Set<() => void>();

/*
Favorites used to be stored as a plain list of names, so a string is still a
valid entry: it simply has no season yet. And they predate survivor pools, so
an entry with no kind is a roster pool — every favorite saved before this was
one, and reading them as anything else would point the sidebar at a page that
does not exist.
*/
const parseEntry = (value: unknown): FavoritePool | null => {
  if (typeof value === "string") {
    return { kind: "pool", name: value, season: null };
  }
  if (typeof value === "object" && value !== null) {
    const { kind, name, season } = value as {
      kind?: unknown;
      name?: unknown;
      season?: unknown;
    };
    if (typeof name === "string") {
      return {
        kind: kind === "survivor" ? "survivor" : "pool",
        name,
        season: typeof season === "number" ? season : null,
      };
    }
  }
  return null;
};

const readStorage = (): readonly FavoritePool[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) {
      return EMPTY;
    }
    return parsed
      .map(parseEntry)
      .filter((entry): entry is FavoritePool => entry !== null);
  } catch {
    // Corrupted value or storage disabled (private mode, blocked cookies):
    // favorites are a convenience, so degrade to "none" instead of throwing.
    return EMPTY;
  }
};

const emit = () => listeners.forEach((listener) => listener());

const getSnapshot = (): readonly FavoritePool[] => {
  if (!hasSnapshot) {
    snapshot = readStorage();
    hasSnapshot = true;
  }
  return snapshot;
};

// The server has no storage to read, and returning the same empty list keeps
// hydration in sync with what was rendered on the server.
const getServerSnapshot = (): readonly FavoritePool[] => EMPTY;

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  // Bound once for the whole module so a change made in another tab
  // invalidates the cache a single time instead of once per subscriber.
  if (!storageBound) {
    storageBound = true;
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) {
        hasSnapshot = false;
        emit();
      }
    });
  }

  return () => listeners.delete(listener);
};

const write = (favorites: readonly FavoritePool[]) => {
  snapshot = favorites;
  hasSnapshot = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // Keep the in-memory state so the current session still behaves, the
    // preference is simply lost on reload.
  }
  emit();
};

// A favorite is identified by its kind and its name together, never by the name
// alone: the two collections are free to hold a pool of the same name.
const matches = (favorite: FavoritePool, kind: PoolKind, poolName: string) =>
  favorite.kind === kind && favorite.name === poolName;

interface FavoritePools {
  favorites: readonly FavoritePool[];
  isFavorite: (kind: PoolKind, poolName: string) => boolean;
  toggleFavorite: (kind: PoolKind, poolName: string, season?: number) => void;
  recordSeason: (kind: PoolKind, poolName: string, season: number) => void;
}

export function useFavoritePools(): FavoritePools {
  const favorites = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const isFavorite = React.useCallback(
    (kind: PoolKind, poolName: string) =>
      favorites.some((favorite) => matches(favorite, kind, poolName)),
    [favorites],
  );

  const toggleFavorite = React.useCallback(
    (kind: PoolKind, poolName: string, season?: number) => {
      const current = getSnapshot();
      write(
        current.some((favorite) => matches(favorite, kind, poolName))
          ? current.filter((favorite) => !matches(favorite, kind, poolName))
          : [...current, { kind, name: poolName, season: season ?? null }],
      );
    },
    [],
  );

  // Backfills the season of a favorite saved before the season was known, from
  // a page that has it. A no-op for anything else, so it is safe to call on
  // every render of a pool.
  const recordSeason = React.useCallback(
    (kind: PoolKind, poolName: string, season: number) => {
      const current = getSnapshot();
      const entry = current.find((favorite) =>
        matches(favorite, kind, poolName),
      );
      if (!entry || entry.season === season) {
        return;
      }
      write(
        current.map((favorite) =>
          matches(favorite, kind, poolName)
            ? { ...favorite, season }
            : favorite,
        ),
      );
    },
    [],
  );

  return { favorites, isFavorite, toggleFavorite, recordSeason };
}
