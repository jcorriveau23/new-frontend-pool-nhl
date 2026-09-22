import { describe, expect, it } from "vitest";

import {
  DropPeriod,
  PlayerDropSettings,
  Player,
  Pool,
  PoolerRoster,
  Position,
  RosterTransaction,
} from "@/data/pool/model";
import { getDropBudget, getSwapLanding, isFreeAgent } from "./player-drops";

const SEASON_START = "2025-10-07";
const SEASON_END = "2026-04-15";

const transaction = (
  participant: string,
  effectiveDate: string
): RosterTransaction => ({
  participant,
  effective_date: effectiveDate,
  dropped_player_id: 1,
  added_player_id: 2,
  date_created: 0,
});

const makePool = (
  dropSettings: PlayerDropSettings | null,
  transactions: RosterTransaction[] = []
): Pool =>
  ({
    season_start: SEASON_START,
    season_end: SEASON_END,
    settings: { player_drop_settings: dropSettings },
    context: { roster_transactions: transactions },
  }) as Pool;

const at = (date: string, hour: number) =>
  new Date(`${date}T${`${hour}`.padStart(2, "0")}:00:00`);

const seasonBudget = (maxDrops: number): PlayerDropSettings => ({
  max_drops: maxDrops,
  period: DropPeriod.SEASON,
});

const monthlyBudget = (maxDrops: number): PlayerDropSettings => ({
  max_drops: maxDrops,
  period: DropPeriod.MONTH,
});

describe("getDropBudget", () => {
  it("reports a pool without free agency as disabled", () => {
    const budget = getDropBudget(makePool(null), "u1", at("2025-12-01", 9));

    expect(budget.isEnabled).toBe(false);
    expect(budget.canDrop).toBe(false);
    expect(budget.max).toBe(0);
  });

  it("reports a pool served without the setting as disabled", () => {
    // An API that predates free agency leaves the key out of the settings
    // rather than sending it as null.
    const pool = { ...makePool(null), settings: {} } as Pool;

    const budget = getDropBudget(pool, "u1", at("2025-12-01", 9));

    expect(budget.isEnabled).toBe(false);
    expect(budget.canDrop).toBe(false);
  });

  it("counts every swap of the pooler against a season budget", () => {
    const budget = getDropBudget(
      makePool(seasonBudget(3), [
        transaction("u1", "2025-10-20"),
        transaction("u1", "2026-01-05"),
        transaction("u2", "2025-12-01"),
      ]),
      "u1",
      at("2026-02-01", 9)
    );

    expect(budget.used).toBe(2);
    expect(budget.remaining).toBe(1);
    expect(budget.canDrop).toBe(true);
  });

  it("only counts the current month against a monthly budget", () => {
    const pool = makePool(monthlyBudget(1), [
      transaction("u1", "2025-12-01"),
      transaction("u1", "2026-01-03"),
    ]);

    expect(getDropBudget(pool, "u1", at("2025-12-20", 9)).remaining).toBe(0);
    expect(getDropBudget(pool, "u1", at("2026-02-20", 9)).remaining).toBe(1);
  });

  it("spends the next month's budget past the noon cutoff on the last day", () => {
    const pool = makePool(monthlyBudget(1), [transaction("u1", "2025-12-15")]);

    // Filed in the morning: still December, and December is spent.
    expect(getDropBudget(pool, "u1", at("2025-12-31", 9)).canDrop).toBe(false);
    // Filed after noon: the swap is for January 1st, which is untouched.
    const nextMonth = getDropBudget(pool, "u1", at("2025-12-31", 13));
    expect(nextMonth.effectiveDate).toBe("2026-01-01");
    expect(nextMonth.canDrop).toBe(true);
  });

  it("lands a swap made before opening night on the season start", () => {
    const budget = getDropBudget(
      makePool(seasonBudget(2)),
      "u1",
      at("2025-09-01", 9)
    );

    expect(budget.effectiveDate).toBe(SEASON_START);
    expect(budget.canDrop).toBe(true);
  });

  it("refuses a swap once the season is over", () => {
    const budget = getDropBudget(
      makePool(seasonBudget(2)),
      "u1",
      at("2026-05-01", 9)
    );

    expect(budget.isSeasonOver).toBe(true);
    expect(budget.canDrop).toBe(false);
    // The budget itself is untouched, it is the calendar that closed.
    expect(budget.remaining).toBe(2);
  });

  it("never reports a negative remaining budget", () => {
    const budget = getDropBudget(
      makePool(seasonBudget(1), [
        transaction("u1", "2025-11-01"),
        transaction("u1", "2025-11-02"),
      ]),
      "u1",
      at("2025-12-01", 9)
    );

    expect(budget.remaining).toBe(0);
    expect(budget.canDrop).toBe(false);
  });

  it("treats a pool that has never had a swap as untouched", () => {
    const pool = { ...makePool(seasonBudget(2)) };
    pool.context = null;

    expect(getDropBudget(pool, "u1", at("2025-12-01", 9)).remaining).toBe(2);
  });
});

