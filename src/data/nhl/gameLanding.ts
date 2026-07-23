export enum PeriodType {
  REG = "REG",
  OT = "OT",
  SO = "SO",
}

export interface Venue {
  default: string;
  fr?: string;
}

export interface PeriodDescriptor {
  number: number;
  periodType: PeriodType;
  maxRegulationPeriods: number;
}

export interface Broadcast {
  id: number;
  market: string;
  countryCode: string;
  network: string;
  sequenceNumber: number;
}

export interface Team {
  id: number;
  commonName: { default: string };
  abbrev: string;
  placeName: { default: string; fr?: string };
  placeNameWithPreposition: { default: string; fr?: string };
  score: number;
  sog: number;
  logo: string;
  darkLogo?: string;
  record?: string;
}

export interface PlayerName {
  default: string;
  cs?: string;
  fi?: string;
  sk?: string;
}

export interface Assist {
  playerId: number;
  firstName: { default: string };
  lastName: { default: string };
  name: { default: string };
  assistsToDate: number;
}

export interface Goal {
  situationCode: string;
  strength: string;
  playerId: number;
  firstName: { default: string };
  lastName: { default: string };
  name: { default: string };
  teamAbbrev: { default: string };
  headshot: string;
  highlightClipSharingUrl: string;
  highlightClip: number;
  discreteClip: number;
  goalsToDate: number;
  awayScore: number;
  homeScore: number;
  leadingTeamAbbrev: { default: string };
  timeInPeriod: string;
  shotType: string;
  goalModifier: string;
  assists: Assist[];
  pptReplayUrl: string;
}

export interface Scoring {
  periodDescriptor: PeriodDescriptor;
  goals: Goal[];
}

export interface ShootoutAttempt {
  sequence: number;
  playerId: number;
  teamAbbrev: { default: string };
  firstName: { default: string };
  lastName: { default: string };
  shotType: string;
  result: string;
  headshot: string;
  gameWinner: boolean;
}

export interface StarPlayer {
  star: number;
  playerId: number;
  teamAbbrev: string;
  headshot: string;
  name: { default: string; cs?: string; fi?: string; sk?: string };
  sweaterNo: number;
  position: string;
  goalsAgainstAverage?: number;
  savePctg?: number;
  goals?: number;
  assists?: number;
  points?: number;
}

export interface PenaltyPlayer {
  firstName: { default: string };
  lastName: { default: string };
  sweaterNumber: number;
}

export interface Penalty {
  timeInPeriod: string;
  type: string;
  duration: number;
  committedByPlayer?: PenaltyPlayer;
  teamAbbrev: { default: string };
  drawnBy?: PenaltyPlayer;
  // Bench/served penalties expose the player as a pre-formatted name only.
  servedBy?: { default: string };
  descKey: string;
}

export interface PenaltyPeriod {
  periodDescriptor: PeriodDescriptor;
  penalties: Penalty[];
}

export interface Events {
  events: ShootoutAttempt[];
}

export interface Summary {
  scoring: Scoring[];
  shootout: Events;
  threeStars: StarPlayer[];
  penalties: PenaltyPeriod[];
}

export interface Clock {
  timeRemaining: string;
  secondsRemaining: number;
  running: boolean;
  inIntermission: boolean;
}

// --- Pre-game "matchup" preview (present when a game has not started) ---

export interface MatchupPlayer {
  playerId: number;
  name: PlayerName;
  firstName?: { default: string };
  lastName?: { default: string };
  sweaterNumber: number;
  positionCode: string;
  headshot: string;
  value: number;
}

export interface SkaterComparisonLeader {
  category: string; // e.g. "points" | "goals" | "assists"
  awayLeader: MatchupPlayer;
  homeLeader: MatchupPlayer;
}

export interface SkaterComparison {
  contextLabel: string;
  contextSeason: number;
  leaders: SkaterComparisonLeader[];
}

export interface GoalieComparisonPlayer {
  playerId: number;
  name: PlayerName;
  sweaterNumber: number;
  headshot: string;
  positionCode: string;
  gamesPlayed: number;
  record: string;
  gaa: number;
  savePctg: number;
  shutouts: number;
}

export interface GoalieTeamTotals {
  record: string;
  gaa: number;
  savePctg: number;
  shutouts: number;
  gamesPlayed: number;
}

export interface GoalieTeamComparison {
  teamTotals: GoalieTeamTotals;
  leaders: GoalieComparisonPlayer[];
}

export interface GoalieComparison {
  contextLabel: string;
  contextSeason: number;
  awayTeam: GoalieTeamComparison;
  homeTeam: GoalieTeamComparison;
}

export interface SkaterSeasonStat {
  playerId: number;
  teamId: number;
  sweaterNumber?: number;
  name: PlayerName;
  position: string;
  gamesPlayed?: number;
  goals?: number;
  assists?: number;
  points?: number;
  plusMinus?: number;
  pim?: number;
  avgPoints?: number;
  avgTimeOnIce?: string;
  gameWinningGoals?: number;
  shots?: number;
  shootingPctg?: number;
  faceoffWinningPctg?: number;
  powerPlayGoals?: number;
  blockedShots?: number;
  hits?: number;
}

export interface GoalieSeasonStat {
  playerId: number;
  teamId: number;
  sweaterNumber?: number;
  name: PlayerName;
  gamesPlayed?: number;
  wins?: number;
  losses?: number;
  otLosses?: number;
  shotsAgainst?: number;
  goalsAgainst?: number;
  goalsAgainstAvg?: number;
  savePctg?: number;
  shutouts?: number;
  saves?: number;
  toi?: string;
}

export interface SkaterSeasonStats {
  contextLabel: string;
  contextSeason: number;
  skaters: SkaterSeasonStat[];
}

export interface GoalieSeasonStats {
  contextLabel: string;
  contextSeason: number;
  goalies: GoalieSeasonStat[];
}

export interface Matchup {
  season: number;
  gameType: number;
  skaterComparison: SkaterComparison;
  goalieComparison: GoalieComparison;
  skaterSeasonStats?: SkaterSeasonStats;
  goalieSeasonStats?: GoalieSeasonStats;
}

export interface GameLanding {
  id: number;
  season: number;
  gameType: number;
  limitedScoring: boolean;
  gameDate: string;
  venue: Venue;
  venueLocation: Venue;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  venueTimezone: string;
  periodDescriptor: PeriodDescriptor;
  tvBroadcasts: Broadcast[];
  gameState: string;
  gameScheduleState: string;
  ticketsLink?: string;
  awayTeam: Team;
  homeTeam: Team;
  shootoutInUse: boolean;
  maxPeriods: number;
  regPeriods: number;
  otInUse: boolean;
  tiesInUse: boolean;
  summary?: Summary;
  matchup?: Matchup;
  clock: Clock;
}
