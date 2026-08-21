// Types for the api-web.nhle.com standings endpoints.
//
// The payload shape is stable across the whole NHL history, but a lot of the
// fields are era dependent: pre-expansion seasons carry no division nor
// conference at all, ties disappeared in 2005-06, the loser point and the
// shootout only exist from the 2000s onward. Everything that can be missing is
// therefore optional here and the UI gates on the season flags below.

export interface LocalizedName {
  default: string;
  fr?: string;
}

export interface StandingSeason {
  id: number;
  conferencesInUse: boolean;
  divisionsInUse: boolean;
  pointForOTlossInUse: boolean;
  regulationWinsInUse: boolean;
  rowInUse: boolean;
  standingsEnd: string;
  standingsStart: string;
  tiesInUse: boolean;
  wildcardInUse: boolean;
}

export interface StandingSeasonData {
  currentDate: string;
  seasons: StandingSeason[];
}

export interface Standing {
  // Team identity.
  teamName: LocalizedName;
  teamCommonName: LocalizedName;
  teamAbbrev: LocalizedName;
  placeName: LocalizedName;
  teamLogo: string;
  teamLogoDark: string;

  // Grouping. Absent before the NHL used divisions/conferences.
  conferenceAbbrev?: string;
  conferenceName?: string;
  divisionAbbrev?: string;
  divisionName?: string;

  // Rankings. `wildcardSequence` is 0 for the teams holding a top-3 spot in
  // their division, and 1..n for the teams chasing a wild card spot.
  conferenceSequence: number;
  divisionSequence: number;
  leagueSequence: number;
  wildcardSequence: number;
  waiversSequence: number;
  clinchIndicator?: string;

  // Overall record.
  date: string;
  seasonId: number;
  gameTypeId: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  ties: number;
  points: number;
  pointPctg: number;
  winPctg: number;
  regulationWins: number;
  regulationWinPctg: number;
  regulationPlusOtWins: number;
  regulationPlusOtWinPctg: number;
  shootoutWins: number;
  shootoutLosses: number;
  streakCode: string;
  streakCount: number;

  // Goals.
  goalFor: number;
  goalAgainst: number;
  goalDifferential: number;
  goalDifferentialPctg: number;
  goalsForPctg: number;

  // Home splits.
  homeGamesPlayed: number;
  homeWins: number;
  homeLosses: number;
  homeOtLosses: number;
  homeTies: number;
  homePoints: number;
  homeGoalsFor: number;
  homeGoalsAgainst: number;
  homeGoalDifferential: number;
  homeRegulationWins: number;
  homeRegulationPlusOtWins: number;

  // Road splits.
  roadGamesPlayed: number;
  roadWins: number;
  roadLosses: number;
  roadOtLosses: number;
  roadTies: number;
  roadPoints: number;
  roadGoalsFor: number;
  roadGoalsAgainst: number;
  roadGoalDifferential: number;
  roadRegulationWins: number;
  roadRegulationPlusOtWins: number;

  // Last 10 games.
  l10GamesPlayed: number;
  l10Wins: number;
  l10Losses: number;
  l10OtLosses: number;
  l10Ties: number;
  l10Points: number;
  l10GoalsFor: number;
  l10GoalsAgainst: number;
  l10GoalDifferential: number;
  l10RegulationWins: number;
  l10RegulationPlusOtWins: number;
}

export interface StandingsData {
  wildCardIndicator: boolean;
  standingsDateTimeUtc?: string;
  standings: Standing[];
}
