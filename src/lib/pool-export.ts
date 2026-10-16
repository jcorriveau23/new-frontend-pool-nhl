/*
A roster pool, turned into an `ExportDocument`.

Everything a pool knows that a person would want on paper or in a spreadsheet:
the standings, every roster with the stats behind them, the draft board, the
trades, the waiver claims and the settings they were all played under. The
serializers in `@/lib/export-document` take it from there.

Two rules shape what goes in. The tables are a reading of the pool for people,
so they carry labels and formatted values and leave out what no column can say
— the json export carries the pool document itself for that. And the stats are
never recomputed here: they arrive as the `calculatePoolStats` pass the screen
already made, described structurally rather than imported, the same way
`@/lib/pool-standings` does it. A second pass over a season of daily scores to
produce numbers that are already on screen would be both slow and a second
chance to disagree with them.
*/
import { seasonWithYearFormat, salaryFormat } from "@/app/utils/formating";
import {
  DraftType,
  DropPeriod,
  GoaliesSettings,
  Player,
  Pool,
  PoolState,
  PoolUser,
  SkaterSettings,
  Trade,
  TradeItems,
  TradeStatus,
} from "@/data/pool/model";
import { flattenDraftBoard, hasDraftBoard } from "@/lib/draft-board";
import {
  ExportCell,
  ExportDocument,
  ExportTable,
  keepSections,
  Translator,
} from "@/lib/export-document";
import { teamLabel } from "@/lib/teams";

/* One scored skater, as `SkaterInfo` of the cumulative tab exposes it. */
export interface ScoredSkater {
  id: number;
  numberOfGame: number;
  goals: number;
  assists: number;
  hattricks: number;
  shootoutGoals: number;
  poolPoints: number;
  status: string;
}

/* One scored goalie, as `GoalieInfo` exposes it. */
export interface ScoredGoalie {
  id: number;
  numberOfGame: number;
  goals: number;
  assists: number;
  wins: number;
  shutouts: number;
  overtimeLosses: number;
  poolPoints: number;
  status: string;
}

export interface ScoredPoolerRoster {
  forwards: ScoredSkater[];
  defense: ScoredSkater[];
  goalies: ScoredGoalie[];
}

interface PositionTotal {
  totalPoolPoints: number;
}

/* One standing row, as `TotalRanking` exposes it. */
export interface RankedPooler {
  participant: string;
  forwards: PositionTotal;
  defense: PositionTotal;
  goalies: PositionTotal;
  numberOfGames: number | null;
  getTotalPoolPoints(): number;
}

export interface PoolExportInput {
  poolInfo: Pool;
  // The two halves of what `calculatePoolStats` returned, keyed by
  // participant id. Null while the pool's daily scores are still being
  // assembled, in which case the standings and roster stats are left out
  // rather than exported as zeros.
  playerStats: Record<string, ScoredPoolerRoster> | null;
  ranking: RankedPooler[] | null;
  // The day the standings are computed up to (yyyy-MM-dd), which is the day
  // the screen is showing and not necessarily today.
  asOf: string;
  t: Translator;
  // Injected so a test can assert on a filename and a footer. Defaults to now.
  generatedAt?: string;
}

/*
Whether the stats pass can be run on this pool, and would say anything if it
were.

Two states it cannot. A pool in the lobby has participants but no rosters yet,
and `calculatePoolStats` reads every participant's roster without checking —
so running it there throws rather than returning nothing. And a pool whose
daily scores have not been assembled yet, which is every pool for the moment
between arriving and its days being fetched, scores everybody at zero: a
printed standing of all zeros reads as a result, which is worse than a report
with no standings in it.

Either way the rest of the export still stands — the draft board, the trades,
the participants and the rules are all there.
*/
export function canScorePool(poolInfo: Pool): boolean {
  const rosters = poolInfo.context?.pooler_roster;
  if (rosters === undefined) {
    return false;
  }
  if (Object.keys(poolInfo.context?.score_by_day ?? {}).length === 0) {
    return false;
  }
  return poolInfo.participants.every((user) => rosters[user.id] !== undefined);
}

