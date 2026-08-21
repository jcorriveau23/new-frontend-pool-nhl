"use server";

import { StandingSeasonData, StandingsData } from "@/data/nhl/standing";
import { fetchJson } from "@/lib/server-api";

export async function getServerSideStandingSeasons(): Promise<StandingSeasonData | null> {
  /*
  Get the list of seasons a standing can be queried for, with the rules in use
  for each of them (ties, loser point, wild card, ...).
  */
  return fetchJson<StandingSeasonData>(
    "https://api-web.nhle.com/v1/standings-season",
    { next: { revalidate: 86400 } }, // revalidate each day
  );
}

export async function getServerSideStanding(
  date: string,
): Promise<StandingsData | null> {
  /*
  Get the standing as of a specific date, `now` for the latest one.
  */
  return fetchJson<StandingsData>(
    `https://api-web.nhle.com/v1/standings/${date}`,
    { next: { revalidate: 21600 } }, // revalidate each 6 hours
  );
}
