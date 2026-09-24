/*
Browser reads of the data this app serves through its own route handlers.

Each one mirrors a function in `@/lib/server-data`, which the handler calls on
the server: the backend url, its query shape and its api key stay there, and
what reaches the browser is a plain GET. `null` means the read failed, which is
what the react-query callers report as an error rather than as "no data".
*/

import { DailyLeaders } from "@/data/dailyLeaders/model";
import { Player } from "@/data/pool/model";
import { Score } from "@/data/nhl/game";
import { fetchRouteJson } from "@/lib/route-api";

// `date` is a yyyy-MM-dd day or "now", which the nhl api resolves itself.
export const fetchDailyGames = (date: string): Promise<Score | null> =>
  fetchRouteJson<Score>(`/api/games/${encodeURIComponent(date)}`);

export const fetchDailyLeaders = (date: string): Promise<DailyLeaders | null> =>
  fetchRouteJson<DailyLeaders>(
    `/api/daily-leaders/${encodeURIComponent(date)}`,
  );

export interface PlayersQuery {
  positions: string[] | null;
  sort: string | null;
  descending: boolean | null;
  skip: number | null;
  limit: number | null;
}

export function fetchPlayers(query: PlayersQuery): Promise<Player[] | null> {
  const params = new URLSearchParams();
  (query.positions ?? []).forEach((position) =>
    params.append("positions", position),
  );
  if (query.sort !== null) {
    params.set("sort", query.sort);
  }
  if (query.descending !== null) {
    params.set("descending", String(query.descending));
  }
  if (query.skip !== null) {
    params.set("skip", String(query.skip));
  }
  if (query.limit !== null) {
    params.set("limit", String(query.limit));
  }

  return fetchRouteJson<Player[]>(`/api/players?${params.toString()}`);
}

export const searchPlayers = (name: string): Promise<Player[] | null> =>
  fetchRouteJson<Player[]>(
    `/api/players/search?name=${encodeURIComponent(name)}`,
  );
