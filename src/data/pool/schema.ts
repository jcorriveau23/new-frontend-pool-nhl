/*
Runtime checks for the pool document the backend sends.

`apiGet<Pool>` only casts: a backend that renamed a field, or a proxy that
answered with something else entirely, used to reach the tables as a `Pool` and
fail somewhere deep in a render. These schemas check the fields the app reads
before it gets that far.

They are deliberately loose — unknown keys pass through untouched — because the
Rust backend adds fields ahead of the frontend regularly, and refusing a pool
for carrying a field we do not know yet would take the app down for an additive
change.
*/

import { z } from "zod";

import { Pool, PoolState } from "@/data/pool/model";

const poolUserSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
});

const poolerRosterSchema = z.looseObject({
  chosen_forwards: z.array(z.number()),
  chosen_defenders: z.array(z.number()),
  chosen_goalies: z.array(z.number()),
  chosen_reservists: z.array(z.number()),
});

const poolSettingsSchema = z.looseObject({
  number_poolers: z.number(),
  number_forwards: z.number(),
  number_defenders: z.number(),
  number_goalies: z.number(),
  number_reservists: z.number(),
  salary_cap: z.number().nullable(),
  assistants: z.array(z.string()),
});

const poolContextSchema = z.looseObject({
  pooler_roster: z.record(z.string(), poolerRosterSchema),
  players_name_drafted: z.array(z.number()),
  players: z.record(z.string(), z.looseObject({ id: z.number() })),
});

export const poolSchema = z.looseObject({
  name: z.string(),
  owner: z.string(),
  participants: z.array(poolUserSchema),
  settings: poolSettingsSchema,
  status: z.enum(PoolState),
  context: poolContextSchema.nullable(),
  season_start: z.string(),
  season_end: z.string(),
});

/*
The pool when it is one, null otherwise.

The value that comes back is the one that was handed in, not the parsed copy:
the schema ignores the fields it does not name, and rebuilding the document from
it would drop them.
*/
export function parsePool(value: unknown): Pool | null {
  return poolSchema.safeParse(value).success ? (value as Pool) : null;
}

// What the caller reports when a response did not hold a pool. Not a backend
// message: the backend answered, it simply did not answer with a pool.
export const MALFORMED_POOL = "the server returned a malformed pool";
