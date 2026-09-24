/*
The pool settings form, minus its markup: the bounds of every field, the zod
schema built from them, the default values a pool (or the creation context)
starts from, and the payload the backend is sent.

All of this used to sit in the body of `pool-settings.tsx`, where ~40 `DEFAULT_`
and min/max constants and the whole schema were rebuilt on every render and
could not be tested without rendering the form. Nothing here touches React.
*/

import { z } from "zod";

import {
  DraftType,
  DropPeriod,
  DynastySettings,
  PoolSettings,
} from "@/data/pool/model";

export enum PoolType {
  STANDARD = "Standard",
  DYNASTY = "Dynasty",
}

/*
The subset of next-intl's `t` this module needs. Taking it as a parameter is
what keeps the schema pure: the messages are still translated, but by the
caller's translator rather than by a hook called in here.
*/
export type Translator = (
  key: string,
  values?: Record<string, number | string>,
) => string;

export const POOL_NAME_MIN_LENGTH = 5;
export const POOL_NAME_MAX_LENGTH = 16;

/*
The bounds of every numeric field, in one table.

`points` covers all thirteen per-point fields at once; the backend deserializes
each of them as a u8, so a decimal or an out of range value is rejected before
any validation of ours runs.
*/
export const POOL_SETTINGS_BOUNDS = {
  numberOfPooler: { min: 2, max: 24 },
  numberOfForwards: { min: 3, max: 15 },
  numberOfDefenders: { min: 2, max: 9 },
  numberOfGoalies: { min: 1, max: 5 },
  numberOfReservists: { min: 0, max: 10 },
  numberOfWorstForwardsToIgnore: { min: 0, max: 5 },
  numberOfWorstDefendersToIgnore: { min: 0, max: 5 },
  numberOfWorstGoaliesToIgnore: { min: 0, max: 5 },
  tradableDraftPicks: { min: 0, max: 7 },
  numberOfPlayersToProtect: { min: 5, max: 15 },
  salaryCap: { min: 0, max: 500_000_000 },
  maxPlayerDrops: { min: 1, max: 50 },
  points: { min: 0, max: 255 },
} as const;

const DEFAULT_POINTS_VALUE = 1;
const DEFAULT_SALARY_CAP = 82_500_000;

interface Bounds {
  min: number;
  max: number;
}

/*
A number field whose two bounds each have their own message. The `value` the
message interpolates is the bound itself, so the text and the rule can never
drift apart.
*/
const bounded = (
  t: Translator,
  bounds: Bounds,
  minMessage: string,
  maxMessage: string,
) =>
  z
    .number()
    .min(bounds.min, { error: t(minMessage, { value: bounds.min }) })
    .max(bounds.max, { error: t(maxMessage, { value: bounds.max }) });

