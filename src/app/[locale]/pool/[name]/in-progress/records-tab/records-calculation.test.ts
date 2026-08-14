import { describe, expect, it } from "vitest";

import {
  DailyRosterPoints,
  GoaliesSettings,
  Player,
  Pool,
  PoolSettings,
  SkaterSettings,
} from "@/data/pool/model";

import {
  DailyParticipantPoints,
  RecordId,
  aggregateByPeriod,
  computePoolRecords,
  computeTrophyCase,
  monthKey,
  weekKey,
} from "./records-calculation";

const skaterSettings: SkaterSettings = {
  points_per_goals: 2,
  points_per_assists: 1,
  points_per_hattricks: 3,
  points_per_shootout_goals: 1,
};

const goaliesSettings: GoaliesSettings = {
  points_per_wins: 2,
  points_per_shutouts: 3,
  points_per_overtimes: 1,
  points_per_goals: 3,
  points_per_assists: 1,
};

const ALICE = "alice-id";
const BOB = "bob-id";

const day = (
  aliceRoster: DailyRosterPoints,
  bobRoster: DailyRosterPoints
): Record<string, DailyRosterPoints> => ({
  [ALICE]: aliceRoster,
  [BOB]: bobRoster,
});

const forwards = (
  players: Record<string, { G: number; A: number } | null>
): DailyRosterPoints => ({
  roster: { F: players, D: {}, G: {} },
  is_cumulated: true,
});

/*
Fixture timeline (Monday-started weeks), pool points in parentheses:

  Mon 2024-01-22  Alice 1G (2)          Bob 2A (2)            -> tied, both win
  Tue 2024-01-23  Alice hat trick (9)   Bob did not play (0)  -> Alice
  Mon 2024-01-29  Alice 1A (1)          Bob 2G (4)            -> Bob
  Thu 2024-02-01  Alice played, 0 pts   Bob W + SO (5)        -> Bob
  Mon 2024-02-05  Alice 1G by a D (2)   Bob did not play (0)  -> Alice

Weeks:  01-22 Alice 11 / Bob 2 | 01-29 Alice 1 / Bob 9 | 02-05 Alice 2 / Bob 0
Months: 2024-01 Alice 12 / Bob 6 | 2024-02 Alice 2 / Bob 5
*/
const makePool = (): Pool =>
  ({
    name: "test-pool",
    participants: [
      { id: ALICE, name: "Alice", is_owned: true },
      { id: BOB, name: "Bob", is_owned: true },
    ],
    settings: {
      forwards_settings: skaterSettings,
      defense_settings: skaterSettings,
      goalies_settings: goaliesSettings,
    } as PoolSettings,
    context: {
      players: {
        "101": { id: 101, name: "Alice Forward" } as Player,
        "102": { id: 102, name: "Alice Defender" } as Player,
        "201": { id: 201, name: "Bob Forward" } as Player,
        "202": { id: 202, name: "Bob Goalie" } as Player,
      },
      score_by_day: {
        "2024-01-22": day(
          forwards({ "101": { G: 1, A: 0 } }),
          forwards({ "201": { G: 0, A: 2 } })
        ),
        "2024-01-23": day(
          forwards({ "101": { G: 3, A: 0 } }),
          forwards({ "201": null })
        ),
        "2024-01-29": day(
          forwards({ "101": { G: 0, A: 1 } }),
          forwards({ "201": { G: 2, A: 0 } })
        ),
        "2024-02-01": day(forwards({ "101": { G: 0, A: 0 } }), {
          roster: {
            F: {},
            D: {},
            G: { "202": { G: 0, A: 0, W: true, SO: true, OT: false } },
          },
          is_cumulated: true,
        }),
        "2024-02-05": day(
          {
            roster: { F: {}, D: { "102": { G: 1, A: 0 } }, G: {} },
            is_cumulated: true,
          },
          forwards({ "201": null })
        ),
      },
    },
  }) as unknown as Pool;

