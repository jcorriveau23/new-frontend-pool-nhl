"use server";

import { Score } from "@/data/nhl/game";
import { fetchJson } from "@/lib/server-api";

export async function getServerSideDailyGames(
  selectedDate: string
): Promise<Score | null> {
  /*
  Get the daily score for a specific date.
  */
  return fetchJson<Score>(`https://api-web.nhle.com/v1/score/${selectedDate}`, {
    next: { revalidate: 180 },
  });
}