/*
Mirrors `PlayerStatus` of the cumulative tab, whose values are what the status
field above carries.

A lookup on the string rather than an import of the enum: it lives in the app
directory next to the screen that computes it, and keeping this structural is
what lets a test hand these builders plain objects.
*/
const PLAYER_STATUS_KEY: Record<string, string> = {
  Active: "inRoster",
  Reservist: "StatusReservist",
  Ignored: "StatusPointsIgnored",
  Traded: "StatusTraded",
};

const statusLabel = (t: Translator, status: string): string =>
  PLAYER_STATUS_KEY[status] ? t(PLAYER_STATUS_KEY[status]) : status;

// A millisecond timestamp as the day it fell on. Local time on purpose: these
// are dates somebody reads against their own memory of the season.
const isoDay = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString("en-CA");

const playerName = (poolInfo: Pool, playerId: number): string =>
  poolInfo.context?.players[playerId]?.name ?? `#${playerId}`;

const participantName = (poolInfo: Pool, participantId: string): string =>
  poolInfo.participants.find((user) => user.id === participantId)?.name ??
  participantId;

/*
A player's contract horizon, as a season rather than as the packed number the
backend stores. Null for a player with no contract, which a pool without a cap
is entirely made of.
*/
const contractLabel = (player: Player | undefined): ExportCell => {
  if (!player || player.contract_expiration_season === null) {
    return null;
  }
  return seasonWithYearFormat(
    Math.floor(player.contract_expiration_season / 10000),
  );
};

/* ------------------------------------------------------------- standings  */

function standingsTable(input: PoolExportInput): ExportTable | null {
  const { t, ranking } = input;
  if (ranking === null || ranking.length === 0) {
    return null;
  }

  // Highest total first. A copy: the array belongs to the screen, which reads
  // it in place.
  const ordered = [...ranking].sort(
    (left, right) => right.getTotalPoolPoints() - left.getTotalPoolPoints(),
  );

  return {
    key: "standings",
    title: t("TotalRanking"),
    note: t("StandingAsOfDate", {
      season: seasonWithYearFormat(input.poolInfo.season),
      date: input.asOf,
    }),
    columns: [
      t("Rank"),
      t("Pooler"),
      t("Games"),
      t("Forwards"),
      t("Defense"),
      t("Goalies"),
      t("Total"),
    ],
    rows: ordered.map((row, index) => [
      index + 1,
      row.participant,
      row.numberOfGames,
      row.forwards.totalPoolPoints,
      row.defense.totalPoolPoints,
      row.goalies.totalPoolPoints,
      row.getTotalPoolPoints(),
    ]),
  };
}

/* --------------------------------------------------------------- rosters  */

/*
Every roster in two tables rather than one per pooler.

One table per pooler reads a little better on paper and is far worse
everywhere else: twenty of them cannot be sorted, filtered or pivoted, which
is the whole reason somebody opens the spreadsheet. Sorted by pooler, the two
tables group visually on paper anyway.

Skaters and goalies are split because they are scored on different things —
one table holding both would be half empty in either direction.
*/
function rosterTables(input: PoolExportInput): ExportTable[] {
  const { poolInfo, playerStats, t } = input;
  if (playerStats === null) {
    return [];
  }

  const players = poolInfo.context?.players ?? {};
  // Standing order when there is one, so the rosters read in the same order as
  // everything else; otherwise the order the pool lists its poolers in.
  const poolers = orderedParticipants(input);

  const skaterRows: ExportCell[][] = [];
  const goalieRows: ExportCell[][] = [];

  for (const pooler of poolers) {
    const roster = playerStats[pooler.id];
    if (roster === undefined) {
      continue;
    }

    const skaters = [
      ...roster.forwards.map((skater) => ({ skater, position: "F" })),
      ...roster.defense.map((skater) => ({ skater, position: "D" })),
    ];

    for (const { skater, position } of skaters) {
      const player = players[skater.id];
      skaterRows.push([
        pooler.name,
        position,
        playerName(poolInfo, skater.id),
        teamLabel(player?.team),
        statusLabel(t, skater.status),
        skater.numberOfGame,
        skater.goals,
        skater.assists,
        skater.hattricks,
        skater.shootoutGoals,
        skater.poolPoints,
        player?.salary_cap ?? null,
        contractLabel(player),
      ]);
    }

    for (const goalie of roster.goalies) {
      const player = players[goalie.id];
      goalieRows.push([
        pooler.name,
        playerName(poolInfo, goalie.id),
        teamLabel(player?.team),
        statusLabel(t, goalie.status),
        goalie.numberOfGame,
        goalie.wins,
        goalie.shutouts,
        goalie.overtimeLosses,
        goalie.goals,
        goalie.assists,
        goalie.poolPoints,
        player?.salary_cap ?? null,
        contractLabel(player),
      ]);
    }
  }

  const tables: ExportTable[] = [];

  if (skaterRows.length > 0) {
    tables.push({
      key: "roster-skaters",
      title: `${t("Forwards")} / ${t("Defense")}`,
      columns: [
        t("Pooler"),
        t("Position"),
        t("Player"),
        t("Team"),
        t("Status"),
        t("Games"),
        t("Goals"),
        t("Assists"),
        t("Hattricks"),
        t("ShootoutGoals"),
        t("PoolPoints"),
        // Raw dollars rather than the "$8.5M" the app shows: a column of
        // numbers is what makes a cap total a sum in a spreadsheet, and the
        // header says which unit it is in.
        t("SalaryInDollars"),
        t("ContractThrough"),
      ],
      rows: skaterRows,
    });
  }

  if (goalieRows.length > 0) {
    tables.push({
      key: "roster-goalies",
      title: t("Goalies"),
      columns: [
        t("Pooler"),
        t("Player"),
        t("Team"),
        t("Status"),
        t("Games"),
        t("Wins"),
        t("Shutouts"),
        t("OvertimeLosses"),
        t("Goals"),
        t("Assists"),
        t("PoolPoints"),
        t("SalaryInDollars"),
        t("ContractThrough"),
      ],
      rows: goalieRows,
    });
  }

  return tables;
}

