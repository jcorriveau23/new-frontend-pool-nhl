import { describe, expect, it } from "vitest";

import {
  ParticipantStatus,
  PickOutcome,
  SurvivorPool,
  SurvivorStandingRow,
  SurvivorState,
  SurvivorUser,
  SurvivorWeek,
  WeekStatus,
} from "@/data/survivor/model";
import {
  aliveRows,
  arePicksRevealed,
  canJoin,
  currentWeek,
  defaultWeek,
  hasSurvivorPrivilege,
  isOwner,
  isParticipant,
  participantOf,
  pickBlockedReasonKey,
  PICK_OUTCOME_TONE,
  splitTeamChoices,
  spotsLeft,
  strikesRemaining,
  weekByNumber,
} from "./survivor";

const OWNER = "owner-id";

const week = (
  number: number,
  status: WeekStatus = WeekStatus.Open,
  eligible: number[] = [8, 10, 6],
): SurvivorWeek => ({
  week: number,
  pick_date: `2026-10-${String(number * 7 - 4).padStart(2, "0")}`,
  status,
  eligible_team_ids: eligible,
  settled_at: null,
});

const participant = (
  id: string,
  overrides: Partial<SurvivorUser> = {},
): SurvivorUser => ({
  id,
  name: id,
  status: ParticipantStatus.Alive,
  strikes: 0,
  eliminated_week: null,
  date_joined: 0,
  // Somebody who signed themselves up; a spot the organiser keeps overrides
  // this to false.
  is_owned: true,
  ...overrides,
});

// Only the fields these functions read; the real document carries more, none of
// which changes their behaviour.
const pool = (overrides: Partial<SurvivorPool> = {}): SurvivorPool =>
  ({
    name: "survivor",
    owner: OWNER,
    status: SurvivorState.Created,
    settings: {
      assistants: [],
      max_participants: 100,
      strikes_allowed: 0,
      missed_pick_is_strike: true,
      allow_pick_change: true,
      league_team_count: 32,
    },
    participants: [participant(OWNER)],
    weeks: [week(1), week(2), week(3)],
    winners: null,
    ...overrides,
  }) as SurvivorPool;

const standingRow = (
  id: string,
  status: ParticipantStatus,
): SurvivorStandingRow => ({
  participant_id: id,
  name: id,
  status,
  strikes: 0,
  eliminated_week: null,
  wins: 0,
  picks: {},
});

describe("currentWeek", () => {
  it("is the first date not settled yet", () => {
    const result = currentWeek(
      pool({ weeks: [week(1, WeekStatus.Settled), week(2), week(3)] }),
    );

    expect(result?.week).toBe(2);
  });

  it("counts a locked date as still being played, since it is not settled", () => {
    const result = currentWeek(
      pool({
        weeks: [week(1, WeekStatus.Settled), week(2, WeekStatus.Locked)],
      }),
    );

    expect(result?.week).toBe(2);
  });

  it("is null once every date has been settled", () => {
    const result = currentWeek(
      pool({
        weeks: [week(1, WeekStatus.Settled), week(2, WeekStatus.Settled)],
      }),
    );

    expect(result).toBeNull();
  });
});

describe("defaultWeek", () => {
  it("is the date being played", () => {
    expect(defaultWeek(pool())?.week).toBe(1);
  });

  it("falls back to the last date of a pool that is over", () => {
    const finished = pool({
      weeks: [week(1, WeekStatus.Settled), week(2, WeekStatus.Settled)],
    });

    // Landing a finished pool on "no date" would show an empty page.
    expect(defaultWeek(finished)?.week).toBe(2);
  });

  it("is null for a pool with no dates at all", () => {
    expect(defaultWeek(pool({ weeks: [] }))).toBeNull();
  });
});

describe("weekByNumber", () => {
  it("finds a date by its number", () => {
    expect(weekByNumber(pool(), 2)?.week).toBe(2);
  });

  it("is null for a date the pool does not have", () => {
    expect(weekByNumber(pool(), 99)).toBeNull();
  });
});

describe("participantOf", () => {
  it("finds the signed-in user among the participants", () => {
    expect(participantOf(pool(), OWNER)?.id).toBe(OWNER);
    expect(isParticipant(pool(), OWNER)).toBe(true);
  });

  it("is null for somebody who is not in the pool", () => {
    expect(participantOf(pool(), "stranger")).toBeNull();
    expect(isParticipant(pool(), "stranger")).toBe(false);
  });

  it("is null for a visitor who is not signed in", () => {
    // The user reaches the page before Hanko has validated the session, so this
    // is the state the first render is in.
    expect(participantOf(pool(), null)).toBeNull();
    expect(participantOf(pool(), undefined)).toBeNull();
    expect(isParticipant(pool(), null)).toBe(false);
  });
});

