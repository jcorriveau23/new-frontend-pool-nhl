"use server";

import { DailyLeaders } from "@/data/dailyLeaders/model";

export async function getServerSideDailyLeaders(
  keyDay: string
): Promise<DailyLeaders | null> {
  /* 
  Get the daily stats information. This is being called to query the daily pool scorer.
  */
  try {
    const res = await fetch(
      `http://localhost/api-rust/daily_leaders/${keyDay}`,
      {
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data;
  } catch (e: unknown) {
    console.log(e);
    return null;
  }
}
