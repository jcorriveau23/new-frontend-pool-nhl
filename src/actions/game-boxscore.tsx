"use server";

import { GameBoxScore } from "@/data/nhl/gameBoxScore";

export async function getServerSideBoxScore(
  gameId: string
): Promise<GameBoxScore | null> {
  /* 
  Get the game boxscore for a specific game id.
  */
  try {
    const res = await fetch(
      `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`,
      {
        next: { revalidate: 180 },
      }
    );
    if (!res.ok) {
      return null;
    }
    const data: GameBoxScore = await res.json();

    return data;
  } catch (e: unknown) {
    console.error(
      `An error occured while fetching the game boxscore for game ${gameId}: ${e}`
    );
    return null;
  }
}
