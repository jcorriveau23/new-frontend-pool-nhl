export interface SkaterStats {
    assists: number;
    goals: number;
    shootoutGoals: number;
}

export interface GoalieStats {
    assists: number;
    goals: number;
    decision?: string | null;
    savePercentage?: number | null;
}

export interface DailySkater {
    name: string;
    id: number;
    team: number;
    stats: SkaterStats;
}

export interface DailyGoalie {
    name: string;
    id: number;
    team: number;
    stats: GoalieStats;
}

export interface DailyLeaders {
    date: string;
    goalies: DailyGoalie[];
    skaters: DailySkater[];
    played: number[];
}