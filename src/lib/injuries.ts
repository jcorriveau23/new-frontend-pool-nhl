/*
Server-side assembly of the NHL injury report.

The injury data itself is scraped from CBS Sports and published as a flat
`playerId -> injury` file. The scraper writes each player's team into it; a file
from before it did carries no team, and for those entries the team is resolved
here against the NHL API instead.
*/

import team_info, { abbrevToTeamId } from "@/lib/teams";
import { siteUrl } from "@/lib/site";

// One injury entry as the scraper writes it. The client-side injury context
// reads the same file with this same type.
export interface InjuredPlayer {
  name: string;
  position: string;
  // The day the player got hurt, already formatted by the scraper ("Thu, Jun 18").
  date: string;
  type: string;
  recovery: string;
  // The NHL team id, `null` for a player with no current team. Absent from files
  // written before the scraper added it.
  team?: number | null;
}

export interface InjuredPlayerWithId extends InjuredPlayer {
  id: number;
}

export interface TeamInjuries {
  // `null` for players the NHL API has on no current roster -- unsigned free
  // agents, mostly, who CBS still reports on.
  teamId: number | null;
  teamName: string | null;
  players: InjuredPlayerWithId[];
}

// The scraper rewrites the file on the host and the reverse proxy serves it, so
// the copy in `public/` is not the one production reads -- it is only there for
// local development. Going through the site origin means the server and the
// browser always read the same file. Point NEXT_PUBLIC_SITE_URL at the dev
// server to work against a local `public/injured-players.json` instead.
const INJURY_FILE_URL = `${siteUrl}/injured-players.json`;

// Rosters move on trade-deadline day at the fastest, so a day-old map is fine.
const ROSTER_REVALIDATE_SECONDS = 86400;
// Matches the player page, so the two share one cache entry per player.
const PLAYER_LANDING_REVALIDATE_SECONDS = 21600;
const INJURY_FILE_REVALIDATE_SECONDS = 3600;

// How many player lookups to have in flight at once, for the players no current
// roster lists. Unbounded, this would fire one request per injured player.
const PLAYER_LOOKUP_CONCURRENCY = 8;

