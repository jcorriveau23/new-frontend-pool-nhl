/*
What a survivor date looked like once its picks were revealed.

The standard numbers a survivor pool asks about a week: how the field spread
across the teams, which way the popular picks went, and how many people it took
out. All of it is derived from the standings payload the page already holds —
one row per participant, with their pick per revealed date — so reading a week
costs no extra request.

Kept out of the chart for the usual reason: the counting is a rule and the
rendering is not. The chart decides nothing about who was in the field.
*/

import {
  DateClock,
  ParticipantStatus,
  PickOutcome,
  SurvivorStandingRow,
} from "@/data/survivor/model";

/// One team, and how much of the field was on it.
export interface TeamPickTally {
  teamId: number;
  count: number;
  // Of the picks actually made, not of the field: the people who did not pick
  // are their own number, and dividing by the field would make every share
  // smaller than it reads on the chart.
  share: number;
  outcome: PickOutcome;
}

export interface SurvivorWeekStats {
  week: number;
  /*
  Participants who were still standing going into the date.

  Not the whole pool. A pool in March has people who went out in October, and
  measuring a date against them would make every week look like half the field
  forgot to pick.
  */
  fieldSize: number;
  picksMade: number;
  // Of the field, how many let the date go by without a pick. Which is not the
  // same as being penalised for it — somebody with no unused team playing that
  // day had nothing to pick and it costs them nothing.
  noPick: number;
  // Eliminated *by* this date, which the standings records exactly.
  eliminated: number;
  // Teams the field was on, most-picked first.
  teams: TeamPickTally[];
  byOutcome: Record<PickOutcome, number>;
  // What the field was most on, or null when nobody picked at all.
  mostPicked: TeamPickTally | null;
}

/*
Whether `row` was still in the pool going into `week`.

Somebody eliminated in week 3 played week 3 and went out on it, so they are
part of that week's field and not of week 4's.
*/
function wasInTheField(row: SurvivorStandingRow, week: number): boolean {
  if (row.status === ParticipantStatus.Alive) {
    return true;
  }
  return row.eliminated_week !== null && row.eliminated_week >= week;
}

/*
The outcome to show for a team, given every pick that backed it and the date's
own clock.

The picks agree with each other in practice — settling a date writes one result
per team across all of its picks — so what this really decides is what to show
before the settlement has run. In order: a recorded outcome wins, so a
half-written settlement reads as the result rather than as unsettled; then the
clock, which is the league's own answer for a game that is over on a date
nobody has settled; and `Pending` only when neither has anything to say.

The clock half is why this takes one at all. Without it the dialog would say
"not settled" about every team on a date whose results the grid behind it is
already showing — the same screen contradicting itself.
*/
function outcomeOf(
  picks: PickOutcome[],
  teamId: number,
  clock: DateClock | null,
): PickOutcome {
  const recorded = picks.find((outcome) => outcome !== PickOutcome.Pending);
  if (recorded !== undefined) {
    return recorded;
  }
  if (clock?.won_team_ids?.includes(teamId)) {
    return PickOutcome.Won;
  }
  if (clock?.lost_team_ids?.includes(teamId)) {
    return PickOutcome.Lost;
  }
  return PickOutcome.Pending;
}

export function survivorWeekStats(
  rows: SurvivorStandingRow[],
  week: number,
  // The date's clock, when it is one still waiting to be settled. Null for a
  // settled date, whose picks carry their own outcome.
  clock: DateClock | null = null,
): SurvivorWeekStats {
  const field = rows.filter((row) => wasInTheField(row, week));

  /*
  Picks are taken from the field only, which drops one real case: a pick filed
  ahead for a later date by somebody who was eliminated before it came round.
  Those picks are still in the payload and counting them would put a dead
  participant in a week they never played.
  */
  const picks = field
    .map((row) => row.picks[String(week)])
    .filter((pick) => pick !== undefined);

  const byTeam = new Map<number, PickOutcome[]>();
  for (const pick of picks) {
    const outcomes = byTeam.get(pick.team_id);
    if (outcomes === undefined) {
      byTeam.set(pick.team_id, [pick.outcome]);
    } else {
      outcomes.push(pick.outcome);
    }
  }

  const teams: TeamPickTally[] = [...byTeam.entries()]
    .map(([teamId, outcomes]) => ({
      teamId,
      count: outcomes.length,
      share: outcomes.length / picks.length,
      outcome: outcomeOf(outcomes, teamId, clock),
    }))
    // Most picked first — the popularity story is what the chart is for. Ties
    // break on the team id so the bars keep their order between renders
    // instead of shuffling on every refetch.
    .sort(
      (left, right) => right.count - left.count || left.teamId - right.teamId,
    );

  const byOutcome: Record<PickOutcome, number> = {
    [PickOutcome.Won]: 0,
    [PickOutcome.Lost]: 0,
    [PickOutcome.Void]: 0,
    [PickOutcome.Pending]: 0,
  };
  for (const team of teams) {
    byOutcome[team.outcome] += team.count;
  }

  return {
    week,
    fieldSize: field.length,
    picksMade: picks.length,
    noPick: field.length - picks.length,
    eliminated: rows.filter((row) => row.eliminated_week === week).length,
    teams,
    byOutcome,
    mostPicked: teams[0] ?? null,
  };
}

/*
The outcomes present in a week, in a fixed order.

The legend is built from this rather than from every outcome the enum has: a
date nobody lost on should not carry a "Lost" key, and the order stays the same
whichever ones turn up.
*/
const OUTCOME_ORDER: PickOutcome[] = [
  PickOutcome.Won,
  PickOutcome.Lost,
  PickOutcome.Void,
  PickOutcome.Pending,
];

export function outcomesPresent(stats: SurvivorWeekStats): PickOutcome[] {
  return OUTCOME_ORDER.filter((outcome) => stats.byOutcome[outcome] > 0);
}