const seasonStart = new Date("2024-01-01T00:00:00");
const seasonEnd = new Date("2024-02-28T00:00:00");

const recordOf = (
  records: { id: RecordId }[],
  id: RecordId
): Record<string, unknown> | undefined =>
  records.find((record) => record.id === id) as
    | Record<string, unknown>
    | undefined;

describe("weekKey / monthKey", () => {
  it("groups a Monday-to-Sunday week under its Monday", () => {
    expect(weekKey("2024-01-29")).toBe("2024-01-29"); // Monday
    expect(weekKey("2024-02-01")).toBe("2024-01-29"); // Thursday
    expect(weekKey("2024-02-04")).toBe("2024-01-29"); // Sunday
    expect(weekKey("2024-02-05")).toBe("2024-02-05"); // next Monday
  });

  it("groups dates by calendar month", () => {
    expect(monthKey("2024-01-31")).toBe("2024-01");
    expect(monthKey("2024-02-01")).toBe("2024-02");
  });
});

describe("buildDailyIndex", () => {
  it("scores each participant's night from the pool settings", () => {
    const { daily } = computePoolRecords(makePool(), seasonStart, seasonEnd);

    const hatTrickNight = daily.find(
      (entry) => entry.date === "2024-01-23" && entry.participantId === ALICE
    );

    expect(hatTrickNight).toMatchObject({
      poolPoints: 9, // 3 goals * 2 + 3 for the hat trick
      goals: 3,
      hattricks: 1,
      gamesPlayed: 1,
      bestPlayer: { playerId: 101, poolPoints: 9 },
    });

    const goalieNight = daily.find(
      (entry) => entry.date === "2024-02-01" && entry.participantId === BOB
    );

    expect(goalieNight).toMatchObject({
      poolPoints: 5, // win + shutout
      goalieWins: 1,
      shutouts: 1,
      gamesPlayed: 1,
    });
  });

  it("counts a rostered player who did not play as no game", () => {
    const { daily } = computePoolRecords(makePool(), seasonStart, seasonEnd);

    expect(
      daily.find(
        (entry) => entry.date === "2024-01-23" && entry.participantId === BOB
      )
    ).toMatchObject({ poolPoints: 0, gamesPlayed: 0, bestPlayer: null });
  });

  it("ignores days outside the selected range", () => {
    const { days } = computePoolRecords(
      makePool(),
      seasonStart,
      new Date("2024-01-31T00:00:00")
    );

    expect(days.map((period) => period.key)).toEqual([
      "2024-01-22",
      "2024-01-23",
      "2024-01-29",
    ]);
  });

  it("returns empty results for a pool with no scored day", () => {
    const pool = makePool();
    pool.context!.score_by_day = null;

    expect(computePoolRecords(pool, seasonStart, seasonEnd)).toMatchObject({
      daily: [],
      weeks: [],
      months: [],
      trophyCase: [],
      records: [],
    });
  });
});

describe("aggregateByPeriod", () => {
  it("sums points per period and sorts the standings", () => {
    const { weeks, months } = computePoolRecords(
      makePool(),
      seasonStart,
      seasonEnd
    );

    expect(weeks.map((week) => week.key)).toEqual([
      "2024-01-22",
      "2024-01-29",
      "2024-02-05",
    ]);
    expect(weeks[0]).toMatchObject({
      start: "2024-01-22",
      end: "2024-01-23",
      standings: [
        { participantId: ALICE, poolPoints: 11 },
        { participantId: BOB, poolPoints: 2 },
      ],
    });
    expect(weeks[1].standings[0]).toEqual({
      participantId: BOB,
      poolPoints: 9,
    });

    expect(months.map((month) => month.key)).toEqual(["2024-01", "2024-02"]);
    expect(months[0].standings).toEqual([
      { participantId: ALICE, poolPoints: 12 },
      { participantId: BOB, poolPoints: 6 },
    ]);
    expect(months[1].standings).toEqual([
      { participantId: BOB, poolPoints: 5 },
      { participantId: ALICE, poolPoints: 2 },
    ]);
  });
});