async function fetchJsonOrNull<T>(
  url: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getInjuredPlayers(): Promise<Record<
  string,
  InjuredPlayer
> | null> {
  return fetchJsonOrNull<Record<string, InjuredPlayer>>(INJURY_FILE_URL, {
    next: { revalidate: INJURY_FILE_REVALIDATE_SECONDS },
  });
}

interface RosterResponse {
  forwards?: { id: number }[];
  defensemen?: { id: number }[];
  goalies?: { id: number }[];
}

interface PlayerLandingResponse {
  currentTeamId?: number;
}

/*
Maps every player on a current NHL roster to their team id.

`team_info` still marks a franchise active until its last season is filled in,
so a relocated one (Arizona) is asked for and simply answers 404; a team that
does not resolve is skipped rather than failing the report.
*/
async function getCurrentRosterTeams(): Promise<Record<number, number>> {
  const activeTeams = Object.entries(abbrevToTeamId).filter(
    ([, teamId]) => team_info[teamId]?.lastSeason === null,
  );

  const rosters = await Promise.all(
    activeTeams.map(async ([abbrev, teamId]) => {
      const roster = await fetchJsonOrNull<RosterResponse>(
        `https://api-web.nhle.com/v1/roster/${abbrev}/current`,
        { next: { revalidate: ROSTER_REVALIDATE_SECONDS } },
      );
      return { teamId, roster };
    }),
  );

  const playerTeams: Record<number, number> = {};
  for (const { teamId, roster } of rosters) {
    if (roster === null) {
      continue;
    }
    for (const player of [
      ...(roster.forwards ?? []),
      ...(roster.defensemen ?? []),
      ...(roster.goalies ?? []),
    ]) {
      playerTeams[player.id] = teamId;
    }
  }
  return playerTeams;
}

/*
Looks up the team of players the roster endpoint does not list.

A player on long-term injured reserve is off his team's current roster while
still being under contract to it, which is exactly the population an injury
report is about, so the per-player endpoint gets a second pass at them. Players
it has no current team for either -- unsigned free agents -- stay unresolved.
*/
async function getTeamsForMissingPlayers(
  playerIds: number[],
): Promise<Record<number, number>> {
  const playerTeams: Record<number, number> = {};

  for (let i = 0; i < playerIds.length; i += PLAYER_LOOKUP_CONCURRENCY) {
    const batch = playerIds.slice(i, i + PLAYER_LOOKUP_CONCURRENCY);
    const landings = await Promise.all(
      batch.map(async (playerId) => ({
        playerId,
        landing: await fetchJsonOrNull<PlayerLandingResponse>(
          `https://api-web.nhle.com/v1/player/${playerId}/landing`,
          { next: { revalidate: PLAYER_LANDING_REVALIDATE_SECONDS } },
        ),
      })),
    );
    for (const { playerId, landing } of landings) {
      if (landing?.currentTeamId !== undefined) {
        playerTeams[playerId] = landing.currentTeamId;
      }
    }
  }

  return playerTeams;
}

/*
Resolves the team of every injured player: from the file where the scraper wrote
one, and through the NHL API only for entries that predate the `team` field.
*/
async function resolvePlayerTeams(
  injuredPlayers: Record<string, InjuredPlayer>,
): Promise<Record<number, number>> {
  const playerTeams: Record<number, number> = {};
  const unresolved: number[] = [];

  for (const [playerId, injury] of Object.entries(injuredPlayers)) {
    if (injury.team === undefined) {
      unresolved.push(Number(playerId));
    } else if (injury.team !== null) {
      playerTeams[Number(playerId)] = injury.team;
    }
  }

  if (unresolved.length === 0) {
    return playerTeams;
  }

  const rosterTeams = await getCurrentRosterTeams();
  const missing: number[] = [];
  for (const playerId of unresolved) {
    if (playerId in rosterTeams) {
      playerTeams[playerId] = rosterTeams[playerId];
    } else {
      missing.push(playerId);
    }
  }
  return Object.assign(playerTeams, await getTeamsForMissingPlayers(missing));
}

export async function getInjuriesByTeam(
  injuredPlayers: Record<string, InjuredPlayer>,
): Promise<TeamInjuries[]> {
  return groupInjuriesByTeam(
    injuredPlayers,
    await resolvePlayerTeams(injuredPlayers),
  );
}

/*
Groups the injury report by team, teams in alphabetical order and players by
name within a team. The teamless group, when there is one, sorts last.
*/
export function groupInjuriesByTeam(
  injuredPlayers: Record<string, InjuredPlayer>,
  playerTeams: Record<number, number>,
): TeamInjuries[] {
  const playerIds = Object.keys(injuredPlayers).map(Number);

  const groups = new Map<number | null, InjuredPlayerWithId[]>();
  for (const playerId of playerIds) {
    // A team the app has no name for is no more presentable than no team at
    // all, so both land in the same group rather than the count and the card
    // disagreeing over whether it is a team.
    const resolved = playerTeams[playerId];
    const teamId =
      resolved !== undefined && team_info[resolved]?.fullName ? resolved : null;
    const player = { ...injuredPlayers[String(playerId)], id: playerId };
    groups.set(teamId, [...(groups.get(teamId) ?? []), player]);
  }

  return Array.from(groups, ([teamId, players]) => ({
    teamId,
    teamName: teamId === null ? null : team_info[teamId].fullName,
    players: [...players].sort((a, b) => a.name.localeCompare(b.name)),
  })).sort((a, b) => {
    if (a.teamName === null) {
      return 1;
    }
    if (b.teamName === null) {
      return -1;
    }
    return a.teamName.localeCompare(b.teamName);
  });
}
