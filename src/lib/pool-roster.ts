import { Pool, PoolUser } from "@/data/pool/model";

/*
Read-only derivations over a pool's rosters.

These live here rather than inside `pool-context.tsx` so they can be tested:
that module is a client component pulling in Dexie and next-intl's navigation,
and cannot be imported outside a browser at all. They run on every render of
every pool page, so a throw in one of them is a blank pool rather than a
degraded one — which is most of why they are worth pinning down.
*/

/*
Maps every drafted player id to the name of the pooler holding them.

Tolerates a participant with no roster entry. The two are separate fields on
the pool and they are not always in step: a participant added to a pool that
has not drafted yet exists in `participants` before `pooler_roster` has a key
for them, and indexing straight into the roster threw on that.
*/
export const getPlayersOwner = (poolInfo: Pool): Record<number, string> => {
  const playersOwner: Record<number, string> = {};
  const rosters = poolInfo.context?.pooler_roster;

  if (!rosters || poolInfo.participants === null) {
    return playersOwner;
  }

  for (const participant of poolInfo.participants) {
    const roster = rosters[participant.id];
    if (!roster) {
      continue;
    }

    for (const players of [
      roster.chosen_forwards,
      roster.chosen_defenders,
      roster.chosen_goalies,
      roster.chosen_reservists,
    ]) {
      for (const playerId of players ?? []) {
        playersOwner[playerId] = participant.name;
      }
    }
  }

  return playersOwner;
};

/*
Maps every protected player id to the name of the pooler protecting them, or
null when the pool has no protection round (a standard, non-dynasty pool).

A protected list can name a user who is no longer a participant — a pooler
removed between seasons — so an unknown id is skipped rather than dereferenced.
*/
export const getProtectedPlayers = (
  poolInfo: Pool,
  dictUsers: Record<string, PoolUser>
): Record<number, string> | null => {
  const protectedByUser = poolInfo.context?.protected_players;

  if (!protectedByUser) {
    return null;
  }

  const protectedPlayers: Record<number, string> = {};

  for (const [userId, players] of Object.entries(protectedByUser)) {
    const user = dictUsers[userId];
    if (!user) {
      continue;
    }
    for (const playerId of players) {
      protectedPlayers[playerId] = user.name;
    }
  }

  return protectedPlayers;
};

/*
The most recent day the pool has scores for, or null when it has none.

`score_by_day` is an object, so its keys arrive in no guaranteed order and the
latest date is the maximum, not the last one inserted.
*/
export const findLastScoredDate = (pool: Pool | null): string | null => {
  const scores = pool?.context?.score_by_day;

  if (!scores) {
    return null;
  }

  let latest: string | null = null;
  for (const date of Object.keys(scores)) {
    if (latest === null || date > latest) {
      latest = date;
    }
  }

  return latest;
};

// Whether this user may act on the pool on everyone's behalf: start the draft,
// edit settings, draft for another pooler. An undefined user is a visitor who
// has not signed in, and never has privilege — including on a pool whose
// assistants list happens to contain an empty string.
export const hasPoolPrivilege = (
  user: string | undefined,
  pool: Pool
): boolean => {
  if (user === undefined) {
    return false;
  }

  return user === pool.owner || pool.settings.assistants.includes(user);
};
