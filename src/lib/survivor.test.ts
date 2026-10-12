import { describe, expect, it } from "vitest";

import {
  ParticipantStatus,
  PickOutcome,
  SurvivorGame,
  SurvivorGameState,
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
  displayScore,
  gameStatus,
  hasLiveGame,
  isGameLive,
  MY_OWN_SPOT,
  matchupsCoverTeams,
  orderMatchups,
  participantLabel,
  pickingForOptions,
  revealedWeeksUpTo,
  weekLabel,
  weekOptions,
  hasSettledWeek,
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
  winnerOf,
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

describe("hasSettledWeek", () => {
  it("is false while every date is still to be played", () => {
    expect(hasSettledWeek(pool())).toBe(false);
  });

  it("is false for a date that is only locked", () => {
    // Locking reveals the picks; nothing has been scored yet, so the settings
    // that decide what a pick costs are still the owner's to change.
    expect(
      hasSettledWeek(pool({ weeks: [week(1, WeekStatus.Locked), week(2)] })),
    ).toBe(false);
  });

  it("is true once any date has been settled", () => {
    expect(
      hasSettledWeek(pool({ weeks: [week(1), week(2, WeekStatus.Settled)] })),
    ).toBe(true);
  });
});

const game = (
  home: number,
  away: number,
  overrides: Partial<SurvivorGame> = {},
): SurvivorGame => ({
  home_team_id: home,
  away_team_id: away,
  home_score: null,
  away_score: null,
  state: SurvivorGameState.Upcoming,
  start_time_utc: null,
  period: null,
  period_type: null,
  time_remaining: null,
  in_intermission: false,
  ...overrides,
});

const finished = (
  home: number,
  away: number,
  homeScore: number,
  awayScore: number,
  overrides: Partial<SurvivorGame> = {},
): SurvivorGame =>
  game(home, away, {
    home_score: homeScore,
    away_score: awayScore,
    state: SurvivorGameState.Final,
    period: 3,
    period_type: "REG",
    ...overrides,
  });

const live = (
  home: number,
  away: number,
  homeScore: number,
  awayScore: number,
  overrides: Partial<SurvivorGame> = {},
): SurvivorGame =>
  game(home, away, {
    home_score: homeScore,
    away_score: awayScore,
    state: SurvivorGameState.Live,
    period: 2,
    period_type: "REG",
    time_remaining: "12:34",
    ...overrides,
  });

describe("matchupsCoverTeams", () => {
  it("is false when the backend sent no games", () => {
    // A backend older than the matchups. The screen falls back to the grid
    // rather than showing an empty date over a playable one.
    expect(matchupsCoverTeams(undefined, [8, 10])).toBe(false);
    expect(matchupsCoverTeams([], [8, 10])).toBe(false);
  });

  it("is true when the games account for exactly the eligible teams", () => {
    expect(matchupsCoverTeams([game(10, 8), game(6, 14)], [6, 8, 10, 14])).toBe(
      true,
    );
  });

  it("is false when a game names a team that cannot be picked", () => {
    // A locked date takes its legal teams from the pool document while the
    // games come from the league's feed; a game moved since would show a tile
    // the backend would refuse.
    expect(matchupsCoverTeams([game(10, 8), game(6, 14)], [8, 10])).toBe(false);
  });

  it("is false when a team that can be picked is in no game", () => {
    expect(matchupsCoverTeams([game(10, 8)], [6, 8, 10])).toBe(false);
  });
});

describe("orderMatchups", () => {
  it("puts the games with something still to pick first", () => {
    const closed = game(10, 8);
    const open = game(6, 14);

    expect(orderMatchups([closed, open], [14])).toEqual([open, closed]);
  });

  it("keeps the league's order among games that are alike", () => {
    const first = game(10, 8);
    const second = game(6, 14);

    expect(orderMatchups([first, second], [8, 14])).toEqual([first, second]);
    expect(orderMatchups([first, second], [])).toEqual([first, second]);
  });

  it("does not mutate what it was given", () => {
    const games = [game(10, 8), game(6, 14)];
    orderMatchups(games, [14]);

    expect(games[0].home_team_id).toBe(10);
  });
});

describe("displayScore", () => {
  it("is the score of a finished game", () => {
    expect(displayScore(finished(10, 8, 5, 2))).toEqual({ home: 5, away: 2 });
  });

  it("is the score of a game under way, which is the point of it", () => {
    expect(displayScore(live(10, 8, 2, 1))).toEqual({ home: 2, away: 1 });
  });

  it("is null for a game that has not started", () => {
    expect(displayScore(game(10, 8))).toBeNull();
  });

  it("is null for a game the league called off", () => {
    expect(
      displayScore(game(10, 8, { state: SurvivorGameState.Abandoned })),
    ).toBeNull();
  });

  it("is null when the league reported no score", () => {
    expect(
      displayScore(game(10, 8, { state: SurvivorGameState.Final })),
    ).toBeNull();
  });
});

describe("winnerOf", () => {
  it("is the side that scored more", () => {
    expect(winnerOf(finished(10, 8, 5, 2))).toBe(10);
    expect(winnerOf(finished(10, 8, 1, 4))).toBe(8);
  });

  it("is null while the game is still being played", () => {
    // The score is shown, and the leader is not called the winner: the pool
    // has settled nothing, and saying otherwise is how somebody is told they
    // survived a date they went out on.
    expect(winnerOf(live(10, 8, 2, 1))).toBeNull();
    expect(displayScore(live(10, 8, 2, 1))).not.toBeNull();
  });

  it("is null for a finished game the feed left level", () => {
    // Hockey settles a tie in overtime or a shootout, so this is a feed not
    // telling the whole story rather than a draw — the same conclusion the
    // backend reaches before it eliminates anybody.
    expect(winnerOf(finished(10, 8, 2, 2))).toBeNull();
  });

  it("is null for a game that was called off", () => {
    expect(
      winnerOf(finished(10, 8, 3, 1, { state: SurvivorGameState.Abandoned })),
    ).toBeNull();
  });
});

describe("isGameLive and hasLiveGame", () => {
  it("find a game being played", () => {
    expect(isGameLive(live(10, 8, 1, 1))).toBe(true);
    expect(isGameLive(finished(10, 8, 1, 0))).toBe(false);
    expect(isGameLive(game(10, 8))).toBe(false);
  });

  it("report a date with one live game among finished ones", () => {
    // What the screen polls on: one game still on is reason enough to keep
    // refetching the date.
    expect(hasLiveGame([finished(10, 8, 4, 1), live(6, 14, 0, 0)])).toBe(true);
  });

  it("report nothing to watch on a date that is over or not started", () => {
    expect(hasLiveGame([finished(10, 8, 4, 1)])).toBe(false);
    expect(hasLiveGame([game(10, 8)])).toBe(false);
    expect(hasLiveGame([])).toBe(false);
    expect(hasLiveGame(undefined)).toBe(false);
  });
});

describe("gameStatus", () => {
  it("carries the clock and the period of a live game", () => {
    expect(gameStatus(live(10, 8, 2, 1))).toEqual({
      kind: "live",
      period: 2,
      timeRemaining: "12:34",
      inIntermission: false,
    });
  });

  it("says when a live game's clock is counting down an intermission", () => {
    // The clock is on the break, not the period, so a screen that did not
    // distinguish them would show "P1 15:00" during the first intermission.
    const status = gameStatus(live(10, 8, 1, 1, { in_intermission: true }));

    expect(status).toMatchObject({ kind: "live", inIntermission: true });
  });

  it("says a finished game went past regulation", () => {
    expect(gameStatus(finished(10, 8, 3, 2, { period_type: "OT" }))).toEqual({
      kind: "final",
      wentPastRegulation: "OT",
    });
    expect(gameStatus(finished(10, 8, 3, 2, { period_type: "SO" }))).toEqual({
      kind: "final",
      wentPastRegulation: "SO",
    });
  });

  it("does not dress up a game that ended in regulation", () => {
    expect(gameStatus(finished(10, 8, 3, 2))).toEqual({
      kind: "final",
      wentPastRegulation: null,
    });
  });

  it("carries the start time of a game still to come", () => {
    expect(
      gameStatus(game(10, 8, { start_time_utc: "2026-10-10T23:00:00Z" })),
    ).toEqual({ kind: "upcoming", startTimeUtc: "2026-10-10T23:00:00Z" });
  });

  it("reports a game the league called off", () => {
    expect(
      gameStatus(game(10, 8, { state: SurvivorGameState.Abandoned })),
    ).toEqual({ kind: "abandoned" });
  });
});

// The real translator interpolates; echoing the key and its values is enough
// to tell one message from another.
const tr = (key: string, values?: Record<string, number | string>) =>
  key === "SurvivorWeekLabel" ? `Week ${values?.week}` : key;

describe("weekLabel", () => {
  it("names the date, not just its number", () => {
    // "3" in a dropdown says nothing about which Saturday is being picked for.
    expect(weekLabel(tr, week(3))).toBe("Week 3 — 2026-10-17");
  });

  it("marks a date that has been settled", () => {
    expect(weekLabel(tr, week(1, WeekStatus.Settled))).toMatch(/✓$/);
  });

  it("does not mark one that is merely locked", () => {
    // Locked means the picks are public, not that the date is done with.
    expect(weekLabel(tr, week(1, WeekStatus.Locked))).not.toMatch(/✓$/);
  });
});

describe("participantLabel", () => {
  it("is the name for somebody who signed themselves up", () => {
    expect(participantLabel(tr, participant("Raph"))).toBe("Raph");
  });

  it("marks a spot the organiser keeps on somebody's behalf", () => {
    const managed = participant("Davis", { is_owned: false });

    expect(participantLabel(tr, managed)).toBe("Davis SurvivorManagedSuffix");
  });
});

describe("weekOptions", () => {
  it("pairs each date's value with the label the trigger shows", () => {
    /*
    The value and the label are handed to Base UI separately — the value to
    `items` and to the row, the label to both — so they are built together
    here. Written out twice in the markup they drift, and what that looks like
    is a trigger reading "3" over a list reading "Week 3 — 2026-10-17".
    */
    expect(weekOptions(tr, [week(1, WeekStatus.Settled), week(2)])).toEqual([
      { value: "1", label: "Week 1 — 2026-10-03 ✓" },
      { value: "2", label: "Week 2 — 2026-10-10" },
    ]);
  });

  it("keys on the week number, which is what the pick carries", () => {
    expect(weekOptions(tr, [week(7)])[0].value).toBe("7");
  });
});

describe("pickingForOptions", () => {
  const people = [participant("Raph"), participant("Davis")];

  it("offers the caller's own spot first", () => {
    const options = pickingForOptions(tr, people, "Raph");

    expect(options[0]).toEqual({
      value: MY_OWN_SPOT,
      label: "SurvivorMyself",
    });
  });

  it("names the others rather than listing their ids", () => {
    // The value stays the id — a uuid in a managed pool — and only the label
    // is for reading.
    expect(pickingForOptions(tr, people, "Raph")[1]).toEqual({
      value: "Davis",
      label: "Davis",
    });
  });

  it("does not list the caller twice", () => {
    const options = pickingForOptions(tr, people, "Raph");

    expect(options).toHaveLength(2);
    expect(options.map((option) => option.value)).not.toContain("Raph");
  });

  it("offers everybody to somebody who is not in the pool", () => {
    // An owner who never joined their own pool still files for the spots they
    // keep on other people's behalf.
    expect(pickingForOptions(tr, people, undefined)).toHaveLength(3);
  });

  it("marks a managed spot in the list", () => {
    const managed = [participant("Davis", { is_owned: false })];

    expect(pickingForOptions(tr, managed, "Raph")[1].label).toBe(
      "Davis SurvivorManagedSuffix",
    );
  });
});

describe("revealedWeeksUpTo", () => {
  it("stops at the date in view", () => {
    expect(revealedWeeksUpTo([1, 2, 3], 2)).toEqual([1, 2]);
  });

  it("includes the date in view when its picks are public", () => {
    expect(revealedWeeksUpTo([1, 2, 3], 3)).toEqual([1, 2, 3]);
  });

  it("shows everything revealed when no date is in view", () => {
    expect(revealedWeeksUpTo([1, 2, 3], null)).toEqual([1, 2, 3]);
  });

  it("never invents a date the backend withheld", () => {
    // Week 3 is open, so the backend left it out of the payload entirely.
    // Selecting it must not conjure a column.
    expect(revealedWeeksUpTo([1, 2], 3)).toEqual([1, 2]);
  });
});
