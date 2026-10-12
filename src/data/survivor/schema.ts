/*
Runtime checks for the survivor documents the backend sends.

`apiGet<T>` only casts, so a renamed field or a proxy answering with something
else would otherwise reach a render as a `SurvivorPool` and fail somewhere deep
inside it. These check the fields the app reads before it gets that far.

Loose on purpose, for the same reason `@/data/pool/schema` is: the Rust backend
adds fields ahead of the frontend regularly, and refusing a document for
carrying one we do not know yet would take the page down for an additive change.
*/

import { z } from "zod";

import {
  ParticipantStatus,
  PickOutcome,
  SurvivorGameState,
  SurvivorPickOptions,
  SurvivorPool,
  SurvivorStandings,
  SurvivorState,
  WeekStatus,
} from "@/data/survivor/model";

const survivorUserSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  status: z.enum(ParticipantStatus),
  strikes: z.number(),
  eliminated_week: z.number().nullable(),
  // Defaulted rather than required: the backend only started sending it when
  // managed spots arrived, and a pool created before that carries no flag.
  is_owned: z.boolean().optional().default(true),
});

const survivorWeekSchema = z.looseObject({
  week: z.number(),
  pick_date: z.string(),
  status: z.enum(WeekStatus),
  eligible_team_ids: z.array(z.number()),
});

const survivorSettingsSchema = z.looseObject({
  max_participants: z.number(),
  strikes_allowed: z.number(),
  missed_pick_is_strike: z.boolean(),
  allow_pick_change: z.boolean(),
  league_team_count: z.number(),
  assistants: z.array(z.string()),
});

export const survivorPoolSchema = z.looseObject({
  name: z.string(),
  owner: z.string(),
  settings: survivorSettingsSchema,
  status: z.enum(SurvivorState),
  participants: z.array(survivorUserSchema),
  weeks: z.array(survivorWeekSchema),
  winners: z.array(z.string()).nullable(),
  season: z.number(),
});

/*
A game on the pick screen.

Only the two team ids are required, and on purpose. Everything else is how the
game is *described* — the score, the clock, where it stands — and the screen
copes with any of it missing: a game with no recognised state reads as not
started, and one with no score shows none. A backend whose game shape differs
from this frontend's should cost the date its scores, not take the pick screen
down, and this schema gates the whole of `pick-options`.
*/
const survivorGameSchema = z.looseObject({
  home_team_id: z.number(),
  away_team_id: z.number(),
  home_score: z.number().nullish(),
  away_score: z.number().nullish(),
  state: z.enum(SurvivorGameState).nullish(),
  start_time_utc: z.string().nullish(),
  period: z.number().nullish(),
  period_type: z.string().nullish(),
  time_remaining: z.string().nullish(),
  in_intermission: z.boolean().nullish(),
});

export const survivorPickOptionsSchema = z.looseObject({
  week: z.number(),
  pick_date: z.string(),
  // Optional because a backend older than the matchups does not send it. Not
  // defaulted: the parsers below answer with the value they were handed, so a
  // default would never reach a caller anyway.
  games: z.array(survivorGameSchema).optional(),
  eligible_team_ids: z.array(z.number()),
  available_team_ids: z.array(z.number()),
  used_team_ids: z.array(z.number()),
  current_pick: z.number().nullable(),
  is_blocked: z.boolean(),
  can_pick: z.boolean(),
});

export const survivorStandingsSchema = z.looseObject({
  pool_name: z.string(),
  status: z.enum(SurvivorState),
  alive_count: z.number(),
  eliminated_count: z.number(),
  revealed_weeks: z.array(z.number()),
  rows: z.array(
    z.looseObject({
      participant_id: z.string(),
      name: z.string(),
      status: z.enum(ParticipantStatus),
      strikes: z.number(),
      eliminated_week: z.number().nullable(),
      wins: z.number(),
      picks: z.record(
        z.string(),
        z.looseObject({ team_id: z.number(), outcome: z.enum(PickOutcome) }),
      ),
    }),
  ),
  winners: z.array(z.string()).nullable(),
});

/*
Each returns the value that was handed in rather than the parsed copy: the
schemas ignore the fields they do not name, and rebuilding from them would drop
those fields.
*/
export function parseSurvivorPool(value: unknown): SurvivorPool | null {
  return survivorPoolSchema.safeParse(value).success
    ? (value as SurvivorPool)
    : null;
}

export function parseSurvivorPickOptions(
  value: unknown,
): SurvivorPickOptions | null {
  return survivorPickOptionsSchema.safeParse(value).success
    ? (value as SurvivorPickOptions)
    : null;
}

export function parseSurvivorStandings(
  value: unknown,
): SurvivorStandings | null {
  return survivorStandingsSchema.safeParse(value).success
    ? (value as SurvivorStandings)
    : null;
}

// What a caller reports when a response did not hold what it should. Not a
// backend message: the backend answered, it just did not answer with this.
export const MALFORMED_SURVIVOR_POOL =
  "the server returned a malformed survivor pool";
