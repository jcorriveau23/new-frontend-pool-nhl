/*
Server-side reads of the NHL api and of the Rust backend.
*/

import { GameBoxScore } from "@/data/nhl/gameBoxScore";
import { fetchJson } from "@/lib/server-api";

export async function getServerSideBoxScore(
  gameId: string,
): Promise<GameBoxScore | null> {
  /*
  Get the game boxscore for a specific game id.
  */
  return fetchJson<GameBoxScore>(
    `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`,
    { next: { revalidate: 180 } },
  );
}
