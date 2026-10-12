import { describe, expect, it } from "vitest";

import {
  DEFAULT_SURVIVOR_FORM_VALUES,
  LEAGUE_TEAM_COUNT,
  SURVIVOR_BOUNDS,
  SURVIVOR_POOL_NAME_MAX_LENGTH,
  SURVIVOR_POOL_NAME_MIN_LENGTH,
  SurvivorFormValues,
  SurvivorSettingsFormValues,
  buildSurvivorFormSchema,
  buildSurvivorSettingsSchema,
  mergeSurvivorSettings,
  numberOrNull,
  toSurvivorFormValues,
  toSurvivorSettings,
  toSurvivorSettingsFormValues,
} from "./survivor-settings-form";

// The real translator interpolates; the key and its values are all these tests
// need to tell one message apart from another.
const t = (key: string, values?: Record<string, number | string>) =>
  values === undefined ? key : `${key}:${JSON.stringify(values)}`;

const schema = buildSurvivorFormSchema(t);

const values = (
  overrides: Partial<SurvivorFormValues> = {},
): SurvivorFormValues => ({
  ...DEFAULT_SURVIVOR_FORM_VALUES,
  poolName: "my survivor pool",
  participantName: "Raph",
  ...overrides,
});

// The first message for a field, so a failing bound can be named.
const errorFor = (input: unknown, field: string): string | undefined => {
  const result = schema.safeParse(input);
  if (result.success) {
    return undefined;
  }
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("buildSurvivorFormSchema", () => {
  it("accepts a pool somebody would actually create", () => {
    expect(schema.safeParse(values()).success).toBe(true);
  });

  it("accepts the defaults once the two names are filled in", () => {
    // The defaults are what the form mounts with, so they must be valid as
    // soon as a name is typed rather than needing a field corrected.
    expect(schema.safeParse(values()).success).toBe(true);
    expect(DEFAULT_SURVIVOR_FORM_VALUES.strikesAllowed).toBe(0);
    expect(DEFAULT_SURVIVOR_FORM_VALUES.missedPickIsStrike).toBe(true);
  });

  describe("the pool name", () => {
    it("is refused when shorter than the backend accepts", () => {
      const message = errorFor(
        values({ poolName: "x".repeat(SURVIVOR_POOL_NAME_MIN_LENGTH - 1) }),
        "poolName",
      );

      expect(message).toContain("PoolNameMinLenghtValidation");
    });

    it("is refused when longer than the backend accepts", () => {
      const message = errorFor(
        values({ poolName: "x".repeat(SURVIVOR_POOL_NAME_MAX_LENGTH + 1) }),
        "poolName",
      );

      expect(message).toContain("PoolNameMaxLenghtValidation");
    });

    it("is measured after trimming, so spaces do not pad it to length", () => {
      expect(errorFor(values({ poolName: "  ab  " }), "poolName")).toContain(
        "PoolNameMinLenghtValidation",
      );
    });
  });

  describe("the participant name", () => {
    it("is required", () => {
      expect(
        errorFor(values({ participantName: "   " }), "participantName"),
      ).toBe("SurvivorNameRequiredValidation");
    });

    it("is refused when too long for a standings row", () => {
      const message = errorFor(
        values({ participantName: "x".repeat(33) }),
        "participantName",
      );

      expect(message).toContain("SurvivorNameMaxLengthValidation");
    });
  });

  describe("the participant maximum", () => {
    it("takes the hundreds the pool type exists for", () => {
      expect(schema.safeParse(values({ maxParticipants: 500 })).success).toBe(
        true,
      );
    });

    it("is refused below two, which is not a pool", () => {
      expect(
        errorFor(values({ maxParticipants: 1 }), "maxParticipants"),
      ).toContain("SurvivorMaxParticipantsMinValidation");
    });

    it("is refused above the ceiling the backend holds it to", () => {
      expect(
        errorFor(
          values({ maxParticipants: SURVIVOR_BOUNDS.maxParticipants.max + 1 }),
          "maxParticipants",
        ),
      ).toContain("SurvivorMaxParticipantsMaxValidation");
    });

    it("is refused when not a whole number", () => {
      expect(
        errorFor(values({ maxParticipants: 10.5 }), "maxParticipants"),
      ).toBe("SurvivorMaxParticipantsWholeNumberValidation");
    });

    // An empty number input becomes null, which must read as "missing" rather
    // than slipping through as a zero.
    it("is refused when the field was left empty", () => {
      expect(
        schema.safeParse(values({ maxParticipants: null as unknown as number }))
          .success,
      ).toBe(false);
    });
  });

  describe("the losses allowed", () => {
    it("accepts zero, which is classic survivor", () => {
      expect(schema.safeParse(values({ strikesAllowed: 0 })).success).toBe(
        true,
      );
    });

    it("is refused below zero", () => {
      expect(
        errorFor(values({ strikesAllowed: -1 }), "strikesAllowed"),
      ).toContain("SurvivorStrikesMinValidation");
    });

    it("is refused above the maximum", () => {
      expect(
        errorFor(
          values({ strikesAllowed: SURVIVOR_BOUNDS.strikesAllowed.max + 1 }),
          "strikesAllowed",
        ),
      ).toContain("SurvivorStrikesMaxValidation");
    });

    it("is refused when not a whole number", () => {
      expect(errorFor(values({ strikesAllowed: 1.5 }), "strikesAllowed")).toBe(
        "SurvivorStrikesWholeNumberValidation",
      );
    });
  });
});

describe("toSurvivorSettings", () => {
  it("maps the form onto what the backend takes", () => {
    const settings = toSurvivorSettings(
      values({
        maxParticipants: 250,
        strikesAllowed: 1,
        missedPickIsStrike: false,
        allowPickChange: false,
      }),
    );

    expect(settings).toEqual({
      assistants: [],
      max_participants: 250,
      strikes_allowed: 1,
      missed_pick_is_strike: false,
      allow_pick_change: false,
      league_team_count: LEAGUE_TEAM_COUNT,
    });
  });

  it("carries the league size, which is not a field the owner sets", () => {
    // It is in the settings so a pool keeps its own number when the league
    // changes size, not so the owner can choose it.
    expect(toSurvivorSettings(values()).league_team_count).toBe(32);
  });
});

describe("toSurvivorFormValues", () => {
  it("round-trips through the settings unchanged", () => {
    const original = values({
      poolName: "round trip",
      participantName: "Raph",
      maxParticipants: 300,
      strikesAllowed: 2,
      missedPickIsStrike: false,
      allowPickChange: true,
    });

    const back = toSurvivorFormValues(
      original.poolName,
      toSurvivorSettings(original),
      original.participantName,
    );

    expect(back).toEqual(original);
  });
});

describe("numberOrNull", () => {
  it("is null for an empty field rather than zero", () => {
    // Number("") is 0, which would pass a min of 0 and silently mean something.
    expect(numberOrNull("")).toBeNull();
  });

  it("is the number otherwise", () => {
    expect(numberOrNull("250")).toBe(250);
    expect(numberOrNull("0")).toBe(0);
  });
});

describe("buildSurvivorSettingsSchema", () => {
  const settingsValues = (
    overrides: Partial<SurvivorSettingsFormValues> = {},
  ): SurvivorSettingsFormValues => ({
    maxParticipants: 100,
    strikesAllowed: 0,
    missedPickIsStrike: true,
    allowPickChange: true,
    ...overrides,
  });

  it("asks for nothing a creation needs", () => {
    // The name is in the URL of the pool being edited and the owner already
    // has a participant, so neither is on this form — and the schema must not
    // refuse values that leave them out.
    expect(
      buildSurvivorSettingsSchema(t).safeParse(settingsValues()).success,
    ).toBe(true);
  });

  it("applies the same bounds the pool was created under", () => {
    const schema = buildSurvivorSettingsSchema(t);

    expect(
      schema.safeParse(settingsValues({ maxParticipants: 1 })).success,
    ).toBe(false);
    expect(
      schema.safeParse(
        settingsValues({
          strikesAllowed: SURVIVOR_BOUNDS.strikesAllowed.max + 1,
        }),
      ).success,
    ).toBe(false);
  });

  describe("the floor the cap may be lowered to", () => {
    // The backend refuses a cap below the pool's own participant list; the
    // form is given that number so it says so before the request goes out.
    const schema = buildSurvivorSettingsSchema(t, 6);

    it("refuses a cap below the people already in", () => {
      const result = schema.safeParse(settingsValues({ maxParticipants: 5 }));

      expect(result.success).toBe(false);
      expect(
        result.success
          ? undefined
          : result.error.issues.find(
              (issue) => issue.path[0] === "maxParticipants",
            )?.message,
      ).toContain("SurvivorMaxParticipantsMinValidation");
    });

    it("accepts a cap down to exactly the people already in", () => {
      expect(
        schema.safeParse(settingsValues({ maxParticipants: 6 })).success,
      ).toBe(true);
    });

    it("still refuses a cap above the ceiling", () => {
      expect(
        schema.safeParse(
          settingsValues({
            maxParticipants: SURVIVOR_BOUNDS.maxParticipants.max + 1,
          }),
        ).success,
      ).toBe(false);
    });
  });
});

describe("mergeSurvivorSettings", () => {
  const current = {
    assistants: ["helper-id"],
    max_participants: 100,
    strikes_allowed: 0,
    missed_pick_is_strike: true,
    allow_pick_change: true,
    league_team_count: 31,
  };

  const edited = {
    maxParticipants: 250,
    strikesAllowed: 1,
    missedPickIsStrike: false,
    allowPickChange: false,
  };

  it("takes the four fields the form shows from the form", () => {
    expect(mergeSurvivorSettings(current, edited)).toMatchObject({
      max_participants: 250,
      strikes_allowed: 1,
      missed_pick_is_strike: false,
      allow_pick_change: false,
    });
  });

  it("keeps the assistants, which are managed elsewhere", () => {
    // Assembling the payload from the form alone would send an empty list and
    // quietly strip the pool's assistants.
    expect(mergeSurvivorSettings(current, edited).assistants).toEqual([
      "helper-id",
    ]);
  });

  it("keeps the pool's own league size rather than today's", () => {
    // A pool that opened in a season with 31 teams keeps that number: it is
    // what decides when a participant has been through them all.
    expect(mergeSurvivorSettings(current, edited).league_team_count).toBe(31);
    expect(LEAGUE_TEAM_COUNT).not.toBe(31);
  });

  it("carries through a field this frontend does not model", () => {
    // The pool is parsed with a loose schema, so the backend can be ahead of
    // the frontend; an edit must not drop what it sent.
    const withUnknown = { ...current, future_setting: "kept" };

    expect(mergeSurvivorSettings(withUnknown, edited)).toMatchObject({
      future_setting: "kept",
    });
  });

  it("round-trips through the form values unchanged", () => {
    expect(
      mergeSurvivorSettings(current, toSurvivorSettingsFormValues(current)),
    ).toEqual(current);
  });
});