export function buildPoolSettingsSchema(t: Translator) {
  const points = () =>
    z
      .number()
      .int({ error: t("PointsMustBeWholeNumberValidation") })
      .min(POOL_SETTINGS_BOUNDS.points.min)
      .max(POOL_SETTINGS_BOUNDS.points.max);

  return z.object({
    name: z
      .string()
      .min(POOL_NAME_MIN_LENGTH, {
        error: t("PoolNameMinLenghtValidation", {
          value: POOL_NAME_MIN_LENGTH,
        }),
      })
      .max(POOL_NAME_MAX_LENGTH, {
        error: t("PoolNameMaxLenghtValidation", {
          value: POOL_NAME_MAX_LENGTH,
        }),
      }),
    numberOfPooler: bounded(
      t,
      POOL_SETTINGS_BOUNDS.numberOfPooler,
      "NumberOfPoolerMinLengthValidation",
      "NumberOfPoolerMaxLengthValidation",
    ),
    typeOfPool: z.enum([PoolType.STANDARD, PoolType.DYNASTY]),
    draftType: z.enum([DraftType.SERPENTINE, DraftType.STANDARD]),
    numberOfForwards: bounded(
      t,
      POOL_SETTINGS_BOUNDS.numberOfForwards,
      "NumberOfForwardsMinValidation",
      "NumberOfForwardsMaxValidation",
    ),
    numberOfDefenders: bounded(
      t,
      POOL_SETTINGS_BOUNDS.numberOfDefenders,
      "NumberOfDefendersMinValidation",
      "NumberOfDefendersMaxValidation",
    ),
    numberOfGoalies: bounded(
      t,
      POOL_SETTINGS_BOUNDS.numberOfGoalies,
      "NumberOfGoaliesMinValidation",
      "NumberOfGoaliesMaxValidation",
    ),
    numberOfReservists: bounded(
      t,
      POOL_SETTINGS_BOUNDS.numberOfReservists,
      "NumberOfReservistsMinValidation",
      "NumberOfReservistsMaxValidation",
    ),
    numberOfWorstForwardsToIgnore: bounded(
      t,
      POOL_SETTINGS_BOUNDS.numberOfWorstForwardsToIgnore,
      "NumberOfWorstForwardsToIgnoreMinValidation",
      "NumberOfWorstForwardsToIgnoreMaxValidation",
    ),
    numberOfWorstDefendersToIgnore: bounded(
      t,
      POOL_SETTINGS_BOUNDS.numberOfWorstDefendersToIgnore,
      "NumberOfWorstDefendersToIgnoreMinValidation",
      "NumberOfWorstDefendersToIgnoreMaxValidation",
    ),
    numberOfWorstGoaliesToIgnore: bounded(
      t,
      POOL_SETTINGS_BOUNDS.numberOfWorstGoaliesToIgnore,
      "NumberOfWorstGoaliesToIgnoreMinValidation",
      "NumberOfWorstGoaliesToIgnoreMaxValidation",
    ),
    forwardsPointsPerGoals: points(),
    forwardsPointsPerAssists: points(),
    forwardsPointsPerHatTricks: points(),
    forwardsPointsPerShootOutGoals: points(),
    defendersPointsPerGoals: points(),
    defendersPointsPerAssists: points(),
    defendersPointsPerHatTricks: points(),
    defendersPointsPerShootOutGoals: points(),
    goaliesPointsPerGoals: points(),
    goaliesPointsPerAssists: points(),
    goaliesPointsPerWins: points(),
    goaliesPointsPerOvertimeLosses: points(),
    goaliesPointsPerShutout: points(),
    tradableDraftPicks: z
      .number()
      .min(POOL_SETTINGS_BOUNDS.tradableDraftPicks.min)
      .max(POOL_SETTINGS_BOUNDS.tradableDraftPicks.max),
    numberOfPlayersToProtect: z
      .number()
      .min(POOL_SETTINGS_BOUNDS.numberOfPlayersToProtect.min)
      .max(POOL_SETTINGS_BOUNDS.numberOfPlayersToProtect.max),
    salaryCap: z
      .number()
      .min(POOL_SETTINGS_BOUNDS.salaryCap.min)
      .max(POOL_SETTINGS_BOUNDS.salaryCap.max),
    maxPlayerDrops: z
      .number()
      .int({ error: t("MaxPlayerDropsMustBeWholeNumberValidation") })
      .min(POOL_SETTINGS_BOUNDS.maxPlayerDrops.min, {
        error: t("MaxPlayerDropsMinValidation", {
          value: POOL_SETTINGS_BOUNDS.maxPlayerDrops.min,
        }),
      })
      .max(POOL_SETTINGS_BOUNDS.maxPlayerDrops.max, {
        error: t("MaxPlayerDropsMaxValidation", {
          value: POOL_SETTINGS_BOUNDS.maxPlayerDrops.max,
        }),
      }),
    dropPeriod: z.enum([DropPeriod.SEASON, DropPeriod.MONTH]),
  });
}

export type PoolSettingsSchema = ReturnType<typeof buildPoolSettingsSchema>;
export type PoolSettingsFormValues = z.infer<PoolSettingsSchema>;

