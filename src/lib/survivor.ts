/*
What the survivor screens derive from a pool.

Kept out of the components so the rules the UI shows — which date is being
played, whether you may still pick, why a team is closed to you — are testable
and stated once. The authoritative versions of these rules live in the Rust
model; these decide what to render, never what is allowed.
*/

import {
  DateClock,
  ParticipantStatus,
  PickOutcome,
  RevealedPick,
  SurvivorGame,
  SurvivorGameState,
  SurvivorPool,
  SurvivorStandingRow,
  SurvivorState,
  SurvivorUser,
  SurvivorWeek,
  WeekStatus,
} from "@/data/survivor/model";

/*
The date the pool is currently playing for: the first one not settled yet.

Null once every date has been settled, which is a pool that is over.
*/
export function currentWeek(pool: SurvivorPool): SurvivorWeek | null {
  return pool.weeks.find((week) => week.status !== WeekStatus.Settled) ?? null;
}

/*
The date to open the pool on.

The one being played, or — for a pool that is over — the last one settled, since
landing a finished pool on "no date" would show an empty page.
*/
export function defaultWeek(pool: SurvivorPool): SurvivorWeek | null {
  return currentWeek(pool) ?? pool.weeks[pool.weeks.length - 1] ?? null;
}

export function weekByNumber(
  pool: SurvivorPool,
  week: number,
): SurvivorWeek | null {
  return pool.weeks.find((candidate) => candidate.week === week) ?? null;
}

export function participantOf(
  pool: SurvivorPool,
  userId: string | null | undefined,
): SurvivorUser | null {
  if (!userId) {
    return null;
  }
  return pool.participants.find((person) => person.id === userId) ?? null;
}

export function isParticipant(
  pool: SurvivorPool,
  userId: string | null | undefined,
): boolean {
  return participantOf(pool, userId) !== null;
}

/*
Whether the signed-in user may settle a date and edit the pool.

The owner and the assistants, which is the same rule the backend applies — this
only decides whether to render the controls.
*/
export function hasSurvivorPrivilege(
  pool: SurvivorPool,
  userId: string | null | undefined,
): boolean {
  if (!userId) {
    return false;
  }
  return pool.owner === userId || pool.settings.assistants.includes(userId);
}

export function isOwner(
  pool: SurvivorPool,
  userId: string | null | undefined,
): boolean {
  return Boolean(userId) && pool.owner === userId;
}

/*
Whether any date has been settled yet.

Two rules turn on it. Joining stays open until one has, since a latecomer
before that has missed nothing. And the backend refuses to change what a pick
costs — the losses allowed, whether a missed pick costs one — once one has,
because the strikes already recorded were counted under the old rules; the
settings form reads this to disable those fields rather than let the owner
submit an edit that comes back refused.
*/
export function hasSettledWeek(pool: SurvivorPool): boolean {
  return pool.weeks.some((week) => week.status === WeekStatus.Settled);
}

/*
Whether somebody who is not in the pool can still sign themselves up.

Joining is self-serve and stays open until a date has actually been settled: a
latecomer before that has missed nothing.
*/
export function canJoin(
  pool: SurvivorPool,
  userId: string | null | undefined,
): boolean {
  if (!userId || isParticipant(pool, userId)) {
    return false;
  }
  if (pool.status === SurvivorState.Final) {
    return false;
  }
  if (pool.participants.length >= pool.settings.max_participants) {
    return false;
  }
  return !hasSettledWeek(pool);
}

export function spotsLeft(pool: SurvivorPool): number {
  return Math.max(0, pool.settings.max_participants - pool.participants.length);
}

/*
Whether a date's picks are public.

Read from the standings' own `revealed_weeks` rather than re-derived here, and
that is a change of approach worth stating. The rule itself is the backend's:
a date is public once its last game has started — nothing can change, so there
is nothing left for the secrecy to protect — and a pool whose owner turned
`public_picks` on also shows the date being played before then.

The first half of that depends on the league's schedule, which the browser does
not hold. A copy of the rule here could only guess at it, and a guess that said
"still private" over a revealed date, or the reverse, would have the screen
explaining the opposite of what the grid shows. So the payload decides and this
reads it; what is left here is the wording.
*/
export function arePicksRevealed(
  revealedWeeks: number[],
  week: SurvivorWeek,
): boolean {
  return revealedWeeks.includes(week.week);
}

export const aliveRows = (rows: SurvivorStandingRow[]) =>
  rows.filter((row) => row.status === ParticipantStatus.Alive);

