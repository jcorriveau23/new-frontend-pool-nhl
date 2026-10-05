import { describe, expect, it } from "vitest";

import { LineupEvent, RosterTransaction } from "@/data/pool/model";

import {
  DailyHistory,
  TODAY,
  addLineupEventsToHistory,
  addWaiversToHistory,
  lineupEventChanges,
} from "./history-calculation";

const NAMES: Record<string, string> = { "user-a": "Alice", "user-b": "Bob" };
const participantName = (id: string) => NAMES[id];

const waiver = (
  participant: string,
  effectiveDate: string,
  dropped: number,
  added: number,
  dateCreated = 0,
): RosterTransaction => ({
  participant,
  effective_date: effectiveDate,
  dropped_player_id: dropped,
  added_player_id: added,
  date_created: dateCreated,
});

const day = (
  date: string,
  overrides: Partial<DailyHistory> = {},
): DailyHistory => ({
  date,
  dailyMovements: [],
  dailyTrades: [],
  dailyWaivers: [],
  dailyLineupEvents: [],
  ...overrides,
});

describe("addWaiversToHistory", () => {
  it("leaves the history alone without any claim", () => {
    const history = [day("2026-11-02", { dailyTrades: [{} as never] })];

    expect(addWaiversToHistory(history, [], participantName)).toEqual(history);
  });

  it("adds a day for a claim no lineup change was seen on", () => {
    const claim = waiver("user-a", "2026-11-05", 2, 9);

    expect(addWaiversToHistory([], [claim], participantName)).toEqual([
      day("2026-11-05", { dailyWaivers: [claim] }),
    ]);
  });

  it("takes the claim's players out of the pooler's movements that day", () => {
    const claim = waiver("user-a", "2026-11-05", 2, 9);
    const history = [
      day("2026-11-05", {
        dailyMovements: [
          {
            participant: "Alice",
            addedPlayerIds: ["9", "11"],
            removedPlayerIds: ["2"],
          },
          // Bob's lineup change is his own, even with the same player ids.
          { participant: "Bob", addedPlayerIds: ["9"], removedPlayerIds: [] },
        ],
      }),
    ];

    const [result] = addWaiversToHistory(history, [claim], participantName);

    expect(result.dailyMovements).toEqual([
      { participant: "Alice", addedPlayerIds: ["11"], removedPlayerIds: [] },
      { participant: "Bob", addedPlayerIds: ["9"], removedPlayerIds: [] },
    ]);
    expect(result.dailyWaivers).toEqual([claim]);
  });

  it("drops a movement the claim fully explains, from today too", () => {
    const claim = waiver("user-a", "2026-11-05", 2, 9);
    const history = [
      day(TODAY, {
        dailyMovements: [
          {
            participant: "Alice",
            addedPlayerIds: ["9"],
            removedPlayerIds: ["2"],
          },
        ],
      }),
    ];

    // The Today bucket only held the swap, so it goes away altogether.
    expect(addWaiversToHistory(history, [claim], participantName)).toEqual([
      day("2026-11-05", { dailyWaivers: [claim] }),
    ]);
  });

  it("puts today first, then the most recent day, claims in filing order", () => {
    const early = waiver("user-b", "2026-11-05", 3, 8, 100);
    const late = waiver("user-a", "2026-11-05", 2, 9, 200);
    const history = [
      day("2026-10-20", { dailyTrades: [{} as never] }),
      day(TODAY, {
        dailyMovements: [
          { participant: "Bob", addedPlayerIds: ["12"], removedPlayerIds: [] },
        ],
      }),
    ];

    const result = addWaiversToHistory(history, [late, early], participantName);

    expect(result.map((entry) => entry.date)).toEqual([
      TODAY,
      "2026-11-05",
      "2026-10-20",
    ]);
    expect(result[1].dailyWaivers).toEqual([early, late]);
  });

  it("does not modify the history it is given", () => {
    const movements = {
      participant: "Alice",
      addedPlayerIds: ["9"],
      removedPlayerIds: ["2"],
    };
    const history = [day("2026-11-05", { dailyMovements: [movements] })];

    addWaiversToHistory(
      history,
      [waiver("user-a", "2026-11-05", 2, 9)],
      participantName,
    );

    expect(history[0].dailyMovements).toEqual([movements]);
    expect(history[0].dailyWaivers).toEqual([]);
  });
});

const lineupEvent = (
  participant: string,
  effectiveDate: string,
  forwards: number[],
  defense: number[] = [50],
  goalies: number[] = [60],
): LineupEvent => ({
  participant,
  effective_date: effectiveDate,
  forwards,
  defense,
  goalies,
});