/* ----------------------------------------------------------------- draft  */

function draftTable(input: PoolExportInput): ExportTable | null {
  const { poolInfo, t } = input;
  if (!hasDraftBoard(poolInfo)) {
    return null;
  }

  const picks = flattenDraftBoard(poolInfo);
  if (picks.length === 0) {
    return null;
  }

  const players = poolInfo.context?.players ?? {};

  return {
    key: "draft-picks",
    title: t("DraftPicks"),
    note: t("DraftPicksMade", { pickCount: poolInfo.nb_player_drafted }),
    columns: [
      t("Pick"),
      t("Round"),
      t("Pooler"),
      t("AcquiredFrom"),
      t("Player"),
      t("Position"),
      t("Team"),
    ],
    // Picks not yet played are kept: a draft in progress is exactly when
    // somebody wants to see what is left, and the empty cells say so.
    rows: picks.map((pick) => {
      const player =
        pick.playerId === null ? undefined : players[pick.playerId];

      return [
        pick.overall,
        pick.round,
        participantName(poolInfo, pick.drafter),
        pick.from === null ? null : participantName(poolInfo, pick.from),
        pick.skipped ? t("RosterComplete") : (player?.name ?? null),
        player?.position ?? null,
        teamLabel(player?.team),
      ];
    }),
  };
}

/* ---------------------------------------------------------------- trades  */

const tradeItemsLabel = (
  poolInfo: Pool,
  t: Translator,
  items: TradeItems,
): string => {
  const parts = [
    ...items.players.map((playerId) => playerName(poolInfo, playerId)),
    // `round` is the index of the round the pick belongs to, as the pool
    // stores it, so it is read out one higher — the same way the trade list
    // on screen reads it.
    ...items.picks.map((pick) =>
      t("ExportPickFrom", {
        round: pick.round + 1,
        pooler: participantName(poolInfo, pick.from),
      }),
    ),
  ];

  return parts.join(", ");
};

const tradeStatusLabel = (t: Translator, status: TradeStatus): string =>
  status === TradeStatus.Confirmed ? t("TradeConfirmedStatus") : t("TradeOpen");

function tradesTable(input: PoolExportInput): ExportTable | null {
  const { poolInfo, t } = input;
  const trades: Trade[] = poolInfo.trades ?? [];
  if (trades.length === 0) {
    return null;
  }

  return {
    key: "trades",
    title: t("Trades"),
    columns: [
      t("Date"),
      t("Status"),
      t("TradeEffectiveDate"),
      t("ExportTradeFrom"),
      t("ExportTradeTo"),
      t("ExportTradeGave"),
      t("ExportTradeReceived"),
    ],
    // Oldest first: this is a log, and a log reads forwards.
    rows: [...trades]
      .sort((left, right) => left.date_created - right.date_created)
      .map((trade) => [
        isoDay(trade.date_created),
        tradeStatusLabel(t, trade.status),
        trade.effective_date,
        participantName(poolInfo, trade.proposed_by),
        participantName(poolInfo, trade.ask_to),
        tradeItemsLabel(poolInfo, t, trade.from_items),
        tradeItemsLabel(poolInfo, t, trade.to_items),
      ]),
  };
}