describe("hasSurvivorPrivilege", () => {
  it("covers the owner and the assistants", () => {
    const withAssistant = pool({
      settings: { ...pool().settings, assistants: ["helper"] },
    });

    expect(hasSurvivorPrivilege(withAssistant, OWNER)).toBe(true);
    expect(hasSurvivorPrivilege(withAssistant, "helper")).toBe(true);
    expect(hasSurvivorPrivilege(withAssistant, "someone")).toBe(false);
    expect(hasSurvivorPrivilege(withAssistant, null)).toBe(false);
  });

  it("does not open owner-only actions to an assistant", () => {
    const withAssistant = pool({
      settings: { ...pool().settings, assistants: ["helper"] },
    });

    expect(isOwner(withAssistant, OWNER)).toBe(true);
    expect(isOwner(withAssistant, "helper")).toBe(false);
    expect(isOwner(withAssistant, null)).toBe(false);
  });
});

describe("canJoin", () => {
  it("lets a signed-in stranger sign themselves up", () => {
    expect(canJoin(pool(), "newcomer")).toBe(true);
  });

  it("does not offer to somebody already in the pool", () => {
    expect(canJoin(pool(), OWNER)).toBe(false);
  });

  it("does not offer to a visitor who is not signed in", () => {
    expect(canJoin(pool(), null)).toBe(false);
  });

  it("stays open while no date has been settled", () => {
    // A latecomer before the first settlement has missed nothing.
    const locked = pool({ weeks: [week(1, WeekStatus.Locked), week(2)] });

    expect(canJoin(locked, "newcomer")).toBe(true);
  });

  it("closes once a date has been settled", () => {
    const started = pool({ weeks: [week(1, WeekStatus.Settled), week(2)] });

    expect(canJoin(started, "newcomer")).toBe(false);
  });

  it("closes on a pool that is over", () => {
    expect(canJoin(pool({ status: SurvivorState.Final }), "newcomer")).toBe(
      false,
    );
  });

  it("closes on a full pool", () => {
    const full = pool({
      settings: { ...pool().settings, max_participants: 1 },
    });

    expect(canJoin(full, "newcomer")).toBe(false);
    expect(spotsLeft(full)).toBe(0);
  });
});

describe("spotsLeft", () => {
  it("is what the maximum leaves", () => {
    expect(spotsLeft(pool())).toBe(99);
  });

  it("never goes below zero, even past the maximum", () => {
    const over = pool({
      settings: { ...pool().settings, max_participants: 1 },
      participants: [participant("a"), participant("b"), participant("c")],
    });

    expect(spotsLeft(over)).toBe(0);
  });
});

describe("arePicksRevealed", () => {
  it("hides an open date's picks and reveals the rest", () => {
    expect(arePicksRevealed(week(1, WeekStatus.Open))).toBe(false);
    expect(arePicksRevealed(week(1, WeekStatus.Locked))).toBe(true);
    expect(arePicksRevealed(week(1, WeekStatus.Settled))).toBe(true);
  });
});

describe("aliveRows", () => {
  it("keeps only the field still standing", () => {
    const rows = [
      standingRow("a", ParticipantStatus.Alive),
      standingRow("b", ParticipantStatus.Eliminated),
      standingRow("c", ParticipantStatus.Alive),
    ];

    expect(aliveRows(rows).map((row) => row.participant_id)).toEqual([
      "a",
      "c",
    ]);
  });
});

describe("strikesRemaining", () => {
  it("is one loss in a pool that allows no strikes", () => {
    expect(strikesRemaining(pool(), participant("a"))).toBe(1);
  });

  it("counts the forgiven loss and the one that is not", () => {
    const forgiving = pool({
      settings: { ...pool().settings, strikes_allowed: 1 },
    });

    expect(strikesRemaining(forgiving, participant("a"))).toBe(2);
    expect(strikesRemaining(forgiving, participant("a", { strikes: 1 }))).toBe(
      1,
    );
  });

  it("never goes below zero for somebody already past their allowance", () => {
    expect(strikesRemaining(pool(), participant("a", { strikes: 5 }))).toBe(0);
  });
});

