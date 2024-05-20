export interface ProjectedPoolShort {
    name: string;
    owner: string;
    status: PoolState;
}

export interface PlayerTypeSettings {
    forwards: number,
    defense: number,
    goalies: number,
}


export interface DynastieSettings {
    next_season_number_players_protected: number;
    tradable_picks: number;
}

export interface SkaterSettings {
    points_per_goals: number,
    points_per_assists: number,
    points_per_hattricks: number,
    points_per_shootout_goals: number,
}

export interface GoaliesSettings {
    points_per_wins: number,
    points_per_shutouts: number,
    points_per_overtimes: number,
    points_per_goals: number,
    points_per_assists: number,
}

export enum DraftType {
    // In Serpentine, every round the order gets reversed,
    // the impact of having the first pick is less an advantage than in standard mode.
    // In dynasty mode, serpentine will be applied for the initial draft only. (Not for following years)
    SERPENTINE = "Serpentine",
  
    STANDARD = "Standard",
  }
  

export interface PoolSettings {
    number_poolers: number,
    draft_type: DraftType,

    assistants: string[];
    number_forwards: number;
    number_defenders: number;
    number_goalies: number;
    number_reservists: number;
    roster_modification_date: string[];

    forwards_settings: SkaterSettings;
    defense_settings: SkaterSettings;
    goalies_settings: GoaliesSettings;
    
    can_trade: boolean;
    ignore_x_worst_players:  PlayerTypeSettings | null;
    dynastie_settings: DynastieSettings | null;
}

export interface Pool {
    name: string;
    owner: string;
    number_poolers: number;
    participants: string[] | null;
    settings: PoolSettings;
    status: PoolState;
    final_rank: string[] | null;
    nb_player_drafted: number;
    nb_trade: number;
    trades: Trade[] | null;
    context: PoolContext | null;
    date_updated: number;
    season_start: string;
    season_end: string;
}

export enum PoolState {
    Final = 'Final',
    InProgress = 'InProgress',
    Dynastie = 'Dynastie',
    Draft = 'Draft',
    Created = 'Created',
}

export interface PoolContext {
    pooler_roster: Record<string, PoolerRoster>;
    players_name_drafted: number[];
    score_by_day: Record<string, Record<string, DailyRosterPoints>> | null;
    tradable_picks: Record<string, string>[] | null;
    past_tradable_picks: Record<string, string>[] | null;
    players: Record<string, Player>;
}

export interface PoolerRoster {
    chosen_forwards: number[];
    chosen_defenders: number[];
    chosen_goalies: number[];
    chosen_reservists: number[];
}

export interface DailyRosterPoints {
    roster: Roster;
    is_cumulated: boolean;
}

export interface Roster {
    F: Record<string, SkaterPoints | null>;
    D: Record<string, SkaterPoints | null>;
    G: Record<string, GoaliePoints | null>;
}

export interface SkaterPoints {
    G: number;
    A: number;
    SOG?: number | null;
}

export interface GoaliePoints {
    G: number;
    A: number;
    W: boolean;
    SO: boolean;
    OT: boolean;
}

export interface SkaterPoolPoints {
    G: number;
    A: number;
    HT: number;
    SOG: number;
}

export interface GoalyPoolPoints {
    G: number;
    A: number;
    W: number;
    SO: number;
    OT: number;
}

export interface Player {
    id: number;
    name: string;
    team: number;
    position: Position;
    caps: number[] | null;
}

export enum Position {
    F = 'F',
    D = 'D',
    G = 'G',
}

export interface DraftPick {
    round: number;
    from: string;
}

export interface Trade {
    proposed_by: string;
    ask_to: string;
    from_items: TradeItems;
    to_items: TradeItems;
    status: TradeStatus;
    id: number;
    date_created: number;
    date_accepted: number;
}

export interface TradeItems {
    players: number[];
    picks: DraftPick[];
}

export enum TradeStatus {
    NEW = 'NEW',
    ACCEPTED = 'ACCEPTED',
    CANCELLED = 'CANCELLED',
    REFUSED = 'REFUSED',
}