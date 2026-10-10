/*
What the survivor screens derive from a pool.

Kept out of the components so the rules the UI shows — which date is being
played, whether you may still pick, why a team is closed to you — are testable
and stated once. The authoritative versions of these rules live in the Rust
model; these decide what to render, never what is allowed.
*/

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
  return !pool.weeks.some((week) => week.status === WeekStatus.Settled);
}

export function spotsLeft(pool: SurvivorPool): number {
  return Math.max(0, pool.settings.max_participants - pool.participants.length);
}

/*
Whether a date's picks are public.

An open date shows a participant nothing but their own pick: knowing what the
field is on before you pick is the one thing that would take the guesswork, and
so the game, out of a survivor pool.
*/
export function arePicksRevealed(week: SurvivorWeek): boolean {
  return week.status !== WeekStatus.Open;
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
Why a participant cannot pick for a date, as a message key, or null when they
can.

Ordered the way a participant would ask: am I out, is it too late, is there
anything left to pick.
*/
export function pickBlockedReasonKey(
  week: SurvivorWeek,
  participant: SurvivorUser | null,
  eligibleTeamIds: number[] | null,
  isBlocked: boolean,
): string | null {
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
    return "SurvivorWeekLocked";
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
