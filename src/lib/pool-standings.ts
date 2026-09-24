/*
The derivations the cumulative tab feeds its tables, charts and selectors from.

They are written against the shape of what `calculatePoolStats` returns rather
than importing its classes, so they stay in `lib` with the rest of the pure pool
logic and a test can hand them plain objects.
*/

import { Pool } from "@/data/pool/model";
import { getPoolerCapUsage, PoolerCapUsage } from "@/lib/lineup-analytics";

// One pooler's standing, as `TotalRanking` exposes it.
export interface RankedParticipant {
  participant: string;
  getTotalPoolPoints(): number;
}

// One player's contribution, as `SkaterInfo` and `GoalieInfo` expose it.
interface ScoredPlayer {
  id: number;
  poolPoints: number;
}

export interface ScoredRoster {
  forwards: ScoredPlayer[];
  defense: ScoredPlayer[];
  goalies: ScoredPlayer[];
}

export interface PoolerEntry {
  id: string;
  name: string;
  rank: number;
  points: number;
}

export interface LineupAnalytics {
  playerPoolPoints: Record<number, number>;
  poolers: (PoolerCapUsage & { poolPoints: number })[];
}

// Standing order, highest total first. The input is left untouched: it is the
// array the stats pass returned, which other derivations still read in place.
export function sortByPoolPoints<T extends RankedParticipant>(
  ranking: T[] | null,
): T[] {
  return ranking === null
    ? []
    : [...ranking].sort(
        (a, b) => b.getTotalPoolPoints() - a.getTotalPoolPoints(),
      );
}

/*
The pooler selector lists everybody in standing order, with their rank and
total so the list doubles as a quick leaderboard.

Participants are indexed once rather than scanned per pooler, which made this
quadratic in the size of the pool.
*/
export function buildPoolerEntries(
  rankedByPoints: RankedParticipant[],
  participants: Pool["participants"] | null,
): PoolerEntry[] {
  const idByName = new Map(
    (participants ?? []).map((user) => [user.name, user.id]),
  );

  return rankedByPoints.map((rank, index) => ({
    id: idByName.get(rank.participant) ?? rank.participant,
    name: rank.participant,
    rank: index + 1,
    points: rank.getTotalPoolPoints(),
  }));
}

/*
Feeds the analysis charts of the lineup dialog. Everything is derived from
stats that were already computed, never from a second `calculatePoolStats` pass.
*/
export function buildLineupAnalytics(
  playerStats: Record<string, ScoredRoster> | null,
  ranking: RankedParticipant[] | null,
  poolInfo: Pool,
): LineupAnalytics {
  if (playerStats === null || ranking === null) {
    return { playerPoolPoints: {}, poolers: [] };
  }

  const playerPoolPoints: Record<number, number> = {};
  for (const roster of Object.values(playerStats)) {
    for (const player of [
      ...roster.forwards,
      ...roster.defense,
      ...roster.goalies,
    ]) {
      playerPoolPoints[player.id] = player.poolPoints;
    }
  }

  // Same indexing as above, for the same reason.
  const totalByParticipant = new Map(
    ranking.map((rank) => [rank.participant, rank.getTotalPoolPoints()]),
  );

  return {
    playerPoolPoints,
    poolers: getPoolerCapUsage(poolInfo).map((usage) => ({
      ...usage,
      poolPoints: totalByParticipant.get(usage.name) ?? 0,
    })),
  };
}

/*
The day the tab is showing.

With no date selected that is the day the nhl api reports as "now" (what the
date picker shows), which lands outside of the season during the off-season —
the pool context falls back to the last day of the pool instead, so its
`dateOfInterest` cannot answer which day is on screen.
*/
export function resolveDisplayedDate(
  querySelectedDate: string,
  scoreCurrentDate: string | undefined,
  today: string,
  dateOfInterest: string,
): string {
  return querySelectedDate === "now"
    ? (scoreCurrentDate ?? today)
    : dateOfInterest;
}

/*
Whether the displayed day belongs to the pool, which is what decides if the
daily points columns mean anything. All three values are yyyy-MM-dd strings,
which compare exactly without any timezone question.
*/
export function isDateInPoolRange(displayedDate: string, poolInfo: Pool) {
  return (
    displayedDate >= poolInfo.season_start &&
    displayedDate <= poolInfo.season_end
  );
}
