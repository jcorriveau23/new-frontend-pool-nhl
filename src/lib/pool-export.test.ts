import { describe, expect, it } from "vitest";

import {
  DraftType,
  DropPeriod,
  Pool,
  PoolState,
  TradeStatus,
} from "@/data/pool/model";
import { ExportDocument, ExportTable } from "@/lib/export-document";
import {
  buildPoolExport,
  canScorePool,
  PoolExportInput,
  RankedPooler,
  ScoredPoolerRoster,
} from "./pool-export";

// The translator the app's own tests use: a key comes back as itself, with its
// interpolations appended, so an assertion can read either.
const t = (key: string, values?: Record<string, number | string>) =>
  values === undefined || Object.keys(values).length === 0
    ? key
    : `${key}:${JSON.stringify(values)}`;

const PLAYERS = {
  "10": {
    id: 10,
    name: "Suzuki",
    team: 8,
    position: "F",
    salary_cap: 7875000,
    contract_expiration_season: 20292030,
  },
  "11": {
    id: 11,
    name: "Hutson",
    team: 8,
    position: "D",
    salary_cap: 950000,
    contract_expiration_season: null,
  },
  "12": {
    id: 12,
    name: "Montembeault",
    team: null,
    position: "G",
    salary_cap: null,
    contract_expiration_season: 20262027,
  },
};

const pool = (overrides: Partial<Pool> = {}): Pool =>
  ({
    name: "Les Enragés",
    owner: "alice",
    season: 2026,
    status: PoolState.InProgress,
    nb_player_drafted: 2,
    draft_order: ["alice", "bob"],
    trades: null,
    participants: [
      { id: "alice", name: "Alice", is_owned: true },
      { id: "bob", name: "Bob", is_owned: false },
    ],
    settings: {
      number_poolers: 2,
      draft_type: DraftType.SERPENTINE,
      assistants: [],
      number_forwards: 1,
      number_defenders: 1,
      number_goalies: 1,
      number_reservists: 0,
      salary_cap: null,
      roster_modification_date: [],
      forwards_settings: {
        points_per_goals: 2,
        points_per_assists: 1,
        points_per_hattricks: 3,
        points_per_shootout_goals: 1,
      },
      defense_settings: {
        points_per_goals: 3,
        points_per_assists: 2,
        points_per_hattricks: 2,
        points_per_shootout_goals: 1,
      },
      goalies_settings: {
        points_per_wins: 2,
        points_per_shutouts: 3,
        points_per_overtimes: 1,
        points_per_goals: 3,
        points_per_assists: 2,
      },
      ignore_x_worst_players: null,
      dynasty_settings: null,
    },
    context: {
      players: PLAYERS,
      players_name_drafted: [10, 11],
      pooler_roster: {},
      score_by_day: null,
      tradable_picks: null,
      past_tradable_picks: null,
      protected_players: null,
      roster_transactions: null,
      lineup_events: null,
    },
    ...overrides,
  }) as unknown as Pool;

const ranked = (participant: string, points: number): RankedPooler => ({
  participant,
  forwards: { totalPoolPoints: points - 2 },
  defense: { totalPoolPoints: 1 },
  goalies: { totalPoolPoints: 1 },
  numberOfGames: 3,
  getTotalPoolPoints: () => points,
});

const roster = (): ScoredPoolerRoster => ({
  forwards: [
    {
      id: 10,
      numberOfGame: 4,
      goals: 2,
      assists: 3,
      hattricks: 0,
      shootoutGoals: 1,
      poolPoints: 8,
      status: "Active",
    },
  ],
  defense: [
    {
      id: 11,
      numberOfGame: 4,
      goals: 0,
      assists: 2,
      hattricks: 0,
      shootoutGoals: 0,
      poolPoints: 4,
      status: "Reservist",
    },
  ],
  goalies: [
    {
      id: 12,
      numberOfGame: 3,
      goals: 0,
      assists: 1,
      wins: 2,
      shutouts: 1,
      overtimeLosses: 0,
      poolPoints: 9,
      status: "Traded",
    },
  ],
});

