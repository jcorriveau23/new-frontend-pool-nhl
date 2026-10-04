/*
The survivor pool creation form, minus its markup: the bounds of every field,
the zod schema built from them, the values a new pool starts from and the
payload the backend is sent.

Nothing here touches React, for the same reason `pool-settings-form.ts` does
not: the bounds and the schema are the rules a pool is created under, and they
are worth testing without rendering a form.
*/

import { z } from "zod";

import { SurvivorSettings } from "@/data/survivor/model";

/*
The subset of next-intl's `t` this module needs. Taking it as a parameter is
what keeps the schema pure: the messages are still translated, by the caller's
translator rather than by a hook called in here.
*/
export type Translator = (
  key: string,
  values?: Record<string, number | string>,
) => string;

// Matches MIN/MAX_SURVIVOR_POOL_NAME_LENGTH in the Rust model. The backend
// refuses anything outside them; these only let the form say so first.
export const SURVIVOR_POOL_NAME_MIN_LENGTH = 3;
export const SURVIVOR_POOL_NAME_MAX_LENGTH = 64;
export const SURVIVOR_PARTICIPANT_NAME_MAX_LENGTH = 32;

/*
The bounds of every numeric field.

`maxParticipants` goes to a thousand because that is what the feature is for —
a survivor pool is the one kind of pool a few hundred people join. The ceiling
matches MAX_SURVIVOR_PARTICIPANTS in the Rust model, which holds the owner's
own number to it.
*/
export const SURVIVOR_BOUNDS = {
  maxParticipants: { min: 2, max: 1000 },
  strikesAllowed: { min: 0, max: 5 },
} as const;

export const DEFAULT_SURVIVOR_FORM_VALUES = {
  poolName: "",
  participantName: "",
  maxParticipants: 100,
  strikesAllowed: 0,
  missedPickIsStrike: true,
  allowPickChange: true,
};

export type SurvivorFormValues = typeof DEFAULT_SURVIVOR_FORM_VALUES;

export function buildSurvivorFormSchema(t: Translator) {
  const bounded = (
    bounds: { min: number; max: number },
    wholeNumberKey: string,
    minKey: string,
    maxKey: string,
  ) =>
    z
      .number()
      .int({ error: t(wholeNumberKey) })
      .min(bounds.min, { error: t(minKey, { value: bounds.min }) })
      .max(bounds.max, { error: t(maxKey, { value: bounds.max }) });

  return z.object({
    poolName: z
      .string()
      .trim()
      .min(SURVIVOR_POOL_NAME_MIN_LENGTH, {
        error: t("PoolNameMinLenghtValidation", {
          value: SURVIVOR_POOL_NAME_MIN_LENGTH,
        }),
      })
      .max(SURVIVOR_POOL_NAME_MAX_LENGTH, {
        error: t("PoolNameMaxLenghtValidation", {
          value: SURVIVOR_POOL_NAME_MAX_LENGTH,
        }),
      }),
    participantName: z
      .string()
      .trim()
      .min(1, { error: t("SurvivorNameRequiredValidation") })
      .max(SURVIVOR_PARTICIPANT_NAME_MAX_LENGTH, {
        error: t("SurvivorNameMaxLengthValidation", {
          value: SURVIVOR_PARTICIPANT_NAME_MAX_LENGTH,
        }),
      }),
    maxParticipants: bounded(
      SURVIVOR_BOUNDS.maxParticipants,
      "SurvivorMaxParticipantsWholeNumberValidation",
      "SurvivorMaxParticipantsMinValidation",
      "SurvivorMaxParticipantsMaxValidation",
    ),
    strikesAllowed: bounded(
      SURVIVOR_BOUNDS.strikesAllowed,
      "SurvivorStrikesWholeNumberValidation",
      "SurvivorStrikesMinValidation",
      "SurvivorStrikesMaxValidation",
    ),
    missedPickIsStrike: z.boolean(),
    allowPickChange: z.boolean(),
  });
}

export type SurvivorFormSchema = ReturnType<typeof buildSurvivorFormSchema>;

/*
The settings the backend is sent.

`league_team_count` is not a form field: it is how many teams the league has,
not a choice the owner makes, and it is only in the settings so a pool opened in
one season keeps its own number when the league changes size.
*/
export const LEAGUE_TEAM_COUNT = 32;

export function toSurvivorSettings(
  values: SurvivorFormValues,
): SurvivorSettings {
  return {
    assistants: [],
    max_participants: values.maxParticipants,
    strikes_allowed: values.strikesAllowed,
    missed_pick_is_strike: values.missedPickIsStrike,
    allow_pick_change: values.allowPickChange,
    league_team_count: LEAGUE_TEAM_COUNT,
  };
}

export function toSurvivorFormValues(
  poolName: string,
  settings: SurvivorSettings,
  participantName: string,
): SurvivorFormValues {
  return {
    poolName,
    participantName,
    maxParticipants: settings.max_participants,
    strikesAllowed: settings.strikes_allowed,
    missedPickIsStrike: settings.missed_pick_is_strike,
    allowPickChange: settings.allow_pick_change,
  };
}

/*
An empty number input yields "", which `Number("")` turns into 0 — a value that
would pass a `min: 0` bound and silently mean something. Null instead, so the
schema reports a missing number rather than accepting a wrong one.
*/
export function numberOrNull(value: string): number | null {
  return value === "" ? null : Number(value);
}
