/*
The survivor pool, as the Rust backend sends it.

A survivor pool is a different game from the roster pool in `@/data/pool/model`:
no draft, no roster, no scoring. Every Saturday each participant names one team
they think will win that day. Right and you go through, wrong and you are out,
and a team you have already used is closed to you until you have been through
the whole league.

These mirror `crates/poolnhl_interface/src/survivor/`. The picks are not in the
pool document — they are their own collection, fetched per date — which is what
lets a pool hold hundreds of people without a Saturday morning of picks
contending for one document.
*/

export enum SurvivorState {
  Created = "Created",
  InProgress = "InProgress",
  Final = "Final",
}

export enum ParticipantStatus {
  Alive = "Alive",
  Eliminated = "Eliminated",
}

export enum PickOutcome {
  // The date has not been settled yet.
  Pending = "Pending",
  Won = "Won",
  Lost = "Lost",
  // The game never produced a result — postponed, or unplayed when the date was
  // settled. Costs the participant nothing.
  Void = "Void",
}

export enum WeekStatus {
  // Not settled yet. Whether it is still taking picks is a question for the
  // clock rather than for this field: a team can be picked until its own game
  // starts, so the date closes when the last of its games does. The backend
  // answers that with `pick_window_closed` on the pick screen, and by leaving
  // a date out of the standings' `revealed_weeks` until it has passed.
  Open = "Open",
  // Closed to picks by the owner, back when that was a button on the admin
  // screen. Nothing produces it any more; pools played under the old rule
  // carry it, and it still means what it meant — closed, picks public.
  Locked = "Locked",
  // Results are in and eliminations have been applied.
  Settled = "Settled",
}

export interface SurvivorSettings {
  assistants: string[];
  max_participants: number;
  // Losses a participant survives. 0 is classic survivor: one wrong pick is out.
  strikes_allowed: number;
  // Whether failing to pick costs a strike, or eliminates outright.
  missed_pick_is_strike: boolean;
  allow_pick_change: boolean;
  // Whether the date being played shows everybody's pick or only your own.
  // False is the classic game: a date's picks stay private until it locks.
  public_picks: boolean;
  // Teams in the league, which decides when a participant has been through them
  // all and their used list resets.
  league_team_count: number;
}

export interface SurvivorUser {
  id: string;
  name: string;
  status: ParticipantStatus;
  strikes: number;
  eliminated_week: number | null;
  date_joined: number;
  // Whether this is somebody signed in under their own account, or a spot the
  // organiser keeps on their behalf. A managed spot has no account, so the
  // organiser files its picks too.
  is_owned: boolean;
}

export interface SurvivorWeek {
  // 1-based, and the key a pick carries.
  week: number;
  // The Saturday this week's games are played on, yyyy-MM-dd.
  pick_date: string;
  status: WeekStatus;
  // Teams with a game that day. Empty until the schedule has been read.
  eligible_team_ids: number[];
  settled_at: number | null;
}

/*
An invitation, filed by the pool owner, for whoever signs in with a given email
address to take one of the pool's spots over.

The counterpart of `PendingPoolerLink` on the roster pool, and for the same
reason: a spot the organiser entered by hand has no account behind it, so the
person it stands for cannot pick for themselves. The owner cannot attach an
account alone either — the app has no user directory to resolve an address
with, and taking a spot over is the taker's call.

The address itself is never in the pool, which anybody in it can read. The hash
is, so recognising an invitation as yours means hashing the address you signed
in with and comparing.
*/
export interface PendingParticipantLink {
  participant_id: string;
  email_hash: string;
  // A redacted address ("vi***t@example.com"), for the owner to recognise what
  // they filed.
  email_hint: string;
  requested_by: string;
  date_requested: number;
}

export interface SurvivorPool {
  name: string;
  owner: string;
  settings: SurvivorSettings;
  status: SurvivorState;
  participants: SurvivorUser[];
  weeks: SurvivorWeek[];
  // Whoever was left when the pool ended. More than one when a date took out
  // everybody still standing — they share it.
  winners: string[] | null;
  // Invitations waiting on the person they name to sign in and accept them.
  // Absent on every pool that has never had one filed.
  pending_participant_links?: PendingParticipantLink[] | null;
  date_updated: number;
  season: number;
  season_start: string;
  season_end: string;
}

export interface SurvivorPoolShort {
  name: string;
  owner: string;
  status: SurvivorState;
  season: number;
  participant_count: number;
  max_participants: number;
}

/*
What a participant needs to pick: the teams playing, the ones still open to
them, and the pick they already have in.

`available_team_ids` is decided by the backend with the same function the pick
itself is validated against, so the greyed-out teams and the refusals cannot
disagree.
*/
export enum SurvivorGameState {
  // Not started.
  Upcoming = "Upcoming",
  // Being played. Its score is worth showing and decides nothing yet.
  Live = "Live",
  // Over. Its score will not change.
  Final = "Final",
  // Postponed or cancelled. Costs whoever picked either side nothing.
  Abandoned = "Abandoned",
}

