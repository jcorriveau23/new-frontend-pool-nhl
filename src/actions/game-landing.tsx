"use server";

import { GameLanding } from "@/data/nhl/gameLanding";

export async function getServerSideGameLanding(
  gameId: string
): Promise<GameLanding | null> {
  /* 
  Get the game landing for a specific game id.
  */
  try {
    const res = await fetch(
      `https://api-web.nhle.com/v1/gamecenter/${gameId}/landing`,
      {
        next: { revalidate: 180 },
      }
    );
    if (!res.ok) {
      return null;
    }
    const data: GameLanding = await res.json();

    return data;
  } catch (e: unknown) {
    console.error(
      `An error occured while fetching the game landing for game ${gameId}: ${e}`
    );
    return null;
  }
}