const input = (overrides: Partial<PoolExportInput> = {}): PoolExportInput => ({
  poolInfo: pool(),
  playerStats: { alice: roster(), bob: roster() },
  ranking: [ranked("Bob", 30), ranked("Alice", 50)],
  asOf: "2027-01-12",
  t,
  generatedAt: "2026-10-14T13:05:00.000Z",
  ...overrides,
});

const tableOf = (doc: ExportDocument, key: string): ExportTable | undefined =>
  doc.sections
    .flatMap((section) => section.tables)
    .find((table) => table.key === key);

const rowsOf = (doc: ExportDocument, key: string) =>
  tableOf(doc, key)?.rows ?? [];

/*
The guard the pool screen runs before it even calls the stats pass. It is here
because the reason is about the export: the pass itself throws on a pool with no
rosters, and scores one with no days at zero.
*/
describe("canScorePool", () => {
  const scorable = (overrides: {
    rosters?: Record<string, unknown>;
    days?: Record<string, unknown>;
  }) => {
    const poolInfo = pool();
    poolInfo.context!.pooler_roster = (overrides.rosters ?? {
      alice: {},
      bob: {},
    }) as never;
    poolInfo.context!.score_by_day = (overrides.days ?? {
      "2026-10-08": {},
    }) as never;
    return poolInfo;
  };

  it("is true for a pool with a roster for everybody and a day on the board", () => {
    expect(canScorePool(scorable({}))).toBe(true);
  });

  it("is false for a pool in the lobby, which has no rosters yet", () => {
    const lobby = pool();
    lobby.context!.pooler_roster = undefined as never;

    expect(canScorePool(lobby)).toBe(false);
  });

  it("is false while a participant has no roster, which the pass would throw on", () => {
    expect(canScorePool(scorable({ rosters: { alice: {} } }))).toBe(false);
  });

  it("is false before the daily scores have been assembled", () => {
    expect(canScorePool(scorable({ days: {} }))).toBe(false);

    const noDays = scorable({});
    noDays.context!.score_by_day = null;
    expect(canScorePool(noDays)).toBe(false);
  });

  it("is false for a pool with no context at all", () => {
    const bare = pool();
    bare.context = null;

    expect(canScorePool(bare)).toBe(false);
  });
});

