import { describe, expect, it } from "vitest";

import { Pool } from "@/data/pool/model";
import {
  getEffectiveRosterDate,
  getRosterModificationWindow,
} from "./roster-modification";

const makePool = (modificationDates: string[]): Pool =>
  ({
    season_start: "2025-10-07",
    settings: { roster_modification_date: modificationDates },
  }) as Pool;

const at = (date: string, hour: number) =>
  new Date(`${date}T${`${hour}`.padStart(2, "0")}:00:00`);

describe("getEffectiveRosterDate", () => {
  it("applies a morning change to the same day", () => {
    expect(getEffectiveRosterDate(at("2025-12-01", 9))).toBe("2025-12-01");
  });

  it("applies a change made at noon or later to the next day", () => {
    expect(getEffectiveRosterDate(at("2025-12-01", 12))).toBe("2025-12-02");
    expect(getEffectiveRosterDate(at("2025-12-31", 20))).toBe("2026-01-01");
  });
});

describe("getRosterModificationWindow", () => {
  it("is open on an allowed date", () => {
    const window = getRosterModificationWindow(
      makePool(["2025-11-01", "2025-12-01"]),
      at("2025-12-01", 9)
    );

    expect(window.isOpen).toBe(true);
    expect(window.effectiveDate).toBe("2025-12-01");
  });

  it("is closed outside of the allowed dates and points to the next one", () => {
    const window = getRosterModificationWindow(
      makePool(["2025-12-01", "2025-11-01"]),
      at("2025-11-15", 9)
    );

    expect(window.isOpen).toBe(false);
    expect(window.nextOpenDate).toBe("2025-12-01");
    expect(window.upcomingDates).toEqual(["2025-12-01"]);
  });

  it("takes the noon cutoff into account", () => {
    const pool = makePool(["2025-12-02"]);

    expect(getRosterModificationWindow(pool, at("2025-12-01", 9)).isOpen).toBe(
      false
    );
    expect(getRosterModificationWindow(pool, at("2025-12-01", 13)).isOpen).toBe(
      true
    );
  });

  it("is always open until the season starts", () => {
    const window = getRosterModificationWindow(
      makePool([]),
      at("2025-09-20", 9)
    );

    expect(window.isOpen).toBe(true);
    expect(window.nextOpenDate).toBeNull();
  });

  it("reports no upcoming date once every modification date is past", () => {
    const window = getRosterModificationWindow(
      makePool(["2025-11-01"]),
      at("2025-12-01", 9)
    );

    expect(window.isOpen).toBe(false);
    expect(window.nextOpenDate).toBeNull();
    expect(window.upcomingDates).toEqual([]);
  });
});
