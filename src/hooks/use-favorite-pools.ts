"use client";

import * as React from "react";

// Favorite pools are a per-device preference: there is no backend endpoint to
// store them on, so they live in localStorage, keyed by pool name (the same
// identifier the /pool/[name] route uses).
const STORAGE_KEY = "favorite-pools";

export interface FavoritePool {
  name: string;
  // Season the pool belongs to, e.g. 20252026, used to group the sidebar
  // shortcuts. Null for favorites saved before the season was stored, until a
  // page that knows it calls recordSeason.
  season: number | null;
}

const EMPTY: readonly FavoritePool[] = [];

// Cached between reads so useSyncExternalStore keeps seeing the same reference
// while nothing changes, otherwise it would re-render forever.
let snapshot: readonly FavoritePool[] = EMPTY;
let hasSnapshot = false;
let storageBound = false;

const listeners = new Set<() => void>();

// Favorites used to be stored as a plain list of names, so a string is still a
// valid entry: it simply has no season yet.
const parseEntry = (value: unknown): FavoritePool | null => {
  if (typeof value === "string") {
    return { name: value, season: null };
  }
  if (typeof value === "object" && value !== null) {
    const { name, season } = value as { name?: unknown; season?: unknown };
    if (typeof name === "string") {
      return { name, season: typeof season === "number" ? season : null };
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

interface FavoritePools {
  favorites: readonly FavoritePool[];
  isFavorite: (poolName: string) => boolean;
  toggleFavorite: (poolName: string, season?: number) => void;
  recordSeason: (poolName: string, season: number) => void;
}

export function useFavoritePools(): FavoritePools {
  const favorites = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const isFavorite = React.useCallback(
    (poolName: string) => favorites.some(({ name }) => name === poolName),
    [favorites],
  );

  const toggleFavorite = React.useCallback(
    (poolName: string, season?: number) => {
      const current = getSnapshot();
      write(
        current.some(({ name }) => name === poolName)
          ? current.filter(({ name }) => name !== poolName)
          : [...current, { name: poolName, season: season ?? null }],
      );
    },
    [],
  );

  // Backfills the season of a favorite saved before the season was known, from
  // a page that has it. A no-op for anything else, so it is safe to call on
  // every render of a pool.
  const recordSeason = React.useCallback((poolName: string, season: number) => {
    const current = getSnapshot();
    const entry = current.find(({ name }) => name === poolName);
    if (!entry || entry.season === season) {
      return;
    }
    write(
      current.map((favorite) =>
        favorite.name === poolName ? { ...favorite, season } : favorite,
      ),
    );
  }, []);

  return { favorites, isFavorite, toggleFavorite, recordSeason };
}
