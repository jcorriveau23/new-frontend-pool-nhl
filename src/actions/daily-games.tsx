"use server";

import { Score } from "@/data/nhl/game";

export async function getServerSideDailyGames(
  selectedDate: string
): Promise<Score | null> {
  /* 
  Get the daily score for a specific date.
  */
  try {
    const res = await fetch(
      `https://api-web.nhle.com/v1/score/${selectedDate}`,
      {
        next: { revalidate: 180 },
      }
    );
    if (!res.ok) {
      return null;
    }
    const data: Score = await res.json();

    return data;
  } catch (e: any) {
    console.log(
      `An error occured while fetching the score for ${selectedDate}`
    );
    return null;
  }
}
