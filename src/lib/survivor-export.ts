/*
A survivor pool, turned into an `ExportDocument`.

A different game from the roster pool and so a different document: no rosters,
no scoring, and the whole history of it is one pick per person per Saturday.
What people ask for at the end of one is the board — who went out, in which
week, on which team — which is the pick table below.

The picks come from the standings payload rather than from the pool, because
that is where they are: a survivor pool holds hundreds of people and its picks
are their own collection, fetched per date. The payload also decides what may
be shown at all — an open date is simply absent from it, which is what keeps an
export from being a way to read the field's picks before the deadline.
*/
import {
  ParticipantStatus,
  PickOutcome,
  SurvivorPool,
  SurvivorStandingRow,
  SurvivorStandings,
  SurvivorState,
  SurvivorUser,
  WeekStatus,
} from "@/data/survivor/model";
import {
  ExportCell,
  ExportDocument,
  ExportTable,
  keepSections,
  Translator,
} from "@/lib/export-document";
import { teamLabel } from "@/lib/teams";

export interface SurvivorExportInput {
  pool: SurvivorPool;
  // Null while they are still being fetched, in which case the document is the
  // pool's own schedule and settings without the board.
  standings: SurvivorStandings | null;
  t: Translator;
  generatedAt?: string;
}

const PARTICIPANT_STATUS_KEY: Record<ParticipantStatus, string> = {
  [ParticipantStatus.Alive]: "ExportStatusAlive",
  [ParticipantStatus.Eliminated]: "ExportStatusEliminated",
};

const WEEK_STATUS_KEY: Record<WeekStatus, string> = {
  [WeekStatus.Open]: "ExportWeekOpen",
  [WeekStatus.Locked]: "ExportWeekLocked",
  [WeekStatus.Settled]: "ExportWeekSettled",
};

const OUTCOME_KEY: Record<PickOutcome, string> = {
  [PickOutcome.Won]: "SurvivorOutcomeWon",
  [PickOutcome.Lost]: "SurvivorOutcomeLost",
  [PickOutcome.Void]: "SurvivorOutcomeVoid",
  [PickOutcome.Pending]: "SurvivorOutcomePending",
};

const SURVIVOR_STATE_KEY: Record<SurvivorState, string> = {
  [SurvivorState.Created]: "SurvivorPoolOpenToJoin",
  [SurvivorState.InProgress]: "PoolInProgressState",
  [SurvivorState.Final]: "SurvivorPoolOver",
};

/*
Standing order: everybody still in, by wins, then everybody out, latest to go
first.

It is the order the pool is read in — who is left, then how far the rest got —
and it is not an order the payload comes in, so it is applied here rather than
left to whatever the rows arrived as.
*/
function orderedRows(rows: SurvivorStandingRow[]): SurvivorStandingRow[] {
  const isAlive = (row: SurvivorStandingRow) =>
    row.status === ParticipantStatus.Alive;

  return [...rows].sort((left, right) => {
    if (isAlive(left) !== isAlive(right)) {
      return isAlive(left) ? -1 : 1;
    }
    if (left.wins !== right.wins) {
      return right.wins - left.wins;
    }
    // Both out: the one who lasted longer comes first. A null elimination week
    // on a row that is out is a pool that has not recorded one, which sorts
    // last rather than first.
    const leftOut = left.eliminated_week ?? 0;
    const rightOut = right.eliminated_week ?? 0;
    if (leftOut !== rightOut) {
      return rightOut - leftOut;
    }
    return left.name.localeCompare(right.name);
  });
}

function standingsTable(input: SurvivorExportInput): ExportTable | null {
  const { standings, t } = input;
  if (standings === null || standings.rows.length === 0) {
    return null;
  }

  return {
    key: "standings",
    title: t("SurvivorStandingsTab"),
    note: `${t("SurvivorStillAlive", {
      count: standings.alive_count,
    })} · ${t("SurvivorEliminated", { count: standings.eliminated_count })}`,
    columns: [
      t("Rank"),
      t("SurvivorParticipantName"),
      t("Status"),
      t("WeeksWon"),
      t("SurvivorStrikes"),
      t("ExportEliminatedInWeek"),
    ],
    rows: orderedRows(standings.rows).map((row, index) => [
      index + 1,
      row.name,
      t(PARTICIPANT_STATUS_KEY[row.status]),
      row.wins,
      row.strikes,
      row.eliminated_week,
    ]),
  };
}

