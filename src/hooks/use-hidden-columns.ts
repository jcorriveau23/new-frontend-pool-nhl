"use client";

import * as React from "react";

/*
Which columns a pooler has hidden in a given table. Like the favorite pools and
the roster sections, this is a per-device preference with no backend to hold
it, so it lives in localStorage — keyed by a caller-chosen id, because the
forwards table and the goalies table have different columns to forget.
*/
const STORAGE_KEY = "pool-table-hidden-columns";

const EMPTY: string[] = [];

const readAll = (): Record<string, string[]> => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, string[]>)
      : {};
  } catch {
    // Corrupted value or storage disabled (private mode, blocked cookies):
    // every column stays visible, which is the safe direction to fail in.
    return {};
  }
};

/*
Reading storage in the state initialiser is safe even though it runs during a
render: every table that opts in lives under a pool page that fetches its data
client side and shows a skeleton until it lands, so this never renders during
hydration.
*/
export function useHiddenColumns(
  storageKey: string | undefined,
): [string[], (columnIds: string[]) => void] {
  const [hidden, setHidden] = React.useState<string[]>(() =>
    storageKey ? (readAll()[storageKey] ?? EMPTY) : EMPTY,
  );

  const updateHidden = React.useCallback(
    (columnIds: string[]) => {
      setHidden(columnIds);
      if (!storageKey) {
        return;
      }
      try {
        const all = readAll();
        if (columnIds.length === 0) {
          delete all[storageKey];
        } else {
          all[storageKey] = columnIds;
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      } catch {
        // The state above still drives the current session; the preference is
        // simply lost on reload.
      }
    },
    [storageKey],
  );

  return [hidden, updateHidden];
}
