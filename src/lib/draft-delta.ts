/*
Applies the draft socket deltas to the pool the client already holds.

The draft used to rebroadcast the whole pool on every pick. That payload grows
with each drafted player (it carries the full record of every player picked so
far) and goes to every socket of the room, so a full draft moved tens of
megabytes of almost entirely unchanged data. The backend now sends only what a
pick changed and these reducers fold it in.

Both reducers return `null` when the delta cannot be applied on top of the pool
they were given, which means the client missed an update (a dropped frame, a
reconnect) and has to refetch the pool instead of rendering a corrupted board.
*/
import {
  DraftPickUndoneResponse,
  PlayerDraftedResponse,
  Pool,
  RosterModifiedResponse,
} from "@/data/pool/model";

/*
Whether a whole pool pushed by the room is newer than the one we hold.

`date_updated` is the pool's version stamp, which the backend forces to
strictly increase on every write, so anything not newer is behind us.
*/
export const isPoolBroadcastNewer = (current: Pool, incoming: Pool): boolean =>
  incoming.date_updated > current.date_updated;

export const applyPlayerDrafted = (
  pool: Pool,
  delta: PlayerDraftedResponse
): Pool | null => {
  if (pool.context === null) {
    // No draft context yet: this client has not seen the StartDraft broadcast.
    return null;
  }

  const players_name_drafted = [
    ...pool.context.players_name_drafted,
    ...delta.appended_picks,
  ];

  // The authoritative length after the pick. A mismatch means our list was
  // already the wrong length, so we are missing at least one earlier pick.
  if (players_name_drafted.length !== delta.pick_count) {
    return null;
  }

  return {
    ...pool,
    status: delta.status,
    date_updated: delta.date_updated,
    context: {
      ...pool.context,
      players_name_drafted,
      players: {
        ...pool.context.players,
        [delta.player.id]: delta.player,
      },
      // The roster is sent whole rather than as an instruction: the backend
      // owns where a player lands (position slot, or reservist when the slot is
      // full or the salary cap is reached).
      pooler_roster: {
        ...pool.context.pooler_roster,
        [delta.participant_id]: delta.roster,
      },
    },
  };
};

export const applyDraftPickUndone = (
  pool: Pool,
  delta: DraftPickUndoneResponse
): Pool | null => {
  if (pool.context === null) {
    return null;
  }

  // The undone pick sits exactly at `pick_count`, followed by the zeros of the
  // drafters that were skipped after it. If it does not, our list is not the
  // one the backend just truncated. This also covers the case where we are
  // behind and our list does not even reach `pick_count`.
  if (pool.context.players_name_drafted[delta.pick_count] !== delta.player_id) {
    return null;
  }

  const players = { ...pool.context.players };
  delete players[delta.player_id];

  return {
    ...pool,
    date_updated: delta.date_updated,
    context: {
      ...pool.context,
      players_name_drafted: pool.context.players_name_drafted.slice(
        0,
        delta.pick_count
      ),
      players,
      pooler_roster: {
        ...pool.context.pooler_roster,
        [delta.participant_id]: delta.roster,
      },
    },
  };
};

// A participant rearranged the players it already holds. Nothing is drafted, so
// `players_name_drafted` is untouched and there is no counter to verify — the
// roster the backend sends is simply the new truth for that participant.
export const applyRosterModified = (
  pool: Pool,
  delta: RosterModifiedResponse
): Pool | null => {
  if (pool.context === null) {
    return null;
  }

  // A roster for someone we do not even know about means our copy of the pool
  // predates the draft that created them.
  if (pool.context.pooler_roster[delta.participant_id] === undefined) {
    return null;
  }

  return {
    ...pool,
    date_updated: delta.date_updated,
    context: {
      ...pool.context,
      pooler_roster: {
        ...pool.context.pooler_roster,
        [delta.participant_id]: delta.roster,
      },
    },
  };
};
