"use client";

import * as React from "react";

// Favorite pools are a per-device preference: there is no backend endpoint to
// store them on, so they live in localStorage, keyed by pool name (the same
// identifier the /pool/[name] route uses).
const STORAGE_KEY = "favorite-pools";

const EMPTY: readonly string[] = [];

// Cached between reads so useSyncExternalStore keeps seeing the same reference
// while nothing changes, otherwise it would re-render forever.
let snapshot: readonly string[] = EMPTY;
let hasSnapshot = false;
let storageBound = false;

const listeners = new Set<() => void>();

const readStorage = (): readonly string[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed)
      ? parsed.filter((name): name is string => typeof name === "string")
      : EMPTY;
  } catch {
    // Corrupted value or storage disabled (private mode, blocked cookies):
    // favorites are a convenience, so degrade to "none" instead of throwing.
    return EMPTY;
  }
};

const emit = () => listeners.forEach((listener) => listener());

const getSnapshot = (): readonly string[] => {
  if (!hasSnapshot) {
    snapshot = readStorage();
    hasSnapshot = true;
  }
  return snapshot;
};

// The server has no storage to read, and returning the same empty list keeps
// hydration in sync with what was rendered on the server.
const getServerSnapshot = (): readonly string[] => EMPTY;

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

const write = (favorites: readonly string[]) => {
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
  favorites: readonly string[];
  isFavorite: (poolName: string) => boolean;
  toggleFavorite: (poolName: string) => void;
}

export function useFavoritePools(): FavoritePools {
  const favorites = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const isFavorite = React.useCallback(
    (poolName: string) => favorites.includes(poolName),
    [favorites],
  );

  const toggleFavorite = React.useCallback((poolName: string) => {
    const current = getSnapshot();
    write(
      current.includes(poolName)
        ? current.filter((name) => name !== poolName)
        : [...current, poolName],
    );
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
