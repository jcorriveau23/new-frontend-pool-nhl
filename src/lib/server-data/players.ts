/*
Server-side reads of the NHL api and of the Rust backend.
*/

import { Player } from "@/data/pool/model";
import { backendUrl, fetchJson } from "@/lib/server-api";

/*
Which season's stats to ask for, as a query string fragment.

Omitted means the current season, which is what a player document carries at
the top level. Naming a past one makes the backend swap the stat fields for the
ones it recorded for that season, leaving team, age and cap hit as they are
today — a draft board wants last season's points on this season's roster.
*/
const seasonParam = (season: number | null): string =>
  season === null ? "" : `&season=${season}`;

export async function getServerSidePlayers(
  positions: string[] | null,
  sortField: string | null,
  descending: boolean | null,
  skip: number | null,
  limit: number | null,
  season: number | null = null,
): Promise<Player[] | null> {
  /*
  Get the daily stats information. This is being called to query the daily pool scorer.
  */

  positions = positions || ["F", "D"];
  sortField = sortField || "points";
  skip = skip || 0;
  limit = limit || 100;
  descending = descending == null ? true : descending;

  return fetchJson<Player[]>(
    backendUrl(
      `/get-players?active=true&positions=${positions.join(
        ",",
      )}&sort=${sortField}&skip=${skip}&limit=${limit}&descending=${descending}${seasonParam(
        season,
      )}`,
    ),
    { next: { revalidate: 60 } },
  );
}

export async function searchPlayersByName(
  name: string,
  season: number | null = null,
): Promise<Player[] | null> {
  /*
  Search players by (partial) name. The backend matches on the name only, so
  position filtering and sorting are applied by the caller on the result set.
  */

  // The search takes no other query parameter, so the season leads with a `?`
  // of its own rather than the `&` the list read uses.
  const query = seasonParam(season).replace("&", "?");

  return fetchJson<Player[]>(
    backendUrl(`/get-players/${encodeURIComponent(name)}${query}`),
    { next: { revalidate: 60 } },
  );
}
