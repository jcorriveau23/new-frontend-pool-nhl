/*
Which draft picks a pool holds, who owns them, and which ones can still be
traded. Mirrors the rules the backend enforces in `PoolContext`, so the trade
dialog never offers a pick the API would refuse.
*/
import { DraftPick, Pool, PoolState } from "@/data/pool/model";

export const pickKey = (pick: DraftPick) => `${pick.round}-${pick.from}`;

// The two states in which the pool holds the picks of a draft that has not
// been played yet.
const isBeforeTheDraft = (poolInfo: Pool): boolean =>
  poolInfo.status === PoolState.Dynasty || poolInfo.status === PoolState.Draft;

/*
The picks a trade can move, for the state the pool is in.

A pool carries two generations of picks at once. Until the draft has been
played — the protection window, then the draft itself — the ones that change
hands are the picks of *that* draft, held in `past_tradable_picks`, which is
also what the draft board reads to know whose turn it is. Once the pool is
running those are spent, and `tradable_picks` holds next season's, which is
what the poolers trade for the rest of the year.
*/
export const getTradablePicks = (poolInfo: Pool): Record<string, string>[] =>
  (isBeforeTheDraft(poolInfo)
    ? poolInfo.context?.past_tradable_picks
    : poolInfo.context?.tradable_picks) ?? [];

/*
Whether a pick has already been played in the draft that is running.

Picks are consumed one per pooler per round, in draft order, so the pick of
`round` belonging to `from` is the `round * poolers + rank of from`th of the
draft — the same arithmetic the draft board uses to lay out its rounds.
Anything below the number of picks made has already become a player on
somebody's roster and can no longer be traded.

Only the draft being played can have spent picks; next season's are all still
to come.
*/
export const isPickUsed = (poolInfo: Pool, pick: DraftPick): boolean => {
  if (!isBeforeTheDraft(poolInfo)) {
    return false;
  }

  const draftOrder = poolInfo.draft_order;
  const rank = draftOrder?.indexOf(pick.from) ?? -1;
  if (!draftOrder || rank < 0) {
    return false;
  }

  return (
    pick.round * draftOrder.length + rank <
    (poolInfo.context?.players_name_drafted.length ?? 0)
  );
};

// Every pick a pooler currently owns, spent ones included.
export const getPoolerPicks = (
  tradablePicks: Record<string, string>[] | null | undefined,
  poolerId: string,
): DraftPick[] => {
  const picks: DraftPick[] = [];
  tradablePicks?.forEach((roundPicksOwner, round) => {
    Object.keys(roundPicksOwner).forEach((from) => {
      if (roundPicksOwner[from] === poolerId) {
        picks.push({ round, from });
      }
    });
  });
  return picks;
};

// The picks a pooler owns and can still put in a trade: the ones of the
// generation that is currently tradable, minus those already played.
export const getPoolerTradablePicks = (
  poolInfo: Pool,
  poolerId: string,
): DraftPick[] =>
  getPoolerPicks(getTradablePicks(poolInfo), poolerId).filter(
    (pick) => !isPickUsed(poolInfo, pick),
  );
