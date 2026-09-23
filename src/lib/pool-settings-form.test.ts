import { describe, expect, it } from "vitest";

import { DraftType, DropPeriod, PoolSettings } from "@/data/pool/model";
import {
  buildPoolSettingsSchema,
  numberOrNull,
  poolSettingsDefaults,
  poolSettingsToggles,
  POOL_SETTINGS_BOUNDS,
  PoolType,
  toPoolSettings,
} from "./pool-settings-form";

// Stands in for next-intl's `t`: the key and its interpolations, so a test can
// assert which message a rule produced without loading the message files.
const t = (key: string, values?: Record<string, number | string>) =>
  values === undefined ? key : `${key}:${JSON.stringify(values)}`;

const schema = buildPoolSettingsSchema(t);

const points = {
  points_per_goals: 2,
  points_per_assists: 1,
  points_per_hattricks: 3,
  points_per_shootout_goals: 1,
};

const existingSettings = (
  overrides: Partial<PoolSettings> = {},
): PoolSettings => ({
  number_poolers: 8,
  draft_type: DraftType.STANDARD,
  assistants: ["assistant-1"],
  number_forwards: 12,
  number_defenders: 6,
  number_goalies: 2,
  number_reservists: 3,
  salary_cap: 90_000_000,
  roster_modification_date: ["2026-10-01"],
  forwards_settings: points,
  defense_settings: { ...points, points_per_goals: 3 },
  goalies_settings: {
    points_per_wins: 2,
    points_per_shutouts: 3,
    points_per_overtimes: 1,
    points_per_goals: 5,
    points_per_assists: 4,
  },
  ignore_x_worst_players: { forwards: 2, defense: 1, goalies: 0 },
  dynasty_settings: {
    next_season_number_players_protected: 12,
    tradable_picks: 4,
    past_season_pool_name: ["pool-2025"],
    next_season_pool_name: "pool-2027",
  },
  player_drop_settings: { max_drops: 5, period: DropPeriod.MONTH },
  ...overrides,
});

describe("poolSettingsDefaults", () => {
  it("opens a new pool on the standard defaults", () => {
    const values = poolSettingsDefaults("my-pool", null);

    expect(values).toMatchObject({
      name: "my-pool",
      numberOfPooler: 6,
      typeOfPool: PoolType.STANDARD,
      draftType: DraftType.SERPENTINE,
      numberOfForwards: 9,
      numberOfDefenders: 4,
      numberOfGoalies: 2,
      numberOfReservists: 0,
      forwardsPointsPerGoals: 1,
      goaliesPointsPerShutout: 1,
      salaryCap: 82_500_000,
      maxPlayerDrops: 3,
      dropPeriod: DropPeriod.SEASON,
    });
    // Every default has to pass the schema, or the form opens invalid.
    expect(schema.safeParse(values).success).toBe(true);
  });

  it("opens an existing pool on its own settings", () => {
    const values = poolSettingsDefaults("my-pool", existingSettings());

    expect(values).toMatchObject({
      numberOfPooler: 8,
      typeOfPool: PoolType.DYNASTY,
      draftType: DraftType.STANDARD,
      numberOfReservists: 3,
      numberOfWorstForwardsToIgnore: 2,
      defendersPointsPerGoals: 3,
      goaliesPointsPerGoals: 5,
      tradableDraftPicks: 4,
      numberOfPlayersToProtect: 12,
      salaryCap: 90_000_000,
      maxPlayerDrops: 5,
      dropPeriod: DropPeriod.MONTH,
    });
    expect(schema.safeParse(values).success).toBe(true);
  });

  it("fills a disabled section with defaults so switching it on shows numbers", () => {
    const values = poolSettingsDefaults(
      "my-pool",
      existingSettings({
        salary_cap: null,
        ignore_x_worst_players: null,
        player_drop_settings: null,
        dynasty_settings: null,
      }),
    );

    expect(values.salaryCap).toBe(82_500_000);
    expect(values.numberOfWorstForwardsToIgnore).toBe(0);
    expect(values.maxPlayerDrops).toBe(3);
    expect(values.typeOfPool).toBe(PoolType.STANDARD);
  });
});

describe("poolSettingsToggles", () => {
  it("switches on the sections an existing pool has", () => {
    expect(poolSettingsToggles(existingSettings())).toEqual({
      dynasty: true,
      ignoreWorstPlayers: true,
      salaryCap: true,
      playerDrops: true,
    });
  });

  it("switches everything off for a pool that has none of them", () => {
    expect(
      poolSettingsToggles(
        existingSettings({
          salary_cap: null,
          ignore_x_worst_players: null,
          player_drop_settings: null,
          dynasty_settings: null,
        }),
      ),
    ).toEqual({
      dynasty: false,
      ignoreWorstPlayers: false,
      salaryCap: false,
      playerDrops: false,
    });
  });

  it("treats a pool being created as having no section on", () => {
    expect(poolSettingsToggles(null)).toEqual({
      dynasty: false,
      ignoreWorstPlayers: false,
      salaryCap: false,
      playerDrops: false,
    });
  });
});