describe("buildPoolExport", () => {
  it("names the document after the pool and stamps when it was taken", () => {
    const doc = buildPoolExport(input());

    expect(doc.title).toBe('ExportPoolTitle:{"pool":"Les Enragés"}');
    expect(doc.generatedAt).toBe("2026-10-14T13:05:00.000Z");
  });

  it("puts the season, the owner's name and the day shown in the header", () => {
    const meta = buildPoolExport(input()).meta;

    expect(meta).toEqual([
      { label: "Season", value: "2026-27" },
      { label: "Owner", value: "Alice" },
      { label: "Status", value: "PoolInProgressState" },
      { label: "Participants", value: 2 },
      { label: "StandingAsOf", value: "2027-01-12" },
    ]);
  });

  describe("standings", () => {
    it("ranks the poolers by total, highest first", () => {
      expect(rowsOf(buildPoolExport(input()), "standings")).toEqual([
        [1, "Alice", 3, 48, 1, 1, 50],
        [2, "Bob", 3, 28, 1, 1, 30],
      ]);
    });

    it("leaves the input ranking untouched", () => {
      const ranking = [ranked("Bob", 30), ranked("Alice", 50)];
      buildPoolExport(input({ ranking }));

      expect(ranking.map((row) => row.participant)).toEqual(["Bob", "Alice"]);
    });

    /*
    The daily scores are assembled by the client after the pool arrives, so a
    pool exported before that pass has no standings. Zeros would be worse than
    no table: a printed standing of all zeros reads as a result.
    */
    it("has no standings section at all when the stats are not in yet", () => {
      const doc = buildPoolExport(input({ ranking: null, playerStats: null }));

      expect(tableOf(doc, "standings")).toBeUndefined();
      expect(tableOf(doc, "roster-skaters")).toBeUndefined();
    });
  });

  describe("rosters", () => {
    it("splits skaters from goalies, since they are scored on different things", () => {
      const doc = buildPoolExport(input());

      expect(tableOf(doc, "roster-skaters")?.columns).toContain("Hattricks");
      expect(tableOf(doc, "roster-goalies")?.columns).toContain("Shutouts");
      expect(tableOf(doc, "roster-goalies")?.columns).not.toContain(
        "Hattricks",
      );
    });

    it("carries the pooler on every row, so the sheet can be pivoted by it", () => {
      const doc = buildPoolExport(input());

      // Alice first: she leads the standings.
      expect(rowsOf(doc, "roster-skaters").map((row) => row[0])).toEqual([
        "Alice",
        "Alice",
        "Bob",
        "Bob",
      ]);
    });

    it("writes a skater's line with its team code, status and stats", () => {
      const [first] = rowsOf(buildPoolExport(input()), "roster-skaters");

      expect(first).toEqual([
        "Alice",
        "F",
        "Suzuki",
        "MTL",
        "inRoster",
        4,
        2,
        3,
        0,
        1,
        8,
        7875000,
        "2029-30",
      ]);
    });

    it("translates the status the stats pass computed", () => {
      const statuses = rowsOf(buildPoolExport(input()), "roster-skaters").map(
        (row) => row[4],
      );

      expect(statuses).toContain("StatusReservist");
      expect(rowsOf(buildPoolExport(input()), "roster-goalies")[0][3]).toBe(
        "StatusTraded",
      );
    });

    it("leaves a status it does not know as it came, rather than blanking it", () => {
      const unknown = roster();
      unknown.forwards[0].status = "Something new";
      const doc = buildPoolExport(input({ playerStats: { alice: unknown } }));

      expect(rowsOf(doc, "roster-skaters")[0][4]).toBe("Something new");
    });

    /*
    Raw dollars rather than "$7.9M": this column is what makes a cap total a
    sum in a spreadsheet, and the header says which unit it is in.
    */
    it("writes salary as a number, and nothing for a player without one", () => {
      expect(rowsOf(buildPoolExport(input()), "roster-skaters")[0][11]).toBe(
        7875000,
      );
      expect(
        rowsOf(buildPoolExport(input()), "roster-goalies")[0][11],
      ).toBeNull();
    });

    it("has nothing to say for a player with no team and no contract", () => {
      const [goalie] = rowsOf(buildPoolExport(input()), "roster-goalies");

      expect(goalie[2]).toBeNull();
      expect(
        rowsOf(buildPoolExport(input()), "roster-skaters")[1][12],
      ).toBeNull();
    });

    it("skips a pooler the stats pass has no roster for", () => {
      const doc = buildPoolExport(input({ playerStats: { alice: roster() } }));

      expect(rowsOf(doc, "roster-skaters").map((row) => row[0])).toEqual([
        "Alice",
        "Alice",
      ]);
    });

    it("names a player the pool no longer holds by its id", () => {
      const orphan = roster();
      orphan.forwards[0].id = 999;
      const doc = buildPoolExport(input({ playerStats: { alice: orphan } }));

      expect(rowsOf(doc, "roster-skaters")[0][2]).toBe("#999");
    });
  });

  describe("draft", () => {
    it("lists every slot of the draft, played or not", () => {
      expect(rowsOf(buildPoolExport(input()), "draft-picks")).toEqual([
        [1, 1, "Alice", null, "Suzuki", "F", "MTL"],
        [2, 1, "Bob", null, "Hutson", "D", "MTL"],
        [3, 2, "Bob", null, null, null, null],
        [4, 2, "Alice", null, null, null, null],
        [5, 3, "Alice", null, null, null, null],
        [6, 3, "Bob", null, null, null, null],
      ]);
    });

    it("has no draft section for a pool still in the lobby", () => {
      const doc = buildPoolExport(
        input({ poolInfo: pool({ status: PoolState.Created }) }),
      );

      expect(tableOf(doc, "draft-picks")).toBeUndefined();
    });
  });

  describe("trades", () => {
    const trade = {
      id: 1,
      proposed_by: "alice",
      ask_to: "bob",
      from_items: { players: [10], picks: [{ round: 1, from: "bob" }] },
      to_items: { players: [11, 12], picks: [] },
      date_created: new Date(2027, 0, 8, 15, 0).getTime(),
      status: TradeStatus.Confirmed,
      effective_date: "2027-01-09",
      draft_pick_index: null,
    };

    it("names both sides and spells out what each one handed over", () => {
      const doc = buildPoolExport(
        input({ poolInfo: pool({ trades: [trade] as never }) }),
      );

      expect(rowsOf(doc, "trades")[0].slice(1)).toEqual([
        "TradeConfirmedStatus",
        "2027-01-09",
        "Alice",
        "Bob",
        'Suzuki, ExportPickFrom:{"round":2,"pooler":"Bob"}',
        "Hutson, Montembeault",
      ]);
    });

    it("reads a trade log oldest first", () => {
      const older = {
        ...trade,
        id: 2,
        date_created: new Date(2026, 11, 1, 9, 0).getTime(),
      };
      const doc = buildPoolExport(
        input({ poolInfo: pool({ trades: [trade, older] as never }) }),
      );

      expect(rowsOf(doc, "trades").map((row) => row[0])).toEqual([
        "2026-12-01",
        "2027-01-08",
      ]);
    });

    it("marks a trade nobody has signed off on as open", () => {
      const doc = buildPoolExport(
        input({
          poolInfo: pool({
            trades: [{ ...trade, status: TradeStatus.Open }] as never,
          }),
        }),
      );

      expect(rowsOf(doc, "trades")[0][1]).toBe("TradeOpen");
    });

    it("has no trades section for a pool that has had none", () => {
      expect(tableOf(buildPoolExport(input()), "trades")).toBeUndefined();
    });
  });

  describe("waiver claims", () => {
    it("lists each swap as the pair of players it moved", () => {
      const poolInfo = pool();
      poolInfo.context!.roster_transactions = [
        {
          participant: "bob",
          effective_date: "2027-02-02",
          dropped_player_id: 11,
          added_player_id: 12,
          date_created: new Date(2027, 1, 2, 12, 0).getTime(),
        },
        {
          participant: "alice",
          effective_date: "2027-01-05",
          dropped_player_id: 10,
          added_player_id: 11,
          date_created: new Date(2027, 0, 5, 12, 0).getTime(),
        },
      ];

      expect(rowsOf(buildPoolExport(input({ poolInfo })), "waivers")).toEqual([
        ["2027-01-05", "Alice", "Suzuki", "Hutson", "2027-01-05"],
        ["2027-02-02", "Bob", "Hutson", "Montembeault", "2027-02-02"],
      ]);
    });

    it("has no waivers section for a pool that has had none", () => {
      expect(tableOf(buildPoolExport(input()), "waivers")).toBeUndefined();
    });
  });

  describe("participants", () => {
    it("says who has an account and where they picked from", () => {
      expect(rowsOf(buildPoolExport(input()), "participants")).toEqual([
        ["Alice", true, 1],
        ["Bob", false, 2],
      ]);
    });

    it("has no draft position for somebody not in the order", () => {
      const doc = buildPoolExport(
        input({ poolInfo: pool({ draft_order: ["alice"] }) }),
      );

      expect(rowsOf(doc, "participants")[1][2]).toBeNull();
    });
  });

  describe("settings", () => {
    const valueOf = (doc: ExportDocument, label: string) =>
      rowsOf(doc, "settings").find((row) => row[0] === label)?.[1];

    it("writes the roster shape and the scoring it was played under", () => {
      const doc = buildPoolExport(input());

      expect(valueOf(doc, "NumberPooler")).toBe(2);
      expect(valueOf(doc, "DraftType")).toBe("Serpentine");
      expect(valueOf(doc, "Forwards — Goals")).toBe(2);
      expect(valueOf(doc, "Goalies — Shutouts")).toBe(3);
    });

    it("names a standard draft as such", () => {
      const poolInfo = pool();
      poolInfo.settings.draft_type = DraftType.STANDARD;

      expect(valueOf(buildPoolExport(input({ poolInfo })), "DraftType")).toBe(
        "Standard",
      );
    });

    /*
    A rule the pool does not use is left out rather than written as "none": a
    list of twelve settings with four that apply is harder to read than a list
    of four.
    */
    it("leaves out the rules the pool does not use", () => {
      const doc = buildPoolExport(input());

      expect(valueOf(doc, "SalaryCap")).toBeUndefined();
      expect(valueOf(doc, "IgnoreWorstPlayers")).toBeUndefined();
      expect(valueOf(doc, "MaxPlayerDrops")).toBeUndefined();
      expect(valueOf(doc, "NumberOfProtectedPlayers")).toBeUndefined();
      expect(valueOf(doc, "Assistants")).toBeUndefined();
      expect(valueOf(doc, "RosterModificationDates")).toBeUndefined();
    });

    it("writes the ones it does", () => {
      const poolInfo = pool();
      poolInfo.settings.salary_cap = 82500000;
      poolInfo.settings.ignore_x_worst_players = {
        forwards: 2,
        defense: 1,
        goalies: 0,
      };
      poolInfo.settings.player_drop_settings = {
        max_drops: 3,
        period: DropPeriod.MONTH,
      };
      poolInfo.settings.roster_modification_date = ["2026-12-25", "2027-01-15"];
      poolInfo.settings.dynasty_settings = {
        next_season_number_players_protected: 9,
        tradable_picks: 3,
        past_season_pool_name: [],
        next_season_pool_name: null,
      };
      poolInfo.settings.assistants = ["bob"];
      const doc = buildPoolExport(input({ poolInfo }));

      expect(valueOf(doc, "SalaryCap")).toBe("$82.5M");
      expect(valueOf(doc, "IgnoreWorstPlayers")).toBe(
        "Forwards 2, Defense 1, Goalies 0",
      );
      expect(valueOf(doc, "MaxPlayerDrops")).toBe("3 — PerMonth");
      expect(valueOf(doc, "RosterModificationDates")).toBe(
        "2026-12-25, 2027-01-15",
      );
      expect(valueOf(doc, "NumberOfProtectedPlayers")).toBe(9);
      expect(valueOf(doc, "TradableDraftPicks")).toBe(3);
      // The assistant is named, not shown as the id the settings hold.
      expect(valueOf(doc, "Assistants")).toBe("Bob");
    });

    it("says which period a season-long waiver budget refills on", () => {
      const poolInfo = pool();
      poolInfo.settings.player_drop_settings = {
        max_drops: 2,
        period: DropPeriod.SEASON,
      };

      expect(
        valueOf(buildPoolExport(input({ poolInfo })), "MaxPlayerDrops"),
      ).toBe("2 — PerSeason");
    });
  });

  it("builds every pool state without a section that has no tables", () => {
    for (const status of Object.values(PoolState)) {
      const doc = buildPoolExport(input({ poolInfo: pool({ status }) }));

      expect(doc.sections.every((section) => section.tables.length > 0)).toBe(
        true,
      );
    }
  });

  it("stamps now when it is not told otherwise", () => {
    const doc = buildPoolExport(input({ generatedAt: undefined }));

    expect(Date.parse(doc.generatedAt)).toBeGreaterThan(0);
  });
});
