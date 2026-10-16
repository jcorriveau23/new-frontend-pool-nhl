import { describe, expect, it } from "vitest";

import {
  ParticipantStatus,
  PickOutcome,
  SurvivorPool,
  SurvivorStandings,
  SurvivorState,
  WeekStatus,
} from "@/data/survivor/model";
import { ExportDocument, ExportTable } from "@/lib/export-document";
import { buildSurvivorExport, SurvivorExportInput } from "./survivor-export";

const t = (key: string, values?: Record<string, number | string>) =>
  values === undefined || Object.keys(values).length === 0
    ? key
    : `${key}:${JSON.stringify(values)}`;

const pool = (overrides: Partial<SurvivorPool> = {}): SurvivorPool =>
  ({
    name: "Le Survivant",
    owner: "alice",
    season: 2026,
    status: SurvivorState.InProgress,
    season_start: "2026-10-07",
    season_end: "2027-04-15",
    date_updated: 0,
    winners: null,
    settings: {
      assistants: [],
      max_participants: 100,
      strikes_allowed: 1,
      missed_pick_is_strike: true,
      allow_pick_change: true,
      public_picks: false,
      league_team_count: 32,
    },
    participants: [
      {
        id: "alice",
        name: "Alice",
        status: ParticipantStatus.Alive,
        strikes: 0,
        eliminated_week: null,
        date_joined: 0,
        is_owned: true,
      },
      {
        id: "bob",
        name: "Bob",
        status: ParticipantStatus.Eliminated,
        strikes: 2,
        eliminated_week: 2,
        date_joined: 0,
        is_owned: false,
      },
      {
        id: "cat",
        name: "Cat",
        status: ParticipantStatus.Eliminated,
        strikes: 2,
        eliminated_week: 1,
        date_joined: 0,
        is_owned: true,
      },
    ],
    weeks: [
      {
        week: 1,
        pick_date: "2026-10-10",
        status: WeekStatus.Settled,
        eligible_team_ids: [8, 10, 6],
        settled_at: 1,
      },
      {
        week: 2,
        pick_date: "2026-10-17",
        status: WeekStatus.Settled,
        eligible_team_ids: [8, 10],
        settled_at: 2,
      },
      {
        week: 3,
        pick_date: "2026-10-24",
        status: WeekStatus.Open,
        eligible_team_ids: [],
        settled_at: null,
      },
    ],
    ...overrides,
  }) as SurvivorPool;

const standings = (
  overrides: Partial<SurvivorStandings> = {},
): SurvivorStandings => ({
  pool_name: "Le Survivant",
  status: SurvivorState.InProgress,
  alive_count: 1,
  eliminated_count: 2,
  // Week 3 is still open, so it is not in here — which is the rule the export
  // inherits rather than one it applies.
  revealed_weeks: [1, 2],
  winners: null,
  rows: [
    {
      participant_id: "cat",
      name: "Cat",
      status: ParticipantStatus.Eliminated,
      strikes: 2,
      eliminated_week: 1,
      wins: 0,
      picks: { "1": { team_id: 6, outcome: PickOutcome.Lost } },
    },
    {
      participant_id: "alice",
      name: "Alice",
      status: ParticipantStatus.Alive,
      strikes: 0,
      eliminated_week: null,
      wins: 2,
      picks: {
        "1": { team_id: 8, outcome: PickOutcome.Won },
        "2": { team_id: 10, outcome: PickOutcome.Won },
      },
    },
    {
      participant_id: "bob",
      name: "Bob",
      status: ParticipantStatus.Eliminated,
      strikes: 2,
      eliminated_week: 2,
      wins: 1,
      picks: {
        "1": { team_id: 10, outcome: PickOutcome.Won },
        "2": { team_id: 8, outcome: PickOutcome.Lost },
      },
    },
  ],
  ...overrides,
});

const input = (
  overrides: Partial<SurvivorExportInput> = {},
): SurvivorExportInput => ({
  pool: pool(),
  standings: standings(),
  t,
  generatedAt: "2026-10-20T12:00:00.000Z",
  ...overrides,
});

const tableOf = (doc: ExportDocument, key: string): ExportTable | undefined =>
  doc.sections
    .flatMap((section) => section.tables)
    .find((table) => table.key === key);

const rowsOf = (doc: ExportDocument, key: string) =>
  tableOf(doc, key)?.rows ?? [];