describe("buildPoolSettingsSchema", () => {
  const parse = (overrides: Record<string, unknown>) =>
    schema.safeParse({
      ...poolSettingsDefaults("my-pool", null),
      ...overrides,
    });

  it("interpolates the failing bound into the message", () => {
    const result = parse({ numberOfForwards: 2 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      `NumberOfForwardsMinValidation:{"value":${POOL_SETTINGS_BOUNDS.numberOfForwards.min}}`,
    );
  });

  it("rejects a pool name shorter or longer than the bounds", () => {
    expect(parse({ name: "abc" }).success).toBe(false);
    expect(parse({ name: "a".repeat(17) }).success).toBe(false);
    expect(parse({ name: "a".repeat(16) }).success).toBe(true);
  });

  it("rejects fractional points, which the backend stores as a u8", () => {
    const result = parse({ forwardsPointsPerGoals: 1.5 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "PointsMustBeWholeNumberValidation",
    );
  });

  it("rejects points outside the u8 range", () => {
    expect(parse({ goaliesPointsPerWins: 256 }).success).toBe(false);
    expect(parse({ goaliesPointsPerWins: -1 }).success).toBe(false);
    expect(parse({ goaliesPointsPerWins: 255 }).success).toBe(true);
  });

  it("rejects a fractional number of drops", () => {
    const result = parse({ maxPlayerDrops: 2.5 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "MaxPlayerDropsMustBeWholeNumberValidation",
    );
  });
});

describe("toPoolSettings", () => {
  const values = poolSettingsDefaults("my-pool", existingSettings());
  const allOn = {
    dynasty: true,
    ignoreWorstPlayers: true,
    salaryCap: true,
    playerDrops: true,
  };

  it("sends the form values back, with the lists kept aside", () => {
    const settings = toPoolSettings(values, {
      toggles: allOn,
      assistants: ["assistant-2"],
      rosterModificationDates: ["2026-11-02"],
      oldPoolSettings: existingSettings(),
    });

    expect(settings).toMatchObject({
      number_poolers: 8,
      draft_type: DraftType.STANDARD,
      assistants: ["assistant-2"],
      roster_modification_date: ["2026-11-02"],
      salary_cap: 90_000_000,
      ignore_x_worst_players: { forwards: 2, defense: 1, goalies: 0 },
      player_drop_settings: { max_drops: 5, period: DropPeriod.MONTH },
      goalies_settings: { points_per_goals: 5, points_per_assists: 4 },
    });
  });

  it("nulls out every section that is switched off", () => {
    const settings = toPoolSettings(values, {
      toggles: {
        dynasty: false,
        ignoreWorstPlayers: false,
        salaryCap: false,
        playerDrops: false,
      },
      assistants: [],
      rosterModificationDates: [],
      oldPoolSettings: existingSettings(),
    });

    expect(settings.salary_cap).toBeNull();
    expect(settings.ignore_x_worst_players).toBeNull();
    expect(settings.player_drop_settings).toBeNull();
    expect(settings.dynasty_settings).toBeNull();
  });

  it("carries the dynasty lineage over untouched", () => {
    const settings = toPoolSettings(values, {
      toggles: allOn,
      assistants: [],
      rosterModificationDates: [],
      oldPoolSettings: existingSettings(),
    });

    expect(settings.dynasty_settings).toEqual({
      next_season_number_players_protected: 12,
      tradable_picks: 4,
      past_season_pool_name: ["pool-2025"],
      next_season_pool_name: "pool-2027",
    });
  });

  it("starts a pool created as a dynasty with an empty lineage", () => {
    const settings = toPoolSettings(poolSettingsDefaults("new-pool", null), {
      toggles: allOn,
      assistants: [],
      rosterModificationDates: [],
      oldPoolSettings: null,
    });

    expect(settings.dynasty_settings).toMatchObject({
      past_season_pool_name: [],
      next_season_pool_name: null,
    });
  });
});

describe("numberOrNull", () => {
  it("keeps a legitimate zero", () => {
    expect(numberOrNull("0")).toBe(0);
  });

  it("maps an emptied input to null", () => {
    expect(numberOrNull("")).toBeNull();
    expect(numberOrNull("   ")).toBeNull();
  });
});
