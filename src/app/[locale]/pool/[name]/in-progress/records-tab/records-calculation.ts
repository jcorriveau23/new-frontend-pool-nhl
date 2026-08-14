/*
Pure aggregation helpers behind the Records tab.

The pool already ships every scored day to the client in
`poolInfo.context.score_by_day`, so weekly/monthly champions, the trophy case
and the season records are all derived here without any extra request.

Note on scoring: records use the *raw* points a roster made on a given day and
deliberately ignore the `ignore_x_worst_players` setting. That rule trims the
worst players over the whole season to compute a cumulative standing; applying
it to a single night (or a single week) has no meaning, so it is not applied.
*/
import { format, startOfWeek } from "date-fns";

import {
  GoaliePoints,
  Pool,
  SkaterPoints,
  getGoaliePoolPoints,
  getSkaterPoolPoints,
} from "@/data/pool/model";

export interface BestPlayerOfDay {
  playerId: number;
  poolPoints: number;
}

export interface DailyParticipantPoints {
  // What a single participant's roster produced on a single date.
  date: string; // yyyy-MM-dd
  participantId: string;

  poolPoints: number;
  goals: number;
  assists: number;
  hattricks: number;
  shootoutGoals: number;
  goalieWins: number;
  shutouts: number;

  // Number of roster players that actually played that night.
  gamesPlayed: number;

  bestPlayer: BestPlayerOfDay | null;
}

export interface PeriodStanding {
  participantId: string;
  poolPoints: number;
}

export interface PeriodResult {
  // A calendar week or month, with the participants sorted by points made.
  key: string;
  start: string; // yyyy-MM-dd, first scored day of the period
  end: string; // yyyy-MM-dd, last scored day of the period
  standings: PeriodStanding[];
}

export interface TrophyCaseEntry {
  participantId: string;
  daysWon: number;
  weeksWon: number;
  monthsWon: number;
}

export enum RecordId {
  BestDay = "bestDay",
  BestWeek = "bestWeek",
  BestMonth = "bestMonth",
  BestPlayerNight = "bestPlayerNight",
  MostGoalsInADay = "mostGoalsInADay",
  MostGoalieWinsInADay = "mostGoalieWinsInADay",
  LongestDailyWinStreak = "longestDailyWinStreak",
  ColdestDay = "coldestDay",
}

export interface SeasonRecord {
  id: RecordId;
  participantId: string;
  value: number;

  // The date (or period) the record was set on, already formatted as yyyy-MM-dd
  // for a single day or "yyyy-MM-dd → yyyy-MM-dd" for a range.
  dateLabel: string;

  // Extra context for the records that need it (currently the player name).
  detail?: string;
}

const emptyDaily = (
  date: string,
  participantId: string
): DailyParticipantPoints => ({
  date,
  participantId,
  poolPoints: 0,
  goals: 0,
  assists: 0,
  hattricks: 0,
  shootoutGoals: 0,
  goalieWins: 0,
  shutouts: 0,
  gamesPlayed: 0,
  bestPlayer: null,
});

const accumulateSkater = (
  daily: DailyParticipantPoints,
  playerId: string,
  skater: SkaterPoints,
  poolPoints: number
) => {
  daily.poolPoints += poolPoints;
  daily.goals += skater.G;
  daily.assists += skater.A;
  daily.hattricks += skater.G >= 3 ? 1 : 0;
  daily.shootoutGoals += skater.SOG ?? 0;
  daily.gamesPlayed += 1;

  if (poolPoints > (daily.bestPlayer?.poolPoints ?? 0)) {
    daily.bestPlayer = { playerId: Number(playerId), poolPoints };
  }
};

const accumulateGoalie = (
  daily: DailyParticipantPoints,
  playerId: string,
  goalie: GoaliePoints,
  poolPoints: number
) => {
  daily.poolPoints += poolPoints;
  daily.goals += goalie.G;
  daily.assists += goalie.A;
  daily.goalieWins += goalie.W ? 1 : 0;
  daily.shutouts += goalie.SO ? 1 : 0;
  daily.gamesPlayed += 1;

  if (poolPoints > (daily.bestPlayer?.poolPoints ?? 0)) {
    daily.bestPlayer = { playerId: Number(playerId), poolPoints };
  }
};

