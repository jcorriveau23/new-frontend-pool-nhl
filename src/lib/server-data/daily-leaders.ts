"use server";

import { DailyLeaders } from "@/data/dailyLeaders/model";
import { backendUrl, fetchJson } from "@/lib/server-api";

export async function getServerSideDailyLeaders(
  keyDay: string
): Promise<DailyLeaders | null> {
  /*
  Get the daily stats information. This is being called to query the daily pool scorer.
  */
  return fetchJson<DailyLeaders>(backendUrl(`/daily_leaders/${keyDay}`), {
    next: { revalidate: 60 },
  });
}
