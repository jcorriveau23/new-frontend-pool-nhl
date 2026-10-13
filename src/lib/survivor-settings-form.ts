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
  publicPicks: false,
};

export type SurvivorFormValues = typeof DEFAULT_SURVIVOR_FORM_VALUES;

/*
The same values minus the two a creation needs: an existing pool's name is in
the URL and cannot change, and its owner joined it when they made it.
*/
export type SurvivorSettingsFormValues = Omit<
  SurvivorFormValues,
  "poolName" | "participantName"
>;

const bounded = (
  t: Translator,
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

/*
The settings themselves, without the two fields that only a creation names.

Split out because an existing pool's settings are edited with the same bounds
it was created under, and only this half of the form is on that screen: the
name is in the URL and the owner already has a participant.

`minParticipants` is the floor the cap may be lowered to. It is the bound on a
creation, and the number of people already in on an edit — the backend refuses
a cap below its own participant list, and this is what lets the form say so
before the request goes out.
*/
export function buildSurvivorSettingsSchema(
  t: Translator,
  minParticipants: number = SURVIVOR_BOUNDS.maxParticipants.min,
) {
  return z.object({
    maxParticipants: bounded(
      t,
      { min: minParticipants, max: SURVIVOR_BOUNDS.maxParticipants.max },
      "SurvivorMaxParticipantsWholeNumberValidation",
      "SurvivorMaxParticipantsMinValidation",
      "SurvivorMaxParticipantsMaxValidation",
    ),
    strikesAllowed: bounded(
      t,
      SURVIVOR_BOUNDS.strikesAllowed,
      "SurvivorStrikesWholeNumberValidation",
      "SurvivorStrikesMinValidation",
      "SurvivorStrikesMaxValidation",
    ),
    missedPickIsStrike: z.boolean(),
    allowPickChange: z.boolean(),
    publicPicks: z.boolean(),
  });
}

export type SurvivorSettingsSchema = ReturnType<
  typeof buildSurvivorSettingsSchema
>;

export function buildSurvivorFormSchema(t: Translator) {
  return buildSurvivorSettingsSchema(t).extend({
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
    public_picks: values.publicPicks,
    league_team_count: LEAGUE_TEAM_COUNT,
  };
}

/*
The settings an existing pool is updated to.

Built by spreading what the pool already has rather than from the form alone,
which is the whole difference from `toSurvivorSettings`. Two of the seven fields
are on no screen — `assistants`, which the owner manages elsewhere, and
`league_team_count`, which is the league's size in the season the pool opened —
and a payload assembled from the form's five would quietly reset both. The
pool document is also read through a loose schema, so a field the backend added
ahead of this frontend survives an edit for the same reason.
*/
export function mergeSurvivorSettings(
  current: SurvivorSettings,
  values: SurvivorSettingsFormValues,
): SurvivorSettings {
  return {
    ...current,
    max_participants: values.maxParticipants,
    strikes_allowed: values.strikesAllowed,
    missed_pick_is_strike: values.missedPickIsStrike,
    allow_pick_change: values.allowPickChange,
    public_picks: values.publicPicks,
  };
}

/*
`?? false` on `publicPicks`, here and in `toSurvivorFormValues`, because the
field can genuinely be missing however the type reads: a pool document is
handed back as it arrived rather than rebuilt from the schema, so a backend
older than the setting leaves it undefined. Feeding that to the form would put
the switch in an indeterminate state and fail the `z.boolean()` on submit, and
false is the game every such pool has been playing.
*/
export function toSurvivorSettingsFormValues(
  settings: SurvivorSettings,
): SurvivorSettingsFormValues {
  return {
    maxParticipants: settings.max_participants,
    strikesAllowed: settings.strikes_allowed,
    missedPickIsStrike: settings.missed_pick_is_strike,
    allowPickChange: settings.allow_pick_change,
    publicPicks: settings.public_picks ?? false,
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
    publicPicks: settings.public_picks ?? false,
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