/*
How many strikes a participant has left before the next loss puts them out.

`strikes_allowed` is how many they survive, so one allowed strike and none used
means two more losses are needed to go out — the one that is forgiven and the
one that is not.
*/
export function strikesRemaining(
  pool: SurvivorPool,
  participant: SurvivorUser,
): number {
  return Math.max(0, pool.settings.strikes_allowed - participant.strikes + 1);
}

/*
Why a participant cannot pick for a date at all, as a message key, or null when
they can.

Ordered the way a participant would ask: am I out, is it too late, is there
anything left to pick.

"Too late" is now two questions rather than one. `pickWindowClosed` is the
deadline the pool actually runs on — every game of the date has started, so
there is nothing left to pick — and `WeekStatus.Locked` is only reachable in a
pool whose owner closed a date by hand before that was the rule.

This answers for the whole date. A single team whose game has started is not in
here: the rest of the date is still open, and that tile says so for itself —
see `isTeamClosedByClock`.
*/
export function pickBlockedReasonKey(args: {
  week: SurvivorWeek;
  participant: SurvivorUser | null;
  eligibleTeamIds: number[] | null;
  isBlocked: boolean;
  pickWindowClosed: boolean;
}): string | null {
  const { week, participant, eligibleTeamIds, isBlocked, pickWindowClosed } =
    args;

  if (participant === null) {
    return "SurvivorNotAParticipant";
  }
  if (participant.status === ParticipantStatus.Eliminated) {
    return "SurvivorYouAreEliminated";
  }
  if (week.status === WeekStatus.Settled) {
    return "SurvivorWeekSettled";
  }
  if (week.status === WeekStatus.Locked) {
    return "SurvivorWeekClosed";
  }
  // Before "no games that day": a date whose games are all over has games, and
  // telling somebody there were none would be plainly wrong.
  if (pickWindowClosed) {
    return "SurvivorPicksClosedForDate";
  }
  if (eligibleTeamIds !== null && eligibleTeamIds.length === 0) {
    return "SurvivorNoGamesThatDay";
  }
  if (isBlocked) {
    return "SurvivorNoTeamLeftThisWeek";
  }
  return null;
}

/*
How a settled pick reads in the standings grid.

`Pending` and `Void` are both "nothing came of it", but they are not the same
thing to a participant: one is a date still to be settled, the other a game the
league never produced a result for. They are kept apart so the grid can say so.
*/
export const PICK_OUTCOME_TONE: Record<
  PickOutcome,
  "won" | "lost" | "void" | "pending"
> = {
  [PickOutcome.Won]: "won",
  [PickOutcome.Lost]: "lost",
  [PickOutcome.Void]: "void",
  [PickOutcome.Pending]: "pending",
};

/*
How an outcome is worded, wherever it is named.

One list, because three places name them — the standings cell, the week's chart
legend and its table view — and an outcome worded two ways in one screen reads
as two different things. It is also what keeps the chart's colours from being
the only channel that says which way a pick went.
*/
export const PICK_OUTCOME_LABEL_KEY: Record<PickOutcome, string> = {
  [PickOutcome.Won]: "SurvivorOutcomeWon",
  [PickOutcome.Lost]: "SurvivorOutcomeLost",
  [PickOutcome.Void]: "SurvivorOutcomeVoid",
  [PickOutcome.Pending]: "SurvivorOutcomePending",
};

/*
The teams playing a date, split into the ones open to this participant and the
ones their own earlier picks have closed.

Both halves are rendered — a team being closed, and why, is most of what the
pick screen has to tell somebody deep into a season.
*/
export interface TeamChoices {
  available: number[];
  used: number[];
}

export function splitTeamChoices(
  eligibleTeamIds: number[],
  availableTeamIds: number[],
): TeamChoices {
  const open = new Set(availableTeamIds);
  return {
    available: eligibleTeamIds.filter((teamId) => open.has(teamId)),
    used: eligibleTeamIds.filter((teamId) => !open.has(teamId)),
  };
}

/*
How one team's tile reads.

Four states, because there are four different things to tell somebody, and
three of them look like "you cannot have this":

- `picked`  — their pick for the date.
- `used`    — spent earlier in this pass through the league, and closed until
              they have been through the rest of it.
- `started`  — its game has begun. Open to them in every other sense, and shut
              by the clock. This is the state the per-game deadline added, and
              it is kept apart from `used` because the two are undone by
              completely different things.
- `open`    — pickable.

`used` is checked before `started` where a team is both: having spent a team is
the lasting reason and the one that answers "why can I never pick Toronto".
*/
export type TeamPickState = "picked" | "open" | "used" | "started";