describe("computeTrophyCase", () => {
  it("counts days, weeks and months won", () => {
    const { trophyCase } = computePoolRecords(
      makePool(),
      seasonStart,
      seasonEnd
    );

    expect(trophyCase).toEqual([
      { participantId: ALICE, daysWon: 3, weeksWon: 2, monthsWon: 1 },
      { participantId: BOB, daysWon: 3, weeksWon: 1, monthsWon: 1 },
    ]);
  });

  it("credits every participant tied at the top", () => {
    const daily: DailyParticipantPoints[] = [
      { date: "2024-03-01", participantId: ALICE, poolPoints: 4 },
      { date: "2024-03-01", participantId: BOB, poolPoints: 4 },
    ].map((partial) => partial as DailyParticipantPoints);

    const days = aggregateByPeriod(daily, (date) => date);

    expect(computeTrophyCase(days, [], [])).toEqual([
      { participantId: ALICE, daysWon: 1, weeksWon: 0, monthsWon: 0 },
      { participantId: BOB, daysWon: 1, weeksWon: 0, monthsWon: 0 },
    ]);
  });

  it("awards nothing for a period where nobody scored", () => {
    const daily: DailyParticipantPoints[] = [
      { date: "2024-03-01", participantId: ALICE, poolPoints: 0 },
      { date: "2024-03-01", participantId: BOB, poolPoints: 0 },
    ].map((partial) => partial as DailyParticipantPoints);

    const days = aggregateByPeriod(daily, (date) => date);

    expect(computeTrophyCase(days, [], [])).toEqual([
      { participantId: ALICE, daysWon: 0, weeksWon: 0, monthsWon: 0 },
      { participantId: BOB, daysWon: 0, weeksWon: 0, monthsWon: 0 },
    ]);
  });
});

describe("computeSeasonRecords", () => {
  it("reports the season highs and lows", () => {
    const { records } = computePoolRecords(makePool(), seasonStart, seasonEnd);

    expect(recordOf(records, RecordId.BestDay)).toMatchObject({
      participantId: ALICE,
      value: 9,
      dateLabel: "2024-01-23",
    });
    expect(recordOf(records, RecordId.BestWeek)).toMatchObject({
      participantId: ALICE,
      value: 11,
      dateLabel: "2024-01-22 → 2024-01-23",
    });
    expect(recordOf(records, RecordId.BestMonth)).toMatchObject({
      participantId: ALICE,
      value: 12,
      dateLabel: "2024-01-22 → 2024-01-29",
    });
    expect(recordOf(records, RecordId.BestPlayerNight)).toMatchObject({
      participantId: ALICE,
      value: 9,
      detail: "Alice Forward",
    });
    expect(recordOf(records, RecordId.MostGoalsInADay)).toMatchObject({
      participantId: ALICE,
      value: 3,
    });
    expect(recordOf(records, RecordId.MostGoalieWinsInADay)).toMatchObject({
      participantId: BOB,
      value: 1,
      dateLabel: "2024-02-01",
    });
  });

  it("tracks the longest run at the top of the daily ranking", () => {
    const { records } = computePoolRecords(makePool(), seasonStart, seasonEnd);

    expect(recordOf(records, RecordId.LongestDailyWinStreak)).toMatchObject({
      participantId: ALICE,
      value: 2,
      dateLabel: "2024-01-22 → 2024-01-23",
    });
  });

  it("only considers nights where players actually played for the coldest day", () => {
    const { records } = computePoolRecords(makePool(), seasonStart, seasonEnd);

    // Bob has 0-point nights on 01-23 and 02-05, but nobody on his roster
    // played, so Alice's scoreless 02-01 is the real cold night.
    expect(recordOf(records, RecordId.ColdestDay)).toMatchObject({
      participantId: ALICE,
      value: 0,
      dateLabel: "2024-02-01",
    });
  });
});
