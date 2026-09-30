import { describe, expect, it } from "vitest";

import { RosterTransaction } from "@/data/pool/model";

import {
  DailyHistory,
  TODAY,
  addWaiversToHistory,
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