describe("buildSurvivorExport", () => {
  it("names the document after the pool", () => {
    expect(buildSurvivorExport(input()).title).toBe(
      'ExportSurvivorTitle:{"pool":"Le Survivant"}',
    );
  });

  describe("the header block", () => {
    it("places the pool and resolves the owner's name", () => {
      const meta = buildSurvivorExport(input()).meta;

      expect(meta.slice(0, 4)).toEqual([
        { label: "Season", value: 2026 },
        { label: "Owner", value: "Alice" },
        { label: "Status", value: "PoolInProgressState" },
        {
          label: "Participants",
          value: 'SurvivorParticipantCount:{"count":3,"max":100}',
        },
      ]);
    });

    it("names the winners, and only on a pool that has some", () => {
      const labels = (document: ExportDocument) =>
        document.meta.map((entry) => entry.label);

      expect(labels(buildSurvivorExport(input()))).not.toContain(
        "ExportWinners",
      );

      const over = buildSurvivorExport(
        input({
          pool: pool({
            status: SurvivorState.Final,
            winners: ["alice", "bob"],
          }),
        }),
      );
      expect(over.meta.at(-1)).toEqual({
        label: "ExportWinners",
        value: "Alice, Bob",
      });
    });

    it("says how many are still in once the standings are there", () => {
      const withoutStandings = buildSurvivorExport(input({ standings: null }));

      expect(withoutStandings.meta.map((entry) => entry.label)).not.toContain(
        "SurvivorStandingsTab",
      );
    });
  });

  describe("standings", () => {
    /*
    Who is left, then how far the rest got. It is the order the pool is read
    in, and it is not the order the payload arrives in.
    */
    it("puts everybody still in first, then the rest by how long they lasted", () => {
      expect(rowsOf(buildSurvivorExport(input()), "standings")).toEqual([
        [1, "Alice", "ExportStatusAlive", 2, 0, null],
        [2, "Bob", "ExportStatusEliminated", 1, 2, 2],
        [3, "Cat", "ExportStatusEliminated", 0, 2, 1],
      ]);
    });

    it("separates two people who went out in the same week by name", () => {
      const tied = standings();
      tied.rows[0].eliminated_week = 2;
      tied.rows[0].wins = 1;
      const names = rowsOf(
        buildSurvivorExport(input({ standings: tied })),
        "standings",
      ).map((row) => row[1]);

      expect(names).toEqual(["Alice", "Bob", "Cat"]);
    });

    it("sorts an eliminated row with no week on record last", () => {
      // Cat and Bob are both out with one win, so the week they went out is
      // what separates them — and Cat's was never recorded.
      const missing = standings();
      missing.rows[0].wins = 1;
      missing.rows[0].eliminated_week = null;
      const names = rowsOf(
        buildSurvivorExport(input({ standings: missing })),
        "standings",
      ).map((row) => row[1]);

      expect(names).toEqual(["Alice", "Bob", "Cat"]);
    });

    it("has no standings section before the standings have been fetched", () => {
      const doc = buildSurvivorExport(input({ standings: null }));

      expect(tableOf(doc, "standings")).toBeUndefined();
      expect(tableOf(doc, "picks")).toBeUndefined();
      // The pool's own schedule and settings are still worth exporting.
      expect(tableOf(doc, "weeks")).toBeDefined();
      expect(tableOf(doc, "settings")).toBeDefined();
    });

    it("has no standings section when nobody has joined", () => {
      const doc = buildSurvivorExport(
        input({ standings: standings({ rows: [] }) }),
      );

      expect(tableOf(doc, "standings")).toBeUndefined();
    });
  });

  describe("picks", () => {
    /*
    One row per pick rather than the grid the screen shows: a pool of two
    hundred people against twenty-six Saturdays is not a table anybody prints,
    and a row per pick sorts and filters by either axis.
    */
    it("writes a row per pick, by date then by standing", () => {
      expect(rowsOf(buildSurvivorExport(input()), "picks")).toEqual([
        [1, "2026-10-10", "Alice", "MTL", "SurvivorOutcomeWon"],
        [1, "2026-10-10", "Bob", "TOR", "SurvivorOutcomeWon"],
        [1, "2026-10-10", "Cat", "BOS", "SurvivorOutcomeLost"],
        [2, "2026-10-17", "Alice", "TOR", "SurvivorOutcomeWon"],
        [2, "2026-10-17", "Bob", "MTL", "SurvivorOutcomeLost"],
      ]);
    });

    /*
    The reason this cannot leak an open date: the picks come from the
    standings payload, which leaves one out rather than sending it. Week 3 is
    open above, and nothing the export does could put it in.
    */
    it("holds nothing for a date the payload did not reveal", () => {
      const weeks = rowsOf(buildSurvivorExport(input()), "picks").map(
        (row) => row[0],
      );

      expect(weeks).not.toContain(3);
    });

    it("says so, because an absent date is a rule and not missing data", () => {
      expect(tableOf(buildSurvivorExport(input()), "picks")?.note).toBe(
        "ExportRevealedPicksOnly",
      );
    });

    it("has no picks section before any date has been revealed", () => {
      const doc = buildSurvivorExport(
        input({ standings: standings({ revealed_weeks: [] }) }),
      );

      expect(tableOf(doc, "picks")).toBeUndefined();
    });

    it("reads the dates in order even when the payload lists them out of it", () => {
      const doc = buildSurvivorExport(
        input({ standings: standings({ revealed_weeks: [2, 1] }) }),
      );

      expect(rowsOf(doc, "picks").map((row) => row[0])).toEqual([
        1, 1, 1, 2, 2,
      ]);
    });

    it("has no date for a revealed week the pool's schedule does not carry", () => {
      const doc = buildSurvivorExport(
        input({ pool: pool({ weeks: [] }), standings: standings() }),
      );

      expect(rowsOf(doc, "picks")[0][1]).toBeNull();
    });
  });

  describe("schedule", () => {
    it("lists every date with its state and how many teams were playing", () => {
      expect(rowsOf(buildSurvivorExport(input()), "weeks")).toEqual([
        [1, "2026-10-10", "ExportWeekSettled", 3],
        [2, "2026-10-17", "ExportWeekSettled", 2],
        [3, "2026-10-24", "ExportWeekOpen", 0],
      ]);
    });

    it("marks a date that is past its deadline but not settled", () => {
      const locked = pool();
      locked.weeks[2].status = WeekStatus.Locked;

      expect(
        rowsOf(buildSurvivorExport(input({ pool: locked })), "weeks")[2][2],
      ).toBe("ExportWeekLocked");
    });

    it("has no schedule section for a pool with no dates", () => {
      const doc = buildSurvivorExport(input({ pool: pool({ weeks: [] }) }));

      expect(tableOf(doc, "weeks")).toBeUndefined();
    });
  });

  describe("participants", () => {
    it("says who is left and which spots the organiser runs", () => {
      expect(rowsOf(buildSurvivorExport(input()), "participants")).toEqual([
        ["Alice", "ExportStatusAlive", true],
        ["Bob", "ExportStatusEliminated", false],
        ["Cat", "ExportStatusEliminated", true],
      ]);
    });

    it("has no participants table for a pool nobody has joined", () => {
      const doc = buildSurvivorExport(
        input({ pool: pool({ participants: [] }) }),
      );

      expect(tableOf(doc, "participants")).toBeUndefined();
    });
  });

  describe("settings", () => {
    const valueOf = (doc: ExportDocument, label: string) =>
      rowsOf(doc, "settings").find((row) => row[0] === label)?.[1];

    it("writes the rules the pool was played under", () => {
      const doc = buildSurvivorExport(input());

      expect(valueOf(doc, "SurvivorMaxParticipants")).toBe(100);
      expect(valueOf(doc, "SurvivorStrikesAllowedLabel")).toBe(1);
      expect(valueOf(doc, "SurvivorMissedPickIsStrike")).toBe(true);
      expect(valueOf(doc, "SurvivorPublicPicks")).toBe(false);
      expect(valueOf(doc, "ExportLeagueTeamCount")).toBe(32);
    });

    it("names the assistants, and only when there are any", () => {
      expect(
        valueOf(buildSurvivorExport(input()), "Assistants"),
      ).toBeUndefined();

      const withAssistant = pool();
      withAssistant.settings.assistants = ["bob", "ghost"];
      const doc = buildSurvivorExport(input({ pool: withAssistant }));

      // Somebody who left the pool falls back to their id rather than vanishing.
      expect(valueOf(doc, "Assistants")).toBe("Bob, ghost");
    });
  });

  it("builds every pool state without a section that has no tables", () => {
    for (const status of Object.values(SurvivorState)) {
      const doc = buildSurvivorExport(input({ pool: pool({ status }) }));

      expect(doc.sections.every((section) => section.tables.length > 0)).toBe(
        true,
      );
    }
  });

  it("stamps now when it is not told otherwise", () => {
    const doc = buildSurvivorExport(input({ generatedAt: undefined }));

    expect(Date.parse(doc.generatedAt)).toBeGreaterThan(0);
  });
});