/*
The sections that are switched on and off as a whole. Each one nulls out its
part of the payload when off, which is how the backend reads "this pool has no
salary cap" rather than "a cap of zero".
*/
export interface PoolSettingsToggles {
  dynasty: boolean;
  ignoreWorstPlayers: boolean;
  salaryCap: boolean;
  playerDrops: boolean;
}

// Which sections an existing pool starts with, and what a new pool defaults to.
export function poolSettingsToggles(
  oldPoolSettings: PoolSettings | null,
): PoolSettingsToggles {
  return {
    dynasty: (oldPoolSettings?.dynasty_settings ?? null) !== null,
    ignoreWorstPlayers:
      (oldPoolSettings?.ignore_x_worst_players ?? null) !== null,
    salaryCap: (oldPoolSettings?.salary_cap ?? null) !== null,
    playerDrops: (oldPoolSettings?.player_drop_settings ?? null) !== null,
  };
}

/*
The values the form opens with: the pool's own settings when editing one, and
the defaults of a fresh pool otherwise.

A disabled section still gets its defaults, so switching it on mid-form shows
sensible numbers instead of empty inputs.
*/
export function poolSettingsDefaults(
  poolName: string,
  oldPoolSettings: PoolSettings | null,
): PoolSettingsFormValues {
  const forwards = oldPoolSettings?.forwards_settings;
  const defense = oldPoolSettings?.defense_settings;
  const goalies = oldPoolSettings?.goalies_settings;
  const ignored = oldPoolSettings?.ignore_x_worst_players;
  const dynasty = oldPoolSettings?.dynasty_settings;
  const drops = oldPoolSettings?.player_drop_settings;

  return {
    name: poolName ?? "",
    numberOfPooler: oldPoolSettings?.number_poolers ?? 6,
    typeOfPool: dynasty ? PoolType.DYNASTY : PoolType.STANDARD,
    draftType: oldPoolSettings?.draft_type ?? DraftType.SERPENTINE,
    numberOfForwards: oldPoolSettings?.number_forwards ?? 9,
    numberOfDefenders: oldPoolSettings?.number_defenders ?? 4,
    numberOfGoalies: oldPoolSettings?.number_goalies ?? 2,
    numberOfReservists: oldPoolSettings?.number_reservists ?? 0,
    numberOfWorstForwardsToIgnore: ignored?.forwards ?? 0,
    numberOfWorstDefendersToIgnore: ignored?.defense ?? 0,
    numberOfWorstGoaliesToIgnore: ignored?.goalies ?? 0,
    forwardsPointsPerGoals: forwards?.points_per_goals ?? DEFAULT_POINTS_VALUE,
    forwardsPointsPerAssists:
      forwards?.points_per_assists ?? DEFAULT_POINTS_VALUE,
    forwardsPointsPerHatTricks:
      forwards?.points_per_hattricks ?? DEFAULT_POINTS_VALUE,
    forwardsPointsPerShootOutGoals:
      forwards?.points_per_shootout_goals ?? DEFAULT_POINTS_VALUE,
    defendersPointsPerGoals: defense?.points_per_goals ?? DEFAULT_POINTS_VALUE,
    defendersPointsPerAssists:
      defense?.points_per_assists ?? DEFAULT_POINTS_VALUE,
    defendersPointsPerHatTricks:
      defense?.points_per_hattricks ?? DEFAULT_POINTS_VALUE,
    defendersPointsPerShootOutGoals:
      defense?.points_per_shootout_goals ?? DEFAULT_POINTS_VALUE,
    goaliesPointsPerGoals: goalies?.points_per_goals ?? DEFAULT_POINTS_VALUE,
    goaliesPointsPerAssists:
      goalies?.points_per_assists ?? DEFAULT_POINTS_VALUE,
    goaliesPointsPerWins: goalies?.points_per_wins ?? DEFAULT_POINTS_VALUE,
    goaliesPointsPerOvertimeLosses:
      goalies?.points_per_overtimes ?? DEFAULT_POINTS_VALUE,
    goaliesPointsPerShutout:
      goalies?.points_per_shutouts ?? DEFAULT_POINTS_VALUE,
    tradableDraftPicks: dynasty?.tradable_picks ?? 5,
    numberOfPlayersToProtect:
      dynasty?.next_season_number_players_protected ?? 10,
    salaryCap: oldPoolSettings?.salary_cap ?? DEFAULT_SALARY_CAP,
    maxPlayerDrops: drops?.max_drops ?? 3,
    dropPeriod: drops?.period ?? DropPeriod.SEASON,
  };
}