/*
One of the date's games.

Display only. Who beat whom is decided inside the backend from the league's own
feed, and a locked date's legal teams come from the pool's own copy of the
fixture list — this is here so somebody picking can see who a team is up
against, how the game is going, and who won once it is over.
*/
export interface SurvivorGame {
  home_team_id: number;
  away_team_id: number;
  // As the league reported it. Null for a game still to come, and real but not
  // yet meaning anything while the game is live: `state` is what tells those
  // apart, and nothing is decided until it is Final.
  home_score: number | null;
  away_score: number | null;
  state: SurvivorGameState;
  // When the puck drops, RFC 3339, for a game still to come.
  start_time_utc: string | null;
  // The period being played, or the one a finished game ended in.
  period: number | null;
  // REG, OT or SO, so a game settled past regulation can say so.
  period_type: string | null;
  // Left in the period. Only meaningful while the game is live.
  time_remaining: string | null;
  in_intermission: boolean;
}

export interface SurvivorPickOptions {
  week: number;
  pick_date: string;
  eligible_team_ids: number[];
  available_team_ids: number[];
  used_team_ids: number[];
  /*
  Of the teams playing, the ones whose game has already started.

  Closed to a pick however much of this participant's own list is still open,
  and kept apart from `used_team_ids` because the screen has to say which of
  the two reasons applies: a used team is closed for the rest of the cycle, a
  started one was closed by the clock.

  Optional for the same reason `games` is — a backend older than the deadline
  does not send it — and absent reads as "none", which is how the screen
  behaved before.
  */
  started_team_ids?: number[];
  current_pick: number | null;
  // True when nothing is open to them, in which case the date costs them
  // nothing. The used-team rule only: having let the deadline pass is not the
  // same as having had nothing to pick, and only the second is forgiven.
  is_blocked: boolean;
  can_pick: boolean;
  /*
  True once the date's first game has started, which is when its picks go
  public.

  With `pick_window_closed` still false it marks the middle of a date: the
  field's picks are on show, your own is locked or not depending on whether
  your team has taken the ice, and the teams yet to play are still open. The
  screens say so rather than leaving somebody to work it out.

  Optional like `started_team_ids`, for a backend older than the rule.
  */
  date_has_begun?: boolean;
  // True once every game of the date has started, so nothing is left to pick.
  // Optional like `started_team_ids`.
  pick_window_closed?: boolean;
  /*
  The date's games.

  Optional, and not because the field is: a backend older than the matchups
  does not send it, and the deployed one can be behind this frontend. Absent
  and the screen falls back to the plain grid of teams.
  */
  games?: SurvivorGame[];
}

export interface SurvivorPickView {
  participant_id: string;
  week: number;
  team_id: number;
  outcome: PickOutcome;
}

export interface RevealedPick {
  team_id: number;
  outcome: PickOutcome;
}

export interface SurvivorStandingRow {
  participant_id: string;
  name: string;
  status: ParticipantStatus;
  strikes: number;
  eliminated_week: number | null;
  wins: number;
  // Their pick per revealed date, keyed by week number. A date still taking
  // picks is absent rather than blank: a payload carrying it would reveal it.
  picks: Record<string, RevealedPick>;
}

/*
A date whose picks are public but whose results have not been applied, and how
far the clock has got through it.

One per such date rather than one for the pool. Usually that is one — the
Saturday being played — but settling is a button somebody has to press, and an
organiser a week behind leaves two: the date nobody settled and the date being
played. Keyed by week so the grid marks each column for itself.

What it carries is everything about a column the pool document cannot answer,
because it comes from the league's schedule: which picks can still move, and
which of them the games have already decided.
*/
export interface DateClock {
  week: number;
  // Teams whose game has started. A pick on one of these is locked. Empty
  // before the first puck drop, and empty when the league's feed could not be
  // reached, in which case the grid marks nothing rather than calling a pick
  // final before it is.
  started_team_ids: number[];
  /*
  Teams that have won their game on this date, and teams that have lost it, as
  the league's feed reads now.

  This is the result *before* the settlement, and it is what the grid shows on
  a date the owner has yet to settle — a Saturday's games are over hours
  before anybody presses the button. A team in neither list has not finished
  its game, or finished it without a result the feed could be read from.

  Display only. What a pick cost — a strike, an elimination, a win in the
  standings — is the settlement's to decide, so none of the counts move until
  it runs.

  Optional for the usual reason: a backend older than the rule sends neither,
  and absent reads as "nothing decided", which is how the grid behaved before.
  */
  won_team_ids?: number[];
  lost_team_ids?: number[];
  // Whether every game of the date has started, so nothing is left to pick.
  // Read by the page deciding whether the date is still moving and so worth
  // refetching, not by the cells.
  pick_window_closed?: boolean;
}

export interface SurvivorStandings {
  pool_name: string;
  status: SurvivorState;
  alive_count: number;
  eliminated_count: number;
  revealed_weeks: number[];
  rows: SurvivorStandingRow[];
  winners: string[] | null;
  /*
  The revealed dates still waiting to be settled, in week order.

  Empty once every revealed date has been settled, and empty for a pool that is
  over. Everything a column of the grid shows beyond the pick itself comes from
  here — read through `dateClocks`, which is also what reads the single
  `current_date` a backend older than this sent in its place.
  */
  date_clocks?: DateClock[];
  /*
  What `date_clocks` replaced: one clock, for the first unsettled date.

  Still read, so a frontend deployed ahead of the backend keeps marking the
  picks that can no longer move. Nothing but `dateClocks` should look at it.
  */
  current_date?: DateClock | null;
}
