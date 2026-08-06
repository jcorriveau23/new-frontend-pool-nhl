import { describe, expect, it } from "vitest";

import {
  GoalieDailyInfo,
  GoalieGameStatus,
  GoaliesDailyTotalPoints,
  SkaterDailyInfo,
  SkatersDailyTotalPoints,
  TotalDailyPoints,
  getDailyGoalieStatsWithCumulative,
  getDailySkaterStatsWithCumulative,
} from "./scoring";
import {
  GoaliesSettings,
  PoolSettings,
  SkaterSettings,
} from "@/data/pool/model";

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

const poolSettings = {
  forwards_settings: skaterSettings,
  defense_settings: skaterSettings,
  goalies_settings: goaliesSettings,
} as PoolSettings;

const makeSkater = (
  goals: number,
  assists: number,
  shootoutGoals = 0
): SkaterDailyInfo => {
  const skater = new SkaterDailyInfo(1, true);
  skater.goals = goals;
  skater.assists = assists;
  skater.shootoutGoals = shootoutGoals;
  return skater;
};

const makeGoalie = (
  goals: number,
  assists: number,
  status: GoalieGameStatus | null
): GoalieDailyInfo => {
  const goalie = new GoalieDailyInfo(1, true);
  goalie.goals = goals;
  goalie.assists = assists;
  goalie.status = status;
  return goalie;
};

describe("SkaterDailyInfo.getTotalPoolPts", () => {
  it("counts goals, assists and shootout goals", () => {
    expect(makeSkater(1, 2, 1).getTotalPoolPts(skaterSettings)).toBe(
      1 * 2 + 2 * 1 + 1 * 1
    );
  });

  it("adds the hattrick bonus at 3 goals or more", () => {
    expect(makeSkater(3, 0).getTotalPoolPts(skaterSettings)).toBe(3 * 2 + 3);
    expect(makeSkater(4, 0).getTotalPoolPts(skaterSettings)).toBe(4 * 2 + 3);
  });

  it("gives no points for a player without stats", () => {
    expect(makeSkater(0, 0).getTotalPoolPts(skaterSettings)).toBe(0);
  });
});

describe("GoalieDailyInfo.getTotalPoolPts", () => {
  it("adds the win bonus", () => {
    expect(
      makeGoalie(0, 1, GoalieGameStatus.Win).getTotalPoolPts(goaliesSettings)
    ).toBe(1 + 2);
  });

  it("adds the win and shutout bonuses on a shutout", () => {
    expect(
      makeGoalie(0, 0, GoalieGameStatus.Shutout).getTotalPoolPts(
        goaliesSettings
      )
    ).toBe(2 + 3);
  });

  it("adds the overtime bonus on an overtime loss", () => {
    expect(
      makeGoalie(0, 0, GoalieGameStatus.OverTime).getTotalPoolPts(
        goaliesSettings
      )
    ).toBe(1);
  });

  it("gives only goal/assist points on a regulation loss", () => {
    expect(
      makeGoalie(1, 1, GoalieGameStatus.Losses).getTotalPoolPts(
        goaliesSettings
      )
    ).toBe(3 + 1);
  });

  it("gives only goal/assist points when there is no decision", () => {
    expect(makeGoalie(0, 2, null).getTotalPoolPts(goaliesSettings)).toBe(2);
  });
});

describe("getDailySkaterStatsWithCumulative", () => {
  it("marks the skater as not played when there is no stats entry", () => {
    const skater = getDailySkaterStatsWithCumulative(null, "8478402", skaterSettings);
    expect(skater.id).toBe(8478402);
    expect(skater.played).toBe(false);
    expect(skater.poolPoints).toBe(0);
  });

  it("computes pool points from the cumulated stats", () => {
    const skater = getDailySkaterStatsWithCumulative(
      { G: 3, A: 1, SOG: 1 },
      "8478402",
      skaterSettings
    );
    expect(skater.played).toBe(true);
    expect(skater.goals).toBe(3);
    // 3 goals * 2 + 1 assist * 1 + 1 shootout goal * 1 + hattrick bonus 3
    expect(skater.poolPoints).toBe(11);
  });

  it("treats a missing SOG field as zero", () => {
    const skater = getDailySkaterStatsWithCumulative(
      { G: 1, A: 0 },
      "1",
      skaterSettings
    );
    expect(skater.shootoutGoals).toBe(0);
    expect(skater.poolPoints).toBe(2);
  });
});

describe("getDailyGoalieStatsWithCumulative", () => {
  it("marks the goalie as not played when there is no stats entry", () => {
    const goalie = getDailyGoalieStatsWithCumulative(null, "1", goaliesSettings);
    expect(goalie.played).toBe(false);
    expect(goalie.status).toBeNull();
  });

  it.each([
    [{ OT: true, SO: false, W: false }, GoalieGameStatus.OverTime],
    [{ OT: false, SO: true, W: true }, GoalieGameStatus.Shutout],
    [{ OT: false, SO: false, W: true }, GoalieGameStatus.Win],
    [{ OT: false, SO: false, W: false }, GoalieGameStatus.Losses],
  ])("maps the decision flags %o to status %s", (flags, expected) => {
    const goalie = getDailyGoalieStatsWithCumulative(
      { G: 0, A: 0, ...flags },
      "1",
      goaliesSettings
    );
    expect(goalie.status).toBe(expected);
  });
});

describe("daily total points aggregation", () => {
  const forwards = [makeSkater(3, 1), makeSkater(0, 2), new SkaterDailyInfo(3, false)];
  const defense = [makeSkater(1, 0)];
  const goalies = [makeGoalie(0, 1, GoalieGameStatus.Win)];

  it("aggregates skater totals", () => {
    const totals = new SkatersDailyTotalPoints(forwards, skaterSettings);
    expect(totals.numberOfGame).toBe(2);
    expect(totals.goals).toBe(3);
    expect(totals.assists).toBe(3);
    expect(totals.hattricks).toBe(1);
    expect(totals.totalPoints).toBe(6);
    // (3*2 + 1 + 3) + (2*1)
    expect(totals.totalPoolPoints).toBe(12);
  });

  it("aggregates goalie totals by status", () => {
    const totals = new GoaliesDailyTotalPoints(
      [
        makeGoalie(0, 0, GoalieGameStatus.Win),
        makeGoalie(0, 0, GoalieGameStatus.Shutout),
        makeGoalie(0, 0, GoalieGameStatus.OverTime),
        new GoalieDailyInfo(4, false),
      ],
      goaliesSettings
    );
    expect(totals.numberOfGame).toBe(3);
    expect(totals.wins).toBe(1);
    expect(totals.shutouts).toBe(1);
    expect(totals.overtimeLosses).toBe(1);
    // win 2 + shutout (2+3) + overtime 1
    expect(totals.totalPoolPoints).toBe(8);
  });

  it("combines forwards, defense and goalies per participant", () => {
    const total = new TotalDailyPoints(
      "participant",
      forwards,
      defense,
      goalies,
      poolSettings
    );
    expect(total.participant).toBe("participant");
    expect(total.numberOfGames).toBe(4);
    // forwards 12 + defense 2 + goalie (1 + 2)
    expect(total.totalPoolPoints).toBe(17);
  });
});
