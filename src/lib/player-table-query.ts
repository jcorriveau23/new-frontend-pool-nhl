/*
What the players table shows, as state rather than markup: how a click on a
column header, a page button or the position filter changes the query, and how
the name search results are ordered.

`player-table.tsx` keeps the table itself and the URL it pushes; the transitions
live here so they can be checked without a router.
*/

import { Player } from "@/data/pool/model";

export const MINIMUM_SEARCH_CHARACTERS = 3;
export const SEARCH_DEBOUNCE_MS = 300;
export const DEFAULT_PAGE_SIZE = 100;

// The default column each table sorts on. Goalie and skater stats share no
// column, so switching between them cannot keep the current one.
const DEFAULT_SKATER_SORT = "points";
const DEFAULT_GOALIE_SORT = "wins";

export interface PlayerQueryState {
  sortField: string | null;
  descendingOrder: boolean;
  skip: number;
  positions: string[];
}

/*
Sorts the name search results client side: the search endpoint matches on the
name only, so it cannot honour the column the user is sorting on.
*/
export const comparePlayersBy =
  (sortField: string | null, descending: boolean) => (a: Player, b: Player) => {
    const left = a[(sortField ?? DEFAULT_SKATER_SORT) as keyof Player];
    const right = b[(sortField ?? DEFAULT_SKATER_SORT) as keyof Player];

    // Players without the stat (no contract, goalie stat on a skater, ...) go
    // last in both directions rather than pretending to be zeros.
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;

    if (typeof left === "number" && typeof right === "number") {
      return descending ? right - left : left - right;
    }
    return descending
      ? String(right).localeCompare(String(left))
      : String(left).localeCompare(String(right));
  };

/*
A click on a column header: the same column flips the order, a different one
starts descending, and either way the table goes back to its first page.
*/
export function sortByColumn(
  state: PlayerQueryState,
  sortField: string,
): PlayerQueryState {
  return {
    ...state,
    sortField,
    descendingOrder:
      sortField === state.sortField ? !state.descendingOrder : true,
    skip: 0,
  };
}

/*
A page button. Returns null for a move that would land before the first page,
which is the caller's signal to do nothing at all.
*/
export function movePage(
  state: PlayerQueryState,
  pageOffset: number,
  pageSize: number,
): PlayerQueryState | null {
  const skip = state.skip + pageOffset * pageSize;
  return skip < 0 ? null : { ...state, skip };
}

/*
The position filter. Crossing between skaters and goalies resets the sorted
column to that table's default, since the two share none.
*/
export function filterByPositions(
  state: PlayerQueryState,
  positions: string[],
): PlayerQueryState {
  const wasGoalies = state.positions.includes("G");
  const willBeGoalies = positions.includes("G");

  return {
    ...state,
    positions,
    sortField: willBeGoalies
      ? DEFAULT_GOALIE_SORT
      : wasGoalies
        ? DEFAULT_SKATER_SORT
        : (state.sortField ?? DEFAULT_SKATER_SORT),
    skip: 0,
  };
}

// A search only runs once it is worth a request.
export const isSearchActive = (searchTerm: string): boolean =>
  searchTerm.trim().length >= MINIMUM_SEARCH_CHARACTERS;

/*
Which set of columns the table shows.

Searching by name deliberately ignores the position filter, so the results can
hold either kind of player; they fall back to the skater columns unless every
match happens to be a goalie.
*/
export function showGoalieColumns(
  searchActive: boolean,
  players: Player[],
  positions: string[],
): boolean {
  return searchActive
    ? players.length > 0 && players.every((player) => player.position === "G")
    : positions.includes("G");
}