export const buildDailyIndex = (
  poolInfo: Pool,
  poolStartDate: Date,
  poolSelectedEndDate: Date
): DailyParticipantPoints[] => {
  const scoreByDay = poolInfo.context?.score_by_day;
  if (!scoreByDay) {
    return [];
  }

  const startKey = format(poolStartDate, "yyyy-MM-dd");
  const endKey = format(poolSelectedEndDate, "yyyy-MM-dd");

  const dates = Object.keys(scoreByDay)
    .filter((date) => date >= startKey && date <= endKey)
    .sort();

  const index: DailyParticipantPoints[] = [];

  for (const date of dates) {
    for (const participant of poolInfo.participants) {
      const rosterPoints = scoreByDay[date][participant.id];
      if (!rosterPoints) {
        continue;
      }

      const daily = emptyDaily(date, participant.id);

      for (const [playerId, skater] of Object.entries(rosterPoints.roster.F)) {
        if (skater) {
          accumulateSkater(
            daily,
            playerId,
            skater,
            getSkaterPoolPoints(poolInfo.settings.forwards_settings, skater)
          );
        }
      }

      for (const [playerId, skater] of Object.entries(rosterPoints.roster.D)) {
        if (skater) {
          accumulateSkater(
            daily,
            playerId,
            skater,
            getSkaterPoolPoints(poolInfo.settings.defense_settings, skater)
          );
        }
      }

      for (const [playerId, goalie] of Object.entries(rosterPoints.roster.G)) {
        if (goalie) {
          accumulateGoalie(
            daily,
            playerId,
            goalie,
            getGoaliePoolPoints(poolInfo.settings.goalies_settings, goalie)
          );
        }
      }

      index.push(daily);
    }
  }

  return index;
};

export const weekKey = (date: string): string =>
  format(startOfWeek(new Date(`${date}T00:00:00`), { weekStartsOn: 1 }), "yyyy-MM-dd");

export const monthKey = (date: string): string => date.slice(0, 7);

export const aggregateByPeriod = (
  daily: DailyParticipantPoints[],
  keyOf: (date: string) => string
): PeriodResult[] => {
  const periods = new Map<
    string,
    { start: string; end: string; points: Map<string, number> }
  >();

  for (const day of daily) {
    const key = keyOf(day.date);
    let period = periods.get(key);

    if (!period) {
      period = { start: day.date, end: day.date, points: new Map() };
      periods.set(key, period);
    }

    if (day.date < period.start) period.start = day.date;
    if (day.date > period.end) period.end = day.date;

    period.points.set(
      day.participantId,
      (period.points.get(day.participantId) ?? 0) + day.poolPoints
    );
  }

  return Array.from(periods.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, period]) => ({
      key,
      start: period.start,
      end: period.end,
      standings: Array.from(period.points.entries())
        .map(([participantId, poolPoints]) => ({ participantId, poolPoints }))
        .sort((a, b) => b.poolPoints - a.poolPoints),
    }));
};

const winnersOf = (standings: PeriodStanding[]): string[] => {
  // A period is only won when points were actually made, and every participant
  // tied at the top shares the win.
  const best = standings[0]?.poolPoints ?? 0;
  if (best <= 0) {
    return [];
  }

  return standings
    .filter((standing) => standing.poolPoints === best)
    .map((standing) => standing.participantId);
};

export const computeTrophyCase = (
  days: PeriodResult[],
  weeks: PeriodResult[],
  months: PeriodResult[]
): TrophyCaseEntry[] => {
  const entries = new Map<string, TrophyCaseEntry>();

  const entryFor = (participantId: string) => {
    let entry = entries.get(participantId);
    if (!entry) {
      entry = { participantId, daysWon: 0, weeksWon: 0, monthsWon: 0 };
      entries.set(participantId, entry);
    }
    return entry;
  };

  for (const period of days) {
    for (const standing of period.standings) {
      entryFor(standing.participantId);
    }
    for (const winner of winnersOf(period.standings)) {
      entryFor(winner).daysWon += 1;
    }
  }

  for (const period of weeks) {
    for (const winner of winnersOf(period.standings)) {
      entryFor(winner).weeksWon += 1;
    }
  }

  for (const period of months) {
    for (const winner of winnersOf(period.standings)) {
      entryFor(winner).monthsWon += 1;
    }
  }

  return Array.from(entries.values()).sort(
    (a, b) =>
      b.monthsWon - a.monthsWon ||
      b.weeksWon - a.weeksWon ||
      b.daysWon - a.daysWon
  );
};

const bestPeriodRecord = (
  id: RecordId,
  periods: PeriodResult[]
): SeasonRecord | null => {
  let best: { period: PeriodResult; standing: PeriodStanding } | null = null;

  for (const period of periods) {
    const standing = period.standings[0];
    if (standing && standing.poolPoints > (best?.standing.poolPoints ?? 0)) {
      best = { period, standing };
    }
  }

  if (!best) {
    return null;
  }

  return {
    id,
    participantId: best.standing.participantId,
    value: best.standing.poolPoints,
    dateLabel:
      best.period.start === best.period.end
        ? best.period.start
        : `${best.period.start} → ${best.period.end}`,
  };
};

