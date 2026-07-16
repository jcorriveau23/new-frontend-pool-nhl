"use server";

import { Player } from "@/data/pool/model";
import { backendUrl, fetchJson } from "@/lib/server-api";

export async function getServerSidePlayers(
  positions: string[] | null,
  sortField: string | null,
  descending: boolean | null,
  skip: number | null,
  limit: number | null
): Promise<Player[] | null> {
  /*
  Get the daily stats information. This is being called to query the daily pool scorer.
  */

  positions = positions || ["F", "D"];
  sortField = sortField || "points";
  skip = skip || 0;
  limit = limit || 100;
  descending = descending == null ? true : descending;

  return fetchJson<Player[]>(
    backendUrl(
      `/get-players?active=true&positions=${positions.join(
        ","
      )}&sort=${sortField}&skip=${skip}&limit=${limit}&descending=${descending}`
    ),
    { next: { revalidate: 60 } }
  );
}