/*
The clocks the standings carries, one per revealed date still waiting to be
settled.

Read through here rather than off the payload, because there are two shapes to
read: a backend newer than the per-date clocks sends `date_clocks`, and one
older sends a single `current_date` for the first unsettled date. The second is
the deploy window and nothing more, but a frontend that ignored it would stop
marking locked picks for the length of it.
*/
export function dateClocks(standings: {
  date_clocks?: DateClock[];
  current_date?: DateClock | null;
}): DateClock[] {
  if (standings.date_clocks !== undefined) {
    return standings.date_clocks;
  }
  return standings.current_date ? [standings.current_date] : [];
}

/*
The clock for one date, or null when it has none.

A date with no clock is one of three things, and none of them wants marking: it
has been settled, so its picks carry the outcome the settlement wrote; its
picks are not public, so it has no column at all; or the league's feed could
not be reached, in which case nothing is known and nothing is claimed.
*/
export function clockForWeek(
  clocks: DateClock[],
  week: number,
): DateClock | null {
  return clocks.find((clock) => clock.week === week) ?? null;
}

/*
How a pick reads in the standings grid.

A date reveals its picks at its first puck drop and keeps taking them until its
last, so a date being played holds a mix: picks whose team is already on the
ice and picks their owner is still free to change. Saying which is which is
most of what the reveal is worth before the games are over, and saying what the
finished games did is the rest of it.

Only an unsettled date is asked about. Every settled one has been played out,
so every pick on it is locked and marking them all would be noise down the
whole grid — which is why only those dates have a clock at all.

Four states, and the one this was written for is `provisional`: a Saturday's
games are over hours before anybody presses settle, and until the date carried
its results the grid showed a column of picks with nothing to say about any of
them.

  - `settled`     — the date has been settled and the pick carries what it
                    cost. The outcome is the one on the pick itself.
  - `provisional`  — the game is over and the league has a winner, but the date
                    has not been settled. The result is real; what it costs is
                    not recorded yet, and the screen says so.
  - `locked`      — the team is on the ice and the game has not produced a
                    result. The pick is in and nothing is known yet.
  - `open`        — the date is being played and this pick can still be moved.

`provisional` is checked before `locked` where both fit: a finished game has
started by definition, and the result is the more useful of the two things to
say. A pick whose own outcome is already recorded is `settled` whatever the
clock says — the settlement is the authority, and a feed that has since changed
its mind about a game does not get to rewrite it in the grid.
*/
export type PickCellState =
  | { kind: "settled"; outcome: PickOutcome }
  | { kind: "provisional"; outcome: PickOutcome.Won | PickOutcome.Lost }
  | { kind: "locked" }
  | { kind: "open" };

export function pickCellState(
  pick: RevealedPick,
  week: number,
  clocks: DateClock[],
): PickCellState {
  if (pick.outcome !== PickOutcome.Pending) {
    return { kind: "settled", outcome: pick.outcome };
  }

  const clock = clockForWeek(clocks, week);
  if (clock === null) {
    // No clock, and the pick is pending: a date whose results nothing has
    // reported. Reads as it did before any of this existed.
    return { kind: "settled", outcome: PickOutcome.Pending };
  }

  if (clock.won_team_ids?.includes(pick.team_id)) {
    return { kind: "provisional", outcome: PickOutcome.Won };
  }
  if (clock.lost_team_ids?.includes(pick.team_id)) {
    return { kind: "provisional", outcome: PickOutcome.Lost };
  }

  return clock.started_team_ids.includes(pick.team_id)
    ? { kind: "locked" }
    : { kind: "open" };
}

/*
Whether any date on the board is still moving, and so worth refetching.

What the standings polls on, and it has to be read off the clocks because the
payload carries no games: a date is in play when its first puck has dropped
and either more games are still to start, or one of the games that has started
has yet to produce a result.

Both halves matter. Without the first, a Saturday evening stops refreshing the
moment the afternoon games are final and never picks up the late ones; without
the second, a date whose last game is still being played is read as finished.
And a date that has begun, closed and decided everything is left alone — there
is nothing more to learn about it until somebody settles it.

False for a date that has not begun, which is what keeps a pool with public
picks from polling all week over a Saturday that has not arrived.
*/
export function hasDateInPlay(clocks: DateClock[]): boolean {
  return clocks.some((clock) => {
    if (clock.started_team_ids.length === 0) {
      return false;
    }
    if (clock.pick_window_closed !== true) {
      return true;
    }
    const decided = new Set([
      ...(clock.won_team_ids ?? []),
      ...(clock.lost_team_ids ?? []),
    ]);
    return clock.started_team_ids.some((teamId) => !decided.has(teamId));
  });
}

