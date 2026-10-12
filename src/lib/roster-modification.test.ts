import { describe, expect, it } from "vitest";

import { Pool } from "@/data/pool/model";
import { poolClockAt as at } from "@/test/pool-clock";

import {
  getBackdateRange,
  getEffectiveRosterDate,
  getRosterModificationWindow,
} from "./roster-modification";

const makePool = (modificationDates: string[]): Pool =>
  ({
    season_start: "2025-10-07",
    settings: { roster_modification_date: modificationDates },
  }) as Pool;

describe("getEffectiveRosterDate", () => {
  it("applies a morning change to the same day", () => {
    expect(getEffectiveRosterDate(at("2025-12-01", 9))).toBe("2025-12-01");
  });

  it("applies a change made at noon or later to the next day", () => {
    expect(getEffectiveRosterDate(at("2025-12-01", 12))).toBe("2025-12-02");
    expect(getEffectiveRosterDate(at("2025-12-31", 20))).toBe("2026-01-01");
  });

  /*
  Noon is noon in the pool's zone, not on the clock of whoever is asking. These
  instants are written in UTC so they mean the same thing on every machine: the
  backend used to read 15:00Z as "past noon" because the container it runs in
  has no timezone at all, and dated an 11:00 Montreal waiver claim to the next
  day — on a screen that had just promised it would count for that day.
  */
  it("measures noon in the pool's zone rather than the caller's", () => {
    // 11:00 and 11:59 in Montreal.
    expect(getEffectiveRosterDate(new Date("2026-10-12T15:00:00Z"))).toBe(
      "2026-10-12",
    );
    expect(getEffectiveRosterDate(new Date("2026-10-12T15:59:00Z"))).toBe(
      "2026-10-12",
    );
    // Noon in Montreal, the first minute that belongs to the next day.
    expect(getEffectiveRosterDate(new Date("2026-10-12T16:00:00Z"))).toBe(
      "2026-10-13",
    );
  });

  // The offset the zone is at moves with daylight saving; the hour the cutoff
  // falls on does not, which is why the zone is named instead of an offset.
  it("keeps the cutoff at noon on both sides of daylight saving", () => {
    // EST, UTC-5: noon in Montreal is 17:00Z.
    expect(getEffectiveRosterDate(new Date("2027-01-12T16:59:00Z"))).toBe(
      "2027-01-12",
    );
    expect(getEffectiveRosterDate(new Date("2027-01-12T17:00:00Z"))).toBe(
      "2027-01-13",
    );
  });

  // Past the cutoff on the last day of a month, year or leap February, the day
  // the move counts from is in the next one.
  it("rolls over the end of a month", () => {
    expect(getEffectiveRosterDate(at("2026-02-28", 15))).toBe("2026-03-01");
    expect(getEffectiveRosterDate(at("2028-02-28", 15))).toBe("2028-02-29");
  });

  it("keeps a move filed just after midnight on the day it was filed", () => {
    expect(getEffectiveRosterDate(at("2025-12-01", 0))).toBe("2025-12-01");
  });
});

const seasonPool = (start: string, end: string): Pool =>
  ({
    season_start: start,
    season_end: end,
    settings: { roster_modification_date: [] },
  }) as unknown as Pool;

describe("getBackdateRange", () => {
  it("runs from opening night to the day the move is filed", () => {
    const range = getBackdateRange(
      seasonPool("2025-10-07", "2026-04-15"),
      at("2025-12-01", 9),
    );

    expect(range).toEqual({
      defaultDate: "2025-12-01",
      earliestDate: "2025-10-07",
      latestDate: "2025-12-01",
      canBackdate: true,
    });
  });

  it("borrows the noon cutoff, so an afternoon move counts from tomorrow", () => {
    const range = getBackdateRange(
      seasonPool("2025-10-07", "2026-04-15"),
      at("2025-12-01", 15),
    );

    expect(range.defaultDate).toBe("2025-12-02");
    expect(range.latestDate).toBe("2025-12-02");
  });

  it("has nothing to pick before the season starts", () => {
    const range = getBackdateRange(
      seasonPool("2025-10-07", "2026-04-15"),
      at("2025-09-01", 9),
    );

    // A pre-season move redefines the lineup the pool opens with, so opening
    // night is both the earliest and the latest it could count from.
    expect(range.defaultDate).toBe("2025-10-07");
    expect(range.latestDate).toBe("2025-10-07");
    expect(range.canBackdate).toBe(false);
  });

  it("has nothing to pick on opening day itself", () => {
    const range = getBackdateRange(
      seasonPool("2025-10-07", "2026-04-15"),
      at("2025-10-07", 9),
    );

    expect(range.canBackdate).toBe(false);
  });

  it("stops at the last day of the season once it is over", () => {
    const range = getBackdateRange(
      seasonPool("2025-10-07", "2026-04-15"),
      at("2026-05-01", 9),
    );

    // The default is a day that is never scored; the picker stops at the last
    // one that is.
    expect(range.defaultDate).toBe("2026-05-01");
    expect(range.latestDate).toBe("2026-04-15");
    expect(range.canBackdate).toBe(true);
  });
});

describe("getRosterModificationWindow", () => {
  it("is open on an allowed date", () => {
    const window = getRosterModificationWindow(
      makePool(["2025-11-01", "2025-12-01"]),
      at("2025-12-01", 9),
    );

    expect(window.isOpen).toBe(true);
    expect(window.effectiveDate).toBe("2025-12-01");
  });

  it("is closed outside of the allowed dates and points to the next one", () => {
    const window = getRosterModificationWindow(
      makePool(["2025-12-01", "2025-11-01"]),
      at("2025-11-15", 9),
    );

    expect(window.isOpen).toBe(false);
    expect(window.nextOpenDate).toBe("2025-12-01");
    expect(window.upcomingDates).toEqual(["2025-12-01"]);
  });

  it("takes the noon cutoff into account", () => {
    const pool = makePool(["2025-12-02"]);

    expect(getRosterModificationWindow(pool, at("2025-12-01", 9)).isOpen).toBe(
      false,
    );
    expect(getRosterModificationWindow(pool, at("2025-12-01", 13)).isOpen).toBe(
      true,
    );
  });

  it("is always open until the season starts", () => {
    const window = getRosterModificationWindow(
      makePool([]),
      at("2025-09-20", 9),
    );

    expect(window.isOpen).toBe(true);
    expect(window.nextOpenDate).toBeNull();
  });

  it("reports no upcoming date once every modification date is past", () => {
    const window = getRosterModificationWindow(
      makePool(["2025-11-01"]),
      at("2025-12-01", 9),
    );

    expect(window.isOpen).toBe(false);
    expect(window.nextOpenDate).toBeNull();
    expect(window.upcomingDates).toEqual([]);
  });
});
