"use client";

import * as React from "react";

// Which roster sections of the Cumulative tab are expanded is a per-device
// preference with no backend to hold it, so it lives in localStorage next to
// the favorite pools. It is keyed by pool name — the same identifier the
// /pool/[name] route uses — because a dynasty pool with tradable picks and a
// plain pool have different sections worth keeping open.
const STORAGE_KEY = "pool-roster-sections";

export type RosterSection =
  "forwards" | "defense" | "goalies" | "reservists" | "picks";

// Reservists and picks stay closed: they are reference lists rather than the
// standings people open the tab for, and leaving all five expanded made the
// roster a very long scroll on a phone.
export const DEFAULT_OPEN_SECTIONS: RosterSection[] = [
  "forwards",
  "defense",
  "goalies",
];

const readStorage = (poolName: string): RosterSection[] | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const stored = (parsed as Record<string, unknown>)[poolName];
    return Array.isArray(stored) ? (stored as RosterSection[]) : null;
  } catch {
    // Corrupted value or storage disabled (private mode, blocked cookies):
    // fall back to the defaults rather than throwing.
    return null;
  }
};

const writeStorage = (poolName: string, sections: RosterSection[]) => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const all =
      typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, RosterSection[]>)
        : {};
    all[poolName] = sections;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // The in-memory state below still drives the current session, the
    // preference is simply lost on reload.
  }
};

/*
Reading storage in the state initialiser is safe here even though it runs
during a render: the pool page fetches `poolInfo` client side and shows a
skeleton until it lands, so this subtree never exists at hydration time.
*/
export function useRosterSections(
  poolName: string,
): [RosterSection[], (sections: RosterSection[]) => void] {
  const [openSections, setOpenSections] = React.useState<RosterSection[]>(
    () => readStorage(poolName) ?? DEFAULT_OPEN_SECTIONS,
  );

  const updateOpenSections = React.useCallback(
    (sections: RosterSection[]) => {
      setOpenSections(sections);
      writeStorage(poolName, sections);
    },
    [poolName],
  );

  return [openSections, updateOpenSections];
}