describe("lineupEventChanges", () => {
  it("shows each event against the one before it", () => {
    const changes = lineupEventChanges([
      lineupEvent("user-a", "2026-10-07", [1, 2]),
      lineupEvent("user-a", "2026-11-01", [1, 3]),
    ]);

    expect(changes).toHaveLength(2);
    // The opening lineup has nothing to differ from, so it is listed as the
    // lineup the pool starts from rather than as a change.
    expect(changes[0]).toMatchObject({
      isOpening: true,
      addedPlayerIds: [],
      removedPlayerIds: [],
    });
    expect(changes[1]).toMatchObject({
      isOpening: false,
      addedPlayerIds: ["3"],
      removedPlayerIds: ["2"],
    });
  });

  it("reads the events in date order whatever order they are stored in", () => {
    const changes = lineupEventChanges([
      lineupEvent("user-a", "2026-11-01", [1, 3]),
      lineupEvent("user-a", "2026-10-07", [1, 2]),
    ]);

    expect(changes[0].event.effective_date).toBe("2026-10-07");
    expect(changes[0].isOpening).toBe(true);
    expect(changes[1].addedPlayerIds).toEqual(["3"]);
  });

  it("keeps the poolers apart", () => {
    const changes = lineupEventChanges([
      lineupEvent("user-a", "2026-10-07", [1, 2]),
      lineupEvent("user-b", "2026-10-07", [7, 8]),
      lineupEvent("user-b", "2026-11-01", [7, 9]),
    ]);

    // A change to one pooler's lineup says nothing about another's, so Bob's
    // second event is measured against Bob's first and not against Alice's.
    const bob = changes.filter((c) => c.event.participant === "user-b");
    expect(bob.map((c) => c.isOpening)).toEqual([true, false]);
    expect(bob[1].addedPlayerIds).toEqual(["9"]);
  });

  it("counts a defender and a goalie moving, not just forwards", () => {
    const changes = lineupEventChanges([
      lineupEvent("user-a", "2026-10-07", [1], [50], [60]),
      lineupEvent("user-a", "2026-11-01", [1], [51], [60]),
    ]);

    expect(changes[1]).toMatchObject({
      addedPlayerIds: ["51"],
      removedPlayerIds: ["50"],
    });
  });
});

describe("addLineupEventsToHistory", () => {
  it("leaves the history alone without any event", () => {
    const history = [day("2026-11-01")];

    expect(addLineupEventsToHistory(history, [], participantName)).toEqual([]);
  });

  it("lists an event on the day it takes effect on", () => {
    const result = addLineupEventsToHistory(
      [],
      [lineupEvent("user-a", "2026-11-01", [1, 2])],
      participantName,
    );

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-11-01");
    expect(result[0].dailyLineupEvents).toHaveLength(1);
  });

  it("supersedes the movements derived for that pooler on that day", () => {
    const result = addLineupEventsToHistory(
      [
        day("2026-11-01", {
          dailyMovements: [
            {
              participant: "Alice",
              addedPlayerIds: ["3"],
              removedPlayerIds: ["2"],
            },
            {
              participant: "Bob",
              addedPlayerIds: ["9"],
              removedPlayerIds: ["8"],
            },
          ],
        }),
      ],
      [lineupEvent("user-a", "2026-11-01", [1, 3])],
      participantName,
    );

    // The event is the same change seen from the side the scoring reads, so
    // showing both would show it twice. Bob has no event, so his stay.
    expect(result[0].dailyMovements.map((m) => m.participant)).toEqual(["Bob"]);
    expect(result[0].dailyLineupEvents).toHaveLength(1);
  });

  it("keeps a day whose only entry is an event, and drops an empty one", () => {
    const result = addLineupEventsToHistory(
      [day("2026-10-20")],
      [lineupEvent("user-a", "2026-11-01", [1])],
      participantName,
    );

    expect(result.map((d) => d.date)).toEqual(["2026-11-01"]);
  });

  it("puts today first and the rest most recent down", () => {
    const result = addLineupEventsToHistory(
      [day(TODAY, { dailyTrades: [{} as never] })],
      [
        lineupEvent("user-a", "2026-10-07", [1]),
        lineupEvent("user-a", "2026-11-01", [2]),
      ],
      participantName,
    );

    expect(result.map((d) => d.date)).toEqual([
      TODAY,
      "2026-11-01",
      "2026-10-07",
    ]);
  });
});