export function teamPickStates(options: {
  current_pick: number | null;
  available_team_ids: number[];
  started_team_ids?: number[];
}): (teamId: number) => TeamPickState {
  const open = new Set(options.available_team_ids);
  // Absent on a backend older than the deadline, which read as nothing having
  // started — the behaviour before a date closed itself.
  const started = new Set(options.started_team_ids ?? []);

  return (teamId: number) => {
    if (options.current_pick === teamId) {
      return "picked";
    }
    if (!open.has(teamId)) {
      return "used";
    }
    return started.has(teamId) ? "started" : "open";
  };
}

/*
Whether the date's games can be shown as matchups rather than as a plain grid
of teams.

Only when they account for exactly the teams the backend says are eligible.
Two things can make them disagree, and in both the eligible list is the one to
trust: a backend older than the matchups sends no games at all, and a locked
date takes its legal teams from the pool's own copy of the fixture list while
the games come from the league's feed, which may have moved one since. Showing
a game whose team cannot be picked, or hiding a team that can be, would both be
worse than the grid.
*/
export function matchupsCoverTeams(
  games: SurvivorGame[] | undefined,
  eligibleTeamIds: number[],
): boolean {
  if (games === undefined || games.length === 0) {
    return false;
  }

  const inGames = new Set(
    games.flatMap((game) => [game.away_team_id, game.home_team_id]),
  );
  const eligible = new Set(eligibleTeamIds);

  return (
    inGames.size === eligible.size &&
    [...eligible].every((teamId) => inGames.has(teamId))
  );
}

/*
The date's games: the one you are backing first, then the ones with something
still to pick, then the rest.

Pinning your own game to the top is what keeps the list still. Filing a pick
moves that team from `available_team_ids` into the used list, so without the
pin its game loses its "something to pick here" rank and drops away down the
page the instant you click it — the list reshuffling under the cursor, which
is what it did before.

The rest is the same reasoning the flat grid is ordered by: a participant deep
into a season has most of the board closed to them, and the few games they can
still act on should not be scattered among the ones they cannot.

The sort is stable, so games of equal rank keep the order the league gave them.
*/
export function orderMatchups(
  games: SurvivorGame[],
  availableTeamIds: number[],
  currentPick: number | null,
): SurvivorGame[] {
  const open = new Set(availableTeamIds);

  const rank = (game: SurvivorGame): number => {
    if (
      currentPick !== null &&
      (game.away_team_id === currentPick || game.home_team_id === currentPick)
    ) {
      return 0;
    }
    if (open.has(game.away_team_id) || open.has(game.home_team_id)) {
      return 1;
    }
    return 2;
  };

  return [...games].sort((left, right) => rank(left) - rank(right));
}

/*
The score to put on screen, or null when there is none worth showing.

A live game's score counts: it is what somebody watching wants, and it is the
reason the pick screen refetches while a game is on. What it must never do is
read as a result — that is `winnerOf`'s job, and it answers for finished games
only.
*/
export function displayScore(
  game: SurvivorGame,
): { home: number; away: number } | null {
  const showsAScore =
    game.state === SurvivorGameState.Live ||
    game.state === SurvivorGameState.Final;

  if (!showsAScore || game.home_score === null || game.away_score === null) {
    return null;
  }
  return { home: game.home_score, away: game.away_score };
}

/*
Which team won, or null while that is not yet a question with an answer.

Null for anything but a finished game, and null for a finished one the feed
left level — hockey settles a tie in overtime or a shootout, so that is a feed
not telling the whole story rather than a draw. The backend reaches the same
conclusion from the same rule before it eliminates anybody; this only decides
what the screen marks.
*/
export function winnerOf(game: SurvivorGame): number | null {
  if (game.state !== SurvivorGameState.Final) {
    return null;
  }

  const score = displayScore(game);
  if (score === null || score.home === score.away) {
    return null;
  }
  return score.home > score.away ? game.home_team_id : game.away_team_id;
}

export function isGameLive(game: SurvivorGame): boolean {
  return game.state === SurvivorGameState.Live;
}

/*
Whether anything on the date is being played.

What the pick screen polls on: a live score that is only fetched once is not a
live score, and a date with nothing on has no reason to be refetched.
*/
export function hasLiveGame(games: SurvivorGame[] | undefined): boolean {
  return (games ?? []).some(isGameLive);
}

