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
  // Still accepting picks, and showing nobody anybody else's.
  Open = "Open",
  // Past its deadline: picks are revealed and no longer change.
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
export interface SurvivorPickOptions {
  week: number;
  pick_date: string;
  eligible_team_ids: number[];
  available_team_ids: number[];
  used_team_ids: number[];
  current_pick: number | null;
  // True when nothing is open to them, in which case the date costs them
  // nothing.
  is_blocked: boolean;
  can_pick: boolean;
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
  // Their pick per revealed date, keyed by week number. An open date is absent
  // rather than blank: a payload carrying it would reveal it.
  picks: Record<string, RevealedPick>;
}

export interface SurvivorStandings {
  pool_name: string;
  status: SurvivorState;
  alive_count: number;
  eliminated_count: number;
  revealed_weeks: number[];
  rows: SurvivorStandingRow[];
  winners: string[] | null;
}
