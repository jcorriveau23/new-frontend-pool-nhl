import { TeamInfo } from "./shared";

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
    shots: number;
    faceoffWinningPctg: number;
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
    savePctg?: string | null;
    evenStrengthGoalsAgainst: number;
    powerPlayGoalsAgainst: number;
    shorthandedGoalsAgainst: number;
    pim?: number | null;
    goalsAgainst: number;
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

export interface GameBoxScore {
    id: number;
    awayTeam: TeamInfo;
    homeTeam: TeamInfo;
    playerByGameStats: PlayerByGameStats;
}