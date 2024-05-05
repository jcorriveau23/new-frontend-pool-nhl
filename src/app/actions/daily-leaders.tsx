"use server";

export async function getServerSideDailyLeaders(keyDay: string) {
  /* 
  Get the daily stats information. This is being called to query the daily pool scorer.
  */
  try {
    const res = await fetch(
      `http://localhost/api-rust/daily_leaders/${keyDay}`,
      {
        next: { revalidate: 180 },
      }
    );
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch (e: any) {
    return null;
  }
}