export interface PoolSettingsPayloadOptions {
  toggles: PoolSettingsToggles;
  assistants: string[];
  rosterModificationDates: string[];
  // The settings being edited, for the dynasty lineage carried over untouched.
  oldPoolSettings: PoolSettings | null;
}

/*
Turns the form values back into the settings document.

Every field has to be present: the backend replaces the whole document, so
anything missing from the payload is dropped from the pool.
*/
export function toPoolSettings(
  values: PoolSettingsFormValues,
  options: PoolSettingsPayloadOptions,
): PoolSettings {
  const { toggles, oldPoolSettings } = options;
  const oldDynasty: DynastySettings | null =
    oldPoolSettings?.dynasty_settings ?? null;

  return {
    number_poolers: values.numberOfPooler,
    draft_type: values.draftType,
    assistants: options.assistants,
    number_forwards: values.numberOfForwards,
    number_defenders: values.numberOfDefenders,
    number_goalies: values.numberOfGoalies,
    number_reservists: values.numberOfReservists,
    salary_cap: toggles.salaryCap ? values.salaryCap : null,
    roster_modification_date: options.rosterModificationDates,
    forwards_settings: {
      points_per_goals: values.forwardsPointsPerGoals,
      points_per_assists: values.forwardsPointsPerAssists,
      points_per_hattricks: values.forwardsPointsPerHatTricks,
      points_per_shootout_goals: values.forwardsPointsPerShootOutGoals,
    },
    defense_settings: {
      points_per_goals: values.defendersPointsPerGoals,
      points_per_assists: values.defendersPointsPerAssists,
      points_per_hattricks: values.defendersPointsPerHatTricks,
      points_per_shootout_goals: values.defendersPointsPerShootOutGoals,
    },
    goalies_settings: {
      points_per_wins: values.goaliesPointsPerWins,
      points_per_shutouts: values.goaliesPointsPerShutout,
      points_per_overtimes: values.goaliesPointsPerOvertimeLosses,
      points_per_goals: values.goaliesPointsPerGoals,
      points_per_assists: values.goaliesPointsPerAssists,
    },
    ignore_x_worst_players: toggles.ignoreWorstPlayers
      ? {
          forwards: values.numberOfWorstForwardsToIgnore,
          defense: values.numberOfWorstDefendersToIgnore,
          goalies: values.numberOfWorstGoaliesToIgnore,
        }
      : null,
    player_drop_settings: toggles.playerDrops
      ? { max_drops: values.maxPlayerDrops, period: values.dropPeriod }
      : null,
    dynasty_settings: toggles.dynasty
      ? {
          next_season_number_players_protected: values.numberOfPlayersToProtect,
          tradable_picks: values.tradableDraftPicks,
          // Pool lineage is maintained by the backend when the next season is
          // generated, it is carried over untouched.
          past_season_pool_name: oldDynasty?.past_season_pool_name ?? [],
          next_season_pool_name: oldDynasty?.next_season_pool_name ?? null,
        }
      : null,
  };
}

/*
An emptied number input holds no value, which the schema reports as a missing
field. `Number(value) || null` was used before and mapped a legitimate 0 (no
reservist, no worst player ignored) to that same missing value.
*/
export const numberOrNull = (value: string): number | null =>
  value.trim().length === 0 ? null : Number(value);