/* --------------------------------------------------------------- waivers  */

function waiversTable(input: PoolExportInput): ExportTable | null {
  const { poolInfo, t } = input;
  const claims = poolInfo.context?.roster_transactions ?? [];
  if (claims.length === 0) {
    return null;
  }

  return {
    key: "waivers",
    title: t("WaiverClaims"),
    columns: [
      t("MoveEffectiveDate"),
      t("Pooler"),
      t("PlacedOnWaivers"),
      t("ExportWaiverPickedUp"),
      t("ExportFiledOn"),
    ],
    rows: [...claims]
      .sort((left, right) =>
        left.effective_date.localeCompare(right.effective_date),
      )
      .map((claim) => [
        claim.effective_date,
        participantName(poolInfo, claim.participant),
        playerName(poolInfo, claim.dropped_player_id),
        playerName(poolInfo, claim.added_player_id),
        isoDay(claim.date_created),
      ]),
  };
}

/* ---------------------------------------------------------- participants  */

function participantsTable(input: PoolExportInput): ExportTable {
  const { poolInfo, t } = input;
  const draftOrder = poolInfo.draft_order ?? [];

  return {
    key: "participants",
    title: t("Participants"),
    columns: [t("Pooler"), t("ParticipantHasAccount"), t("DraftOrderSelector")],
    rows: poolInfo.participants.map((user) => {
      const rank = draftOrder.indexOf(user.id);
      return [user.name, user.is_owned, rank < 0 ? null : rank + 1];
    }),
  };
}

/* -------------------------------------------------------------- settings  */

/*
The rules the pool was played under, as label/value pairs.

Everything a pooler might argue about at the end of a season: how many players
of each position, what a goal was worth, how many of the worst players were
dropped, whether there was a cap. A setting a pool does not use is left out
rather than written as "none" — a list of twelve rules with four that apply is
harder to read than a list of four.
*/
/*
What a pool pays for, as pairs of label and field.

A list rather than twenty-six written-out rows: the two skater positions are
scored on exactly the same things, so stating them twice was both longer and
a place for the two to drift. Adding a way to score is one line here.
*/
const SKATER_SCORING = [
  ["Goals", "points_per_goals"],
  ["Assists", "points_per_assists"],
  ["Hattricks", "points_per_hattricks"],
  ["ShootoutGoals", "points_per_shootout_goals"],
] as const satisfies readonly (readonly [string, keyof SkaterSettings])[];

const GOALIE_SCORING = [
  ["Wins", "points_per_wins"],
  ["Shutouts", "points_per_shutouts"],
  ["OvertimeLosses", "points_per_overtimes"],
  ["Goals", "points_per_goals"],
  ["Assists", "points_per_assists"],
] as const satisfies readonly (readonly [string, keyof GoaliesSettings])[];

