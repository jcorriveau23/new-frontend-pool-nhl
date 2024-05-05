"use server";

export async function getServerSideDailyGames(keyDate: string) {
  /* 
  Get the daily stats information. This is being called to query the daily pool scorer.
  */
  try {
    const res = await fetch(
      `http://localhost/api-rust/daily_games/${keyDate}`,
      {
        next: { revalidate: 180 },
      }
    );
    if (!res.ok) {
      return [];
    }
    const data = await res.json();

    return data.games;
  } catch (e: any) {
    return [];
  }
}
