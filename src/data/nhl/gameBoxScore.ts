export interface PlayerName {
  default: string;
}

export interface SkaterStats {
  playerId: number;
  sweaterNumber: number;
  name: PlayerName;
  position: string;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  pim?: number | null;
  hits: number;
  powerPlayGoals: number;
  sog: number;
  faceoffWinningPctg: number;
  blockedShots?: number;
  shifts?: number;
  giveaways?: number;
  takeaways?: number;
  toi: string;
}

export interface GoalieStats {
  playerId: number;
  sweaterNumber: number;
  name: PlayerName;
  position: string;
  evenStrengthShotsAgainst: string;
  powerPlayShotsAgainst: string;
  shorthandedShotsAgainst: string;
  saveShotsAgainst: string;
  savePctg?: string | number | null;
  evenStrengthGoalsAgainst: number;
  powerPlayGoalsAgainst: number;
  shorthandedGoalsAgainst: number;
  pim?: number | null;
  goalsAgainst: number;
  shotsAgainst?: number;
  saves?: number;
  starter?: boolean;
  toi: string;
}

export interface TeamBoxScore {
  forwards: SkaterStats[];
  defense: SkaterStats[];
  goalies: GoalieStats[];
}

export interface PlayerByGameStats {
  awayTeam: TeamBoxScore;
  homeTeam: TeamBoxScore;
}

export interface BoxScoreTeam {
  id: number;
  commonName?: { default: string };
  abbrev?: string;
  score?: number | null;
  sog?: number | null;
  logo: string;
  darkLogo?: string;
  placeName?: { default: string; fr?: string };
}

export interface GameOutcome {
  lastPeriodType: string;
}

export interface GameBoxScore {
  id: number;
  gameState: string;
  gameType?: number;
  awayTeam: BoxScoreTeam;
  homeTeam: BoxScoreTeam;
  gameOutcome?: GameOutcome;
  playerByGameStats?: PlayerByGameStats | null;
}
