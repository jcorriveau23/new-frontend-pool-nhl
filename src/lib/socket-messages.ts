/*
The frames the draft room pushes over the websocket.

Anything that arrives here was parsed out of a socket message, so it is checked
before it reaches the pool state: a frame the app does not understand is ignored
rather than applied as an empty update, which on the draft board would look like
picks disappearing.
*/

import { z } from "zod";

import {
  DraftPickUndoneResponse,
  PlayerDraftedResponse,
  RosterModifiedResponse,
} from "@/data/pool/model";
import { parsePool } from "@/data/pool/schema";

// One participant of a draft room, as the room publishes them.
export interface RoomUser {
  id: string;
  name: string;
  email: string | null;
  is_ready: boolean;
}

// The three frames a pick sends: what changed, never the whole pool.
export type DraftDelta =
  | { PlayerDrafted: PlayerDraftedResponse }
  | { DraftPickUndone: DraftPickUndoneResponse }
  | { RosterModified: RosterModifiedResponse };

// Loose for the same reason the pool schema is: the room grows new frames and
// new fields ahead of the frontend.
const poolBroadcastSchema = z.looseObject({
  Pool: z.looseObject({ pool: z.unknown() }),
});

const roomUserSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  is_ready: z.boolean(),
});

const usersSchema = z.looseObject({
  Users: z.looseObject({ room_users: z.record(z.string(), roomUserSchema) }),
});

const draftDeltaSchema = z.looseObject({
  PlayerDrafted: z.unknown().optional(),
  DraftPickUndone: z.unknown().optional(),
  RosterModified: z.unknown().optional(),
});

export type SocketMessage =
  | { kind: "pool"; pool: ReturnType<typeof parsePool> }
  | { kind: "draft-delta"; delta: DraftDelta }
  | { kind: "users"; roomUsers: Record<string, RoomUser> }
  | { kind: "unknown" };

/*
Sorts one already-parsed frame into what it is.

A `Pool` frame whose pool does not hold up is reported as a pool with a null
document, so the caller can say so rather than silently doing nothing.
*/
export function classifySocketMessage(message: unknown): SocketMessage {
  const broadcast = poolBroadcastSchema.safeParse(message);
  if (broadcast.success) {
    return { kind: "pool", pool: parsePool(broadcast.data.Pool.pool) };
  }

  const delta = draftDeltaSchema.safeParse(message);
  if (
    delta.success &&
    (delta.data.PlayerDrafted !== undefined ||
      delta.data.DraftPickUndone !== undefined ||
      delta.data.RosterModified !== undefined)
  ) {
    return { kind: "draft-delta", delta: message as DraftDelta };
  }

  const users = usersSchema.safeParse(message);
  if (users.success) {
    return { kind: "users", roomUsers: users.data.Users.room_users };
  }

  return { kind: "unknown" };
}
