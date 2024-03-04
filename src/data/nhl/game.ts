
import { TeamInfo } from "./shared";

export enum GameState {
  OFF = "OFF",
  LIVE = "LIVE",
  FUT = "FUT",
  PPD = "PPD",
  PRE = "PRE",
  CRIT = "CRIT",
  FINAL = "FINAL",
}
  
export interface TimeRemaining {
  timeRemaining: string;
  running: boolean;
  inIntermission: boolean;
}

export interface PeriodDescriptor {
  number: number;
  periodType: string;
}


export interface Game {
  id: number;
  startTimeUTC: string;
  gameState: GameState;
  awayTeam: TeamInfo;
  homeTeam: TeamInfo;
  period?: number | null; // Optional field
  periodDescriptor?: PeriodDescriptor | null; // Optional field
  clock?: TimeRemaining | null; // Optional field
}