describe("pickBlockedReasonKey", () => {
  /*
  The shape an open date actually has in production: the pool's own copy of the
  week carries no teams, because the read path does not write it back, and the
  teams come from the pick endpoint instead. The fixtures used to default the
  week's list to a populated one — a state an open date never reaches — which
  is how the bug below went unnoticed.
  */
  const openWeek = () => week(1, WeekStatus.Open, []);

  it("is null when the participant may pick", () => {
    expect(
      pickBlockedReasonKey(openWeek(), participant("a"), [8, 10, 6], false),
    ).toBeNull();
  });

  /*
  Regression: the reason used to be read off `week.eligible_team_ids`, which is
  empty on every open date, so the screen announced "no games that day" over a
  full grid of teams and disabled every one of them.
  */
  it("does not call an open date gameless just because the pool has no copy of its teams", () => {
    expect(
      pickBlockedReasonKey(openWeek(), participant("a"), [8, 10, 6], false),
    ).toBeNull();
  });

  it("tells somebody who is not in the pool so first", () => {
    expect(pickBlockedReasonKey(openWeek(), null, [8, 10], false)).toBe(
      "SurvivorNotAParticipant",
    );
  });

  it("tells an eliminated participant before anything about the date", () => {
    const out = participant("a", {
      status: ParticipantStatus.Eliminated,
      eliminated_week: 1,
    });

    expect(
      pickBlockedReasonKey(week(1, WeekStatus.Locked), out, [8, 10], false),
    ).toBe("SurvivorYouAreEliminated");
  });

  it("tells a settled date apart from a locked one", () => {
    expect(
      pickBlockedReasonKey(
        week(1, WeekStatus.Settled),
        participant("a"),
        [8, 10],
        false,
      ),
    ).toBe("SurvivorWeekSettled");

    expect(
      pickBlockedReasonKey(
        week(1, WeekStatus.Locked),
        participant("a"),
        [8, 10],
        false,
      ),
    ).toBe("SurvivorWeekLocked");
  });

  it("says so when the league scheduled nothing that day", () => {
    expect(pickBlockedReasonKey(openWeek(), participant("a"), [], true)).toBe(
      "SurvivorNoGamesThatDay",
    );
  });

  it("says so when every team playing is one they have used", () => {
    expect(
      pickBlockedReasonKey(openWeek(), participant("a"), [8, 10, 6], true),
    ).toBe("SurvivorNoTeamLeftThisWeek");
  });

  /*
  The pick screen failed to load, so how many teams play that day is unknown.
  Guessing "no games" there is what produced the bug above, so an unknown list
  reports nothing about the schedule.
  */
  it("says nothing about the schedule when the teams are not known", () => {
    expect(
      pickBlockedReasonKey(openWeek(), participant("a"), null, false),
    ).toBeNull();

    // A blocked flag still stands on its own.
    expect(pickBlockedReasonKey(openWeek(), participant("a"), null, true)).toBe(
      "SurvivorNoTeamLeftThisWeek",
    );
  });
});

describe("splitTeamChoices", () => {
  it("splits the teams playing into the open ones and the spent ones", () => {
    const { available, used } = splitTeamChoices([8, 10, 6, 14], [10, 14]);

    expect(available).toEqual([10, 14]);
    expect(used).toEqual([8, 6]);
  });

  it("keeps the order the schedule gave, so the grid does not reshuffle", () => {
    const { available } = splitTeamChoices([14, 6, 10, 8], [8, 10, 14]);

    expect(available).toEqual([14, 10, 8]);
  });

  it("puts everything in used when nothing is open", () => {
    const { available, used } = splitTeamChoices([8, 10], []);

    expect(available).toEqual([]);
    expect(used).toEqual([8, 10]);
  });
});

describe("PICK_OUTCOME_TONE", () => {
  it("keeps a date still to settle apart from a game with no result", () => {
    // Both are "nothing came of it" but they are not the same thing to a
    // participant, so the grid must be able to say which.
    expect(PICK_OUTCOME_TONE[PickOutcome.Pending]).toBe("pending");
    expect(PICK_OUTCOME_TONE[PickOutcome.Void]).toBe("void");
    expect(PICK_OUTCOME_TONE[PickOutcome.Won]).toBe("won");
    expect(PICK_OUTCOME_TONE[PickOutcome.Lost]).toBe("lost");
  });
});