/*
What a game's status line has to say, as a shape rather than a string.

The wording and the translation belong to the component; which of the four
cases applies, and from which fields, is a rule — a live game's clock is
counting down the intermission half the time, and a finished game that went to
overtime should say so.
*/
export type GameStatus =
  | { kind: "upcoming"; startTimeUtc: string | null }
  | {
      kind: "live";
      period: number | null;
      timeRemaining: string | null;
      inIntermission: boolean;
    }
  | { kind: "final"; wentPastRegulation: string | null }
  | { kind: "abandoned" };

/*
Normalised to null, because a field the backend simply left out arrives as
undefined and the shapes above promise null. The pick-options schema requires
nothing of a game but its two team ids, so this is the ordinary case rather
than a defensive one.
*/
const orNull = <T>(value: T | null | undefined): T | null => value ?? null;

export function gameStatus(game: SurvivorGame): GameStatus {
  switch (game.state) {
    case SurvivorGameState.Live:
      return {
        kind: "live",
        period: orNull(game.period),
        timeRemaining: orNull(game.time_remaining),
        inIntermission: game.in_intermission === true,
      };
    case SurvivorGameState.Final:
      return {
        kind: "final",
        // Only OT and SO are worth saying; a game that ended in regulation is
        // just "Final".
        wentPastRegulation:
          game.period_type === "OT" || game.period_type === "SO"
            ? game.period_type
            : null,
      };
    case SurvivorGameState.Abandoned:
      return { kind: "abandoned" };
    default:
      return { kind: "upcoming", startTimeUtc: orNull(game.start_time_utc) };
  }
}

/*
The value the "picking for" dropdown uses for the caller's own spot.

A sentinel rather than null because a select's value is a string. It never
leaves the screen: `pickingFor` is turned back into undefined before the
request, so a plain participant sends no participant id at all.
*/
export const MY_OWN_SPOT = "__me__";

/*
The subset of next-intl's `t` these labels need, taken as a parameter for the
same reason the settings form does it: the wording stays translated by the
caller's translator, and the rules stay testable without rendering anything.
*/
export type Translator = (
  key: string,
  values?: Record<string, number | string>,
) => string;

/*
How a pick date reads wherever it is named.

The number alone is not enough — "3" in a dropdown tells somebody nothing about
which Saturday they are picking for — so the date is part of the label, and a
settled date says so.
*/
export function weekLabel(t: Translator, week: SurvivorWeek): string {
  const name = `${t("SurvivorWeekLabel", { week: week.week })} — ${week.pick_date}`;

  return week.status === WeekStatus.Settled ? `${name} ✓` : name;
}

/*
How a participant reads in the "picking for" dropdown.

A managed spot is marked, because the organiser filing for one is doing
something different from filing their own and the dropdown is the only place
that says so.
*/
export function participantLabel(t: Translator, person: SurvivorUser): string {
  return person.is_owned
    ? person.name
    : `${person.name} ${t("SurvivorManagedSuffix")}`;
}

/*
An option in one of the survivor dropdowns.

Base UI needs the same label in two places — `items` on the root, which is what
the closed trigger renders, and the `SelectItem` that renders the row — so the
screens build one list and use it for both. Written out separately they drift,
and the way that shows up is a trigger reading `__me__` while the list below it
looks right.
*/
export interface SurvivorOption {
  value: string;
  label: string;
}

export function weekOptions(
  t: Translator,
  weeks: SurvivorWeek[],
): SurvivorOption[] {
  return weeks.map((week) => ({
    value: String(week.week),
    label: weekLabel(t, week),
  }));
}

/*
The spots the caller may file a pick for: their own, then anybody else in the
pool.

Their own spot is a sentinel rather than their id, so a plain participant sends
no participant id at all. They are dropped from the rest of the list because
they are already its first entry.
*/
export function pickingForOptions(
  t: Translator,
  participants: SurvivorUser[],
  ownId: string | null | undefined,
): SurvivorOption[] {
  return [
    { value: MY_OWN_SPOT, label: t("SurvivorMyself") },
    ...participants
      .filter((person) => person.id !== ownId)
      .map((person) => ({
        value: person.id,
        label: participantLabel(t, person),
      })),
  ];
}

/*
The dates whose picks the standings should show, given the one in view.

Everything revealed up to and including it: a date further on is either still
open — and showing it would hand somebody the field before they pick — or
simply not what is being looked at.
*/
export function revealedWeeksUpTo(
  revealedWeeks: number[],
  selectedWeek: number | null,
): number[] {
  if (selectedWeek === null) {
    return revealedWeeks;
  }
  return revealedWeeks.filter((week) => week <= selectedWeek);
}
