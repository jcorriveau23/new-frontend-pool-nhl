"use server";

import { GameLanding } from "@/data/nhl/gameLanding";
import { fetchJson } from "@/lib/server-api";

export async function getServerSideGameLanding(
  gameId: string
): Promise<GameLanding | null> {
  /*
  Get the game landing for a specific game id.
  */
  return fetchJson<GameLanding>(
    `https://api-web.nhle.com/v1/gamecenter/${gameId}/landing`,
    { next: { revalidate: 180 } }
  );
}
