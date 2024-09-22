"use server";

import { Player } from "@/data/pool/model";

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
  limit = limit || 50;
  descending = descending == null ? true : descending;

  const url = `http://localhost/api-rust/get-players?active=true&positions=${positions
    .map((pos) => `${pos}`)
    .join(
      ","
    )}&sort=${sortField}&skip=${skip}&limit=${limit}&descending=${descending}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      const error = await res.text();
      console.log(
        `An error occured while querying the get-players request: ${error}`
      );
      return null;
    }
    return await res.json();
  } catch (e: any) {
    console.log(
      `An error occured while querying the get-players request: ${e}.`
    );
    return null;
  }
}
