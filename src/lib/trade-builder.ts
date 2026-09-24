/*
What a trade dialog holds: who may propose on whose behalf, what the dialog
opens on, why a trade would be refused, and the trade document itself.

`create-trade-dialog.tsx` keeps the markup, the toasts and the request; these
rules are here so they can be checked without opening a dialog.
*/

import {
  DraftPick,
  Pool,
  PoolUser,
  Trade,
  TradeStatus,
} from "@/data/pool/model";
import { getPoolerTradablePicks, pickKey } from "@/lib/pool-picks";
import { hasPoolPrivilege } from "@/lib/pool-roster";

// An asset the dialog can be opened on, so the trade starts pre-filled with
// the player or the pick the user clicked somewhere else in the pool.
export interface TradeAsset {
  // Pooler currently owning the asset.
  poolerId: string;
  playerId?: number;
  pick?: DraftPick;
}

export interface TradeSelection {
  fromPoolerId: string;
  toPoolerId: string;
  fromPlayers: Set<number>;
  toPlayers: Set<number>;
  fromPicks: Set<string>;
  toPicks: Set<string>;
  effectiveDate: Date;
}

/*
Poolers the user may propose a trade on behalf of. A regular user only manages
their own team; an owner or an assistant manages all of them.
*/
export function manageableParticipants(
  poolInfo: Pool,
  userId: string | undefined,
): PoolUser[] {
  return poolInfo.participants.filter(
    (participant) =>
      userId === participant.id || hasPoolPrivilege(userId, poolInfo),
  );
}

/*
What the dialog opens on.

Editing an existing trade opens on exactly what it says. Otherwise the user's
own team takes the proposing side, and an asset the dialog was opened on lands
on the side of the pooler owning it — their own side when they manage that team,
the partner side otherwise.
*/
export function initialTradeSelection(
  poolInfo: Pool,
  fromParticipants: PoolUser[],
  userId: string | undefined,
  editingTrade: Trade | null | undefined,
  initialAsset: TradeAsset | null | undefined,
  today: Date,
): TradeSelection {
  if (editingTrade) {
    return {
      fromPoolerId: editingTrade.proposed_by,
      toPoolerId: editingTrade.ask_to,
      fromPlayers: new Set(editingTrade.from_items.players),
      toPlayers: new Set(editingTrade.to_items.players),
      fromPicks: new Set(editingTrade.from_items.picks.map(pickKey)),
      toPicks: new Set(editingTrade.to_items.picks.map(pickKey)),
      effectiveDate: editingTrade.effective_date
        ? new Date(`${editingTrade.effective_date}T00:00:00`)
        : new Date(today),
    };
  }

  const defaultFrom =
    fromParticipants.find((participant) => participant.id === userId)?.id ??
    fromParticipants[0]?.id ??
    "";

  const assetOnFromSide =
    initialAsset != null &&
    (initialAsset.poolerId === defaultFrom ||
      fromParticipants.some(
        (participant) => participant.id === initialAsset.poolerId,
      ));

  const fromPoolerId = assetOnFromSide ? initialAsset!.poolerId : defaultFrom;
  const toPoolerId =
    initialAsset != null && !assetOnFromSide
      ? initialAsset.poolerId
      : (poolInfo.participants.find(
          (participant) => participant.id !== fromPoolerId,
        )?.id ?? "");

  const selection: TradeSelection = {
    fromPoolerId,
    toPoolerId,
    fromPlayers: new Set(),
    toPlayers: new Set(),
    fromPicks: new Set(),
    toPicks: new Set(),
    effectiveDate: new Date(today),
  };

  if (initialAsset?.playerId != null) {
    const players = new Set([initialAsset.playerId]);
    if (assetOnFromSide) {
      selection.fromPlayers = players;
    } else {
      selection.toPlayers = players;
    }
  }

  if (initialAsset?.pick) {
    const picks = new Set([pickKey(initialAsset.pick)]);
    if (assetOnFromSide) {
      selection.fromPicks = picks;
    } else {
      selection.toPicks = picks;
    }
  }

  return selection;
}

// Adds a value to a selection, or takes it back out.
export function toggleInSet<T>(selected: Set<T>, value: T): Set<T> {
  const next = new Set(selected);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

// The picks of one side, as the documents the backend is sent rather than keys.
export function selectedPicksFor(
  poolInfo: Pool,
  poolerId: string,
  selected: Set<string>,
): DraftPick[] {
  return getPoolerTradablePicks(poolInfo, poolerId).filter((pick) =>
    selected.has(pickKey(pick)),
  );
}

/*
Why this trade cannot be filed, as data the caller turns into a message.
`incomplete` covers a side that names no pooler at all, which is not worth a
message: it only happens before the dialog has settled.
*/
export type TradeIssue =
  "not-signed-in" | "incomplete" | "same-pooler" | "no-assets";

export function findTradeIssue(options: {
  isSignedIn: boolean;
  fromPooler: PoolUser | undefined;
  toPooler: PoolUser | undefined;
  selectedCount: number;
}): TradeIssue | null {
  if (!options.isSignedIn) {
    return "not-signed-in";
  }
  if (!options.fromPooler || !options.toPooler) {
    return "incomplete";
  }
  if (options.fromPooler.id === options.toPooler.id) {
    return "same-pooler";
  }
  if (options.selectedCount === 0) {
    return "no-assets";
  }
  return null;
}

export interface BuildTradeOptions {
  poolInfo: Pool;
  fromPoolerId: string;
  toPoolerId: string;
  fromPlayers: Set<number>;
  toPlayers: Set<number>;
  fromPicks: Set<string>;
  toPicks: Set<string>;
  // Only a running pool scores days, so the other states file no date at all.
  effectiveDate: string | null;
  // The trade being replaced, whose id the update carries.
  editingTradeId?: number;
}

export function buildTrade(options: BuildTradeOptions): Trade {
  return {
    proposed_by: options.fromPoolerId,
    ask_to: options.toPoolerId,
    from_items: {
      players: Array.from(options.fromPlayers),
      picks: selectedPicksFor(
        options.poolInfo,
        options.fromPoolerId,
        options.fromPicks,
      ),
    },
    to_items: {
      players: Array.from(options.toPlayers),
      picks: selectedPicksFor(
        options.poolInfo,
        options.toPoolerId,
        options.toPicks,
      ),
    },
    id: options.editingTradeId ?? 0,
    date_created: 0,
    status: TradeStatus.Open,
    effective_date: options.effectiveDate,
    // Stamped by the backend when the trade is filed during a draft.
    draft_pick_index: null,
  };
}