const bestDailyRecord = (
  id: RecordId,
  daily: DailyParticipantPoints[],
  valueOf: (day: DailyParticipantPoints) => number
): SeasonRecord | null => {
  let best: DailyParticipantPoints | null = null;

  for (const day of daily) {
    if (valueOf(day) > (best ? valueOf(best) : 0)) {
      best = day;
    }
  }

  if (!best) {
    return null;
  }

  return {
    id,
    participantId: best.participantId,
    value: valueOf(best),
    dateLabel: best.date,
  };
};

const bestPlayerNightRecord = (
  daily: DailyParticipantPoints[],
  poolInfo: Pool
): SeasonRecord | null => {
  let best: DailyParticipantPoints | null = null;

  for (const day of daily) {
    if ((day.bestPlayer?.poolPoints ?? 0) > (best?.bestPlayer?.poolPoints ?? 0)) {
      best = day;
    }
  }

  if (!best?.bestPlayer) {
    return null;
  }

  return {
    id: RecordId.BestPlayerNight,
    participantId: best.participantId,
    value: best.bestPlayer.poolPoints,
    dateLabel: best.date,
    detail: poolInfo.context?.players[best.bestPlayer.playerId.toString()]?.name,
  };
};

const coldestDayRecord = (
  daily: DailyParticipantPoints[]
): SeasonRecord | null => {
  // Only nights where the roster actually had players on the ice count, so a
  // day off is never mistaken for a bad night.
  let worst: DailyParticipantPoints | null = null;

  for (const day of daily) {
    if (day.gamesPlayed > 0 && (!worst || day.poolPoints < worst.poolPoints)) {
      worst = day;
    }
  }

  if (!worst) {
    return null;
  }

  return {
    id: RecordId.ColdestDay,
    participantId: worst.participantId,
    value: worst.poolPoints,
    dateLabel: worst.date,
  };
};

const longestDailyWinStreakRecord = (
  days: PeriodResult[]
): SeasonRecord | null => {
  // Longest run of consecutive scored days spent on top of the daily ranking.
  const current = new Map<string, { length: number; start: string }>();
  let best: { participantId: string; length: number; start: string; end: string } | null =
    null;

  for (const day of days) {
    const winners = new Set(winnersOf(day.standings));

    for (const participantId of Array.from(current.keys())) {
      if (!winners.has(participantId)) {
        current.delete(participantId);
      }
    }

    for (const participantId of winners) {
      const streak = current.get(participantId);
      const updated = streak
        ? { length: streak.length + 1, start: streak.start }
        : { length: 1, start: day.key };
      current.set(participantId, updated);

      if (updated.length > (best?.length ?? 0)) {
        best = {
          participantId,
          length: updated.length,
          start: updated.start,
          end: day.key,
        };
      }
    }
  }

  if (!best) {
    return null;
  }

  return {
    id: RecordId.LongestDailyWinStreak,
    participantId: best.participantId,
    value: best.length,
    dateLabel:
      best.start === best.end ? best.start : `${best.start} → ${best.end}`,
  };
};

export const computeSeasonRecords = (
  daily: DailyParticipantPoints[],
  days: PeriodResult[],
  weeks: PeriodResult[],
  months: PeriodResult[],
  poolInfo: Pool
): SeasonRecord[] =>
  [
    bestPeriodRecord(RecordId.BestDay, days),
    bestPeriodRecord(RecordId.BestWeek, weeks),
    bestPeriodRecord(RecordId.BestMonth, months),
    bestPlayerNightRecord(daily, poolInfo),
    bestDailyRecord(RecordId.MostGoalsInADay, daily, (day) => day.goals),
    bestDailyRecord(
      RecordId.MostGoalieWinsInADay,
      daily,
      (day) => day.goalieWins
    ),
    longestDailyWinStreakRecord(days),
    coldestDayRecord(daily),
  ].filter((record): record is SeasonRecord => record !== null);

export interface PoolRecords {
  daily: DailyParticipantPoints[];
  days: PeriodResult[];
  weeks: PeriodResult[];
  months: PeriodResult[];
  trophyCase: TrophyCaseEntry[];
  records: SeasonRecord[];
}

export const computePoolRecords = (
  poolInfo: Pool,
  poolStartDate: Date,
  poolSelectedEndDate: Date
): PoolRecords => {
  const daily = buildDailyIndex(poolInfo, poolStartDate, poolSelectedEndDate);

  const days = aggregateByPeriod(daily, (date) => date);
  const weeks = aggregateByPeriod(daily, weekKey);
  const months = aggregateByPeriod(daily, monthKey);

  return {
    daily,
    days,
    weeks,
    months,
    trophyCase: computeTrophyCase(days, weeks, months),
    records: computeSeasonRecords(daily, days, weeks, months, poolInfo),
  };
};