/*
Every revealed pick, one per row.

Long rather than a grid of participants against weeks. The grid is what the
screen shows and it is the wrong shape the moment a pool has more than a
handful of people — nobody prints a table two hundred rows by twenty-six
columns — while a row per pick sorts, filters and pivots by either axis.

Week and date both: the week number is what a pick carries and the date is
what anybody actually remembers it by.
*/
function picksTable(input: SurvivorExportInput): ExportTable | null {
  const { pool, standings, t } = input;
  if (standings === null) {
    return null;
  }

  const dateByWeek = new Map(
    pool.weeks.map((week) => [week.week, week.pick_date]),
  );
  const rows: ExportCell[][] = [];

  // By date, then by participant: a log of the pool as it was played.
  for (const week of [...standings.revealed_weeks].sort((a, b) => a - b)) {
    for (const row of orderedRows(standings.rows)) {
      const pick = row.picks[String(week)];
      if (pick === undefined) {
        continue;
      }
      rows.push([
        week,
        dateByWeek.get(week) ?? null,
        row.name,
        teamLabel(pick.team_id),
        t(OUTCOME_KEY[pick.outcome]),
      ]);
    }
  }

  if (rows.length === 0) {
    return null;
  }

  return {
    key: "picks",
    title: t("SurvivorPickTab"),
    // The one thing a reader has to know about this table: a date still open
    // is not in it, and that is on purpose rather than missing data.
    note: t("ExportRevealedPicksOnly"),
    columns: [
      t("ExportWeek"),
      t("Date"),
      t("SurvivorParticipantName"),
      t("Team"),
      t("ExportOutcome"),
    ],
    rows,
  };
}

function weeksTable(input: SurvivorExportInput): ExportTable | null {
  const { pool, t } = input;
  if (pool.weeks.length === 0) {
    return null;
  }

  return {
    key: "weeks",
    title: t("ExportSchedule"),
    columns: [t("ExportWeek"), t("Date"), t("Status"), t("ExportTeamsPlaying")],
    rows: pool.weeks.map((week) => [
      week.week,
      week.pick_date,
      t(WEEK_STATUS_KEY[week.status]),
      week.eligible_team_ids.length,
    ]),
  };
}

function participantsTable(input: SurvivorExportInput): ExportTable | null {
  const { pool, t } = input;
  if (pool.participants.length === 0) {
    return null;
  }

  return {
    key: "participants",
    title: t("Participants"),
    columns: [
      t("SurvivorParticipantName"),
      t("Status"),
      t("ParticipantHasAccount"),
    ],
    rows: pool.participants.map((person: SurvivorUser) => [
      person.name,
      t(PARTICIPANT_STATUS_KEY[person.status]),
      person.is_owned,
    ]),
  };
}

function settingsTable(input: SurvivorExportInput): ExportTable {
  const { pool, t } = input;
  const settings = pool.settings;
  const rows: ExportCell[][] = [
    [t("SurvivorMaxParticipants"), settings.max_participants],
    [t("SurvivorStrikesAllowedLabel"), settings.strikes_allowed],
    [t("SurvivorMissedPickIsStrike"), settings.missed_pick_is_strike],
    [t("SurvivorAllowPickChange"), settings.allow_pick_change],
    [t("SurvivorPublicPicks"), settings.public_picks],
    [t("ExportLeagueTeamCount"), settings.league_team_count],
  ];

  if (settings.assistants.length > 0) {
    rows.push([
      t("Assistants"),
      settings.assistants
        .map(
          (id) =>
            pool.participants.find((person) => person.id === id)?.name ?? id,
        )
        .join(", "),
    ]);
  }

  return {
    key: "settings",
    title: t("Settings"),
    columns: [t("ExportSetting"), t("ExportValue")],
    rows,
  };
}

const nameOf = (pool: SurvivorPool, participantId: string): string =>
  pool.participants.find((person) => person.id === participantId)?.name ??
  participantId;

export function buildSurvivorExport(
  input: SurvivorExportInput,
): ExportDocument {
  const { pool, standings, t } = input;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const sections = keepSections([
    {
      key: "section-standings",
      title: t("SurvivorStandingsTab"),
      tables: [standingsTable(input)],
    },
    {
      key: "section-picks",
      title: t("SurvivorPickTab"),
      tables: [picksTable(input)],
    },
    {
      key: "section-schedule",
      title: t("ExportSchedule"),
      tables: [weeksTable(input)],
    },
    {
      key: "section-participants",
      title: t("Participants"),
      tables: [participantsTable(input)],
    },
    {
      key: "section-settings",
      title: t("Settings"),
      tables: [settingsTable(input)],
    },
  ]);

  const winners = (pool.winners ?? []).map((id) => nameOf(pool, id));

  const meta = [
    { label: t("Season"), value: pool.season },
    { label: t("Owner"), value: nameOf(pool, pool.owner) },
    { label: t("Status"), value: t(SURVIVOR_STATE_KEY[pool.status]) },
    {
      label: t("Participants"),
      value: t("SurvivorParticipantCount", {
        count: pool.participants.length,
        max: pool.settings.max_participants,
      }),
    },
  ];

  if (standings !== null) {
    meta.push({
      label: t("SurvivorStandingsTab"),
      value: t("SurvivorStillAlive", { count: standings.alive_count }),
    });
  }
  // Only on a pool that has one, which is a pool that is over.
  if (winners.length > 0) {
    meta.push({ label: t("ExportWinners"), value: winners.join(", ") });
  }

  return {
    title: t("ExportSurvivorTitle", { pool: pool.name }),
    subtitle: t("ExportGeneratedOn", { date: generatedAt.slice(0, 10) }),
    meta,
    sections,
    generatedAt,
  };
}