function settingsTable(input: PoolExportInput): ExportTable {
  const { poolInfo, t } = input;
  const settings = poolInfo.settings;
  const rows: ExportCell[][] = [
    [t("NumberPooler"), settings.number_poolers],
    [
      t("DraftType"),
      settings.draft_type === DraftType.SERPENTINE
        ? t("Serpentine")
        : t("Standard"),
    ],
    [t("Forwards"), settings.number_forwards],
    [t("Defense"), settings.number_defenders],
    [t("Goalies"), settings.number_goalies],
    [t("Reservists"), settings.number_reservists],
  ];

  if (settings.salary_cap !== null) {
    // The one salary shown the way the app shows it: a single value in a
    // label/value table is read, not summed.
    rows.push([t("SalaryCap"), salaryFormat(settings.salary_cap)]);
  }

  const ignored = settings.ignore_x_worst_players;
  if (ignored !== null) {
    rows.push([
      t("IgnoreWorstPlayers"),
      `${t("Forwards")} ${ignored.forwards}, ${t("Defense")} ${
        ignored.defense
      }, ${t("Goalies")} ${ignored.goalies}`,
    ]);
  }

  const drops = settings.player_drop_settings ?? null;
  if (drops !== null) {
    rows.push([
      t("MaxPlayerDrops"),
      `${drops.max_drops} — ${
        drops.period === DropPeriod.MONTH ? t("PerMonth") : t("PerSeason")
      }`,
    ]);
  }

  if (settings.roster_modification_date.length > 0) {
    rows.push([
      t("RosterModificationDates"),
      settings.roster_modification_date.join(", "),
    ]);
  }

  const dynasty = settings.dynasty_settings;
  if (dynasty !== null) {
    rows.push(
      [
        t("NumberOfProtectedPlayers"),
        dynasty.next_season_number_players_protected,
      ],
      [t("TradableDraftPicks"), dynasty.tradable_picks],
    );
  }

  if (settings.assistants.length > 0) {
    rows.push([
      t("Assistants"),
      settings.assistants.map((id) => participantName(poolInfo, id)).join(", "),
    ]);
  }

  // Scoring last: it is the longest block and the one nobody looks up first.
  for (const [group, scale] of [
    ["Forwards", settings.forwards_settings],
    ["Defense", settings.defense_settings],
  ] as const) {
    for (const [label, field] of SKATER_SCORING) {
      rows.push([`${t(group)} — ${t(label)}`, scale[field]]);
    }
  }
  for (const [label, field] of GOALIE_SCORING) {
    rows.push([
      `${t("Goalies")} — ${t(label)}`,
      settings.goalies_settings[field],
    ]);
  }

  return {
    key: "settings",
    title: t("Settings"),
    columns: [t("ExportSetting"), t("ExportValue")],
    rows,
  };
}

/* -------------------------------------------------------------- assembly  */

const POOL_STATE_KEY: Record<PoolState, string> = {
  [PoolState.Created]: "PoolCreatedState",
  [PoolState.Draft]: "PoolDraftState",
  [PoolState.InProgress]: "PoolInProgressState",
  [PoolState.Final]: "PoolFinalState",
  [PoolState.Dynasty]: "PoolDynastyState",
};

/*
The poolers, in standing order where there is a standing.

The standings carry names rather than ids — that is the shape
`calculatePoolStats` produces — so the order is applied by name, and anybody
the ranking does not mention keeps their place at the end rather than being
dropped.
*/
function orderedParticipants(input: PoolExportInput): PoolUser[] {
  const { poolInfo, ranking } = input;
  if (ranking === null) {
    return poolInfo.participants;
  }

  const rankByName = new Map(
    [...ranking]
      .sort(
        (left, right) => right.getTotalPoolPoints() - left.getTotalPoolPoints(),
      )
      .map((row, index) => [row.participant, index]),
  );

  return [...poolInfo.participants].sort(
    (left, right) =>
      (rankByName.get(left.name) ?? Number.MAX_SAFE_INTEGER) -
      (rankByName.get(right.name) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function buildPoolExport(input: PoolExportInput): ExportDocument {
  const { poolInfo, t } = input;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const sections = keepSections([
    {
      key: "section-standings",
      title: t("TotalRanking"),
      tables: [standingsTable(input)],
    },
    {
      key: "section-rosters",
      title: t("Rosters"),
      tables: rosterTables(input),
    },
    { key: "section-draft", title: t("Draft"), tables: [draftTable(input)] },
    { key: "section-trades", title: t("Trades"), tables: [tradesTable(input)] },
    {
      key: "section-waivers",
      title: t("WaiverClaims"),
      tables: [waiversTable(input)],
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

  return {
    title: t("ExportPoolTitle", { pool: poolInfo.name }),
    subtitle: t("ExportGeneratedOn", { date: generatedAt.slice(0, 10) }),
    meta: [
      { label: t("Season"), value: seasonWithYearFormat(poolInfo.season) },
      { label: t("Owner"), value: participantName(poolInfo, poolInfo.owner) },
      { label: t("Status"), value: t(POOL_STATE_KEY[poolInfo.status]) },
      { label: t("Participants"), value: poolInfo.participants.length },
      { label: t("StandingAsOf"), value: input.asOf },
    ],
    sections,
    generatedAt,
  };
}