describe("isFreeAgent", () => {
  it("is true only for a player no pooler holds", () => {
    const owners = { 10: "someone" };

    expect(isFreeAgent({ id: 10 } as Player, owners)).toBe(false);
    expect(isFreeAgent({ id: 11 } as Player, owners)).toBe(true);
  });
});

describe("getSwapLanding", () => {
  const pool = {
    settings: {
      number_forwards: 2,
      number_defenders: 1,
      number_goalies: 1,
      number_reservists: 1,
      // The backend always sends the field; null is "this pool has no cap".
      salary_cap: null,
    },
  } as Pool;

  const roster: PoolerRoster = {
    chosen_forwards: [1, 2],
    chosen_defenders: [3],
    chosen_goalies: [4],
    chosen_reservists: [5],
  };

  const incoming = (position: Position) => ({ id: 99, position }) as Player;

  it("puts the incoming player in the spot the dropped one frees", () => {
    expect(getSwapLanding(pool, roster, 1, incoming(Position.F))).toBe(
      "lineup"
    );
  });

  it("benches a player whose position has no room after the drop", () => {
    // Dropping a forward does not free the single goalie spot, so an incoming
    // goalie has to sit on the bench the drop left empty.
    const emptyBench = { ...roster, chosen_reservists: [] };

    expect(getSwapLanding(pool, emptyBench, 1, incoming(Position.G))).toBe(
      "bench"
    );
  });

  it("takes the bench spot the dropped player frees", () => {
    // Dropping the only reservist frees the bench for a goalie that cannot
    // start.
    expect(getSwapLanding(pool, roster, 5, incoming(Position.G))).toBe("bench");
  });

  it("benches a player the cap cannot fit in the lineup", () => {
    const cappedPool = {
      settings: { ...pool.settings, salary_cap: 4_000_000 },
      context: {
        players: {
          1: { id: 1, salary_cap: 1_000_000 },
          2: { id: 2, salary_cap: 1_000_000 },
          3: { id: 3, salary_cap: 1_000_000 },
          4: { id: 4, salary_cap: 1_000_000 },
        },
      },
    } as unknown as Pool;
    const emptyBench = { ...roster, chosen_reservists: [] };
    // Dropping a 1M$ forward frees a spot, but a 2M$ forward would put the
    // lineup at 5M$ against a 4M$ cap.
    const expensive = {
      id: 99,
      position: Position.F,
      salary_cap: 2_000_000,
    } as Player;

    expect(getSwapLanding(cappedPool, emptyBench, 1, expensive)).toBe("bench");

    // Under the cap, the same spot is taken.
    const affordable = { ...expensive, salary_cap: 1_000_000 };
    expect(getSwapLanding(cappedPool, emptyBench, 1, affordable)).toBe(
      "lineup"
    );

    // A player with no contract can never start in a pool that counts the cap.
    const noContract = { ...expensive, salary_cap: null };
    expect(getSwapLanding(cappedPool, emptyBench, 1, noContract)).toBe("bench");
  });

  it("reports a swap with nowhere to land", () => {
    // The single goalie spot is taken and the drop frees a forward spot, not
    // the bench, so the goalie has nowhere to go.
    expect(getSwapLanding(pool, roster, 1, incoming(Position.G))).toBe(
      "no-room"
    );

    const noBench = {
      settings: { ...pool.settings, number_reservists: 0 },
    } as Pool;
    expect(getSwapLanding(noBench, roster, 1, incoming(Position.G))).toBe(
      "no-room"
    );
  });
});
