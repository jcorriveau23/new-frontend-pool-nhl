import { TeamInfo } from "./shared";

export interface Name {
  default: string;
}

export interface Assist {
  playerId: number;
  firstName: Name;
  lastName: Name;
  assistsToDate: number;
}

export interface Goal {
  strength: string;
  playerId: number;
  firstName: Name;
  lastName: Name;
  headshot: string;
  teamAbbrev: Name;
  goalsToDate: number;
  awayScore: number;
  homeScore: number;
  timeInPeriod: string;
  assists: Assist[];
}

export enum PeriodType {
  REG = "REG",
  OT = "OT",
  SO = "SO",
}

export interface PeriodDescriptor {
  number: number;
  periodType: PeriodType;
}

export interface PeriodScoring {
  periodDescriptor: PeriodDescriptor;
  goals: Goal[];
}

export enum  ShootoutResult {
    save = "save",
    goal = "goal",
}

export interface ShootoutInfo {
  sequence: number;
  playerId: number;
  teamAbbrev: string;
  firstName: string;
  lastName: string;
  result: string;
}

export interface PeriodScore {
  away: number;
  home: number;
  periodDescriptor: PeriodDescriptor;
}

export interface TotalScore {
  away: number;
  home: number;
}

export interface Linescore {
  byPeriod: PeriodScore[];
  totals: TotalScore;
}

export interface TeamGameStats {
  category: string;
  awayValue: string;
  homeValue: string;
}

export interface GameSummary {
  linescore: Linescore;
  scoring: PeriodScoring[];
  shootout: ShootoutInfo[];
  teamGameStats: TeamGameStats[];
}

export interface GameLanding {
  id: number;
  awayTeam: TeamInfo;
  homeTeam: TeamInfo;
  summary: GameSummary;
}