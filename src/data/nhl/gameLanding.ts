
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
  teamAbbrev: string;
  firstName: string;
  lastName: string;
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

export interface Penalty {
  timeInPeriod: string;
  type: string;
  duration: number;
  committedByPlayer: string;
  teamAbbrev: { default: string };
  drawnBy: string;
  descKey: string;
}

export interface PenaltyPeriod {
  periodDescriptor: PeriodDescriptor;
  penalties: Penalty[];
}

export interface Summary {
  scoring: Scoring[];
  shootout: ShootoutAttempt[];
  threeStars: StarPlayer[];
  penalties: PenaltyPeriod[];
}

export interface Clock {
  timeRemaining: string;
  secondsRemaining: number;
  running: boolean;
  inIntermission: boolean;
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
  awayTeam: Team;
  homeTeam: Team;
  shootoutInUse: boolean;
  maxPeriods: number;
  regPeriods: number;
  otInUse: boolean;
  tiesInUse: boolean;
  summary: Summary;
  clock: Clock;
}