"use client";
import { ColumnDef, Row } from "@tanstack/react-table";
import { seasonFormat } from "@/app/utils/formating";
import { DataTable } from "@/components/ui/data-table";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { useTranslations } from "next-intl";

enum SeasonType {
  SEASON = 2,
  PLAYOFF = 3,
}

export interface GoalieNhlInfo {
  playerId: number;
  isActive: boolean;
  currentTeamId: number;
  currentTeamAbbrev: string;
  fullTeamName: { default: string; fr: string };
  firstName: { default: string };
  lastName: { default: string };
  teamLogo: string;
  sweaterNumber: number;
  position: string;
  headshot: string;
  heroImage: string;
  heightInInches: number;
  heightInCentimeters: number;
  weightInPounds: number;
  weightInKilograms: number;
  birthDate: string;
  birthCity: { default: string };
  birthStateProvince: { default: string; fr: string };
  birthCountry: string;
  shootsCatches: string;
  draftDetails: DraftDetails;
  playerSlug: string;
  inTop100AllTime: number;
  inHHOF: number;
  featuredStats: GoaliesFeaturedStats;
  careerTotals: GoaliesCareerTotals;
  shopLink: string;
  twitterLink: string;
  watchLink: string;
  last5Games: GoaliesLast5Game[];
  seasonTotals: GoaliesSeasonTotal[];
  awards: Award[];
}

export interface DraftDetails {
  year: number;
  teamAbbrev: string;
  round: number;
  pickInRound: number;
  overallPick: number;
}

export interface GoaliesFeaturedStats {
  season: number;
  regularSeason: SeasonStats;
}

export interface SeasonStats {
  subSeason: Stats;
  career: Stats;
}

export interface Stats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  otLosses: number;
  shutouts: number;
  goalsAgainstAvg: number;
  savePctg: number;
}

export interface GoaliesCareerTotals {
  regularSeason: GoalieStats;
  playoffs: GoalieStats;
}

export interface GoalieStats {
  gamesPlayed: number;
  goals: number;
  assists: number;
  pim: number;
  gamesStarted: number;
  wins: number;
  losses: number;
  ties: number;
  otLosses: number;
  shotsAgainst: number;
  goalsAgainst: number;
  goalsAgainstAvg: number;
  savePctg: number;
  shutouts: number;
  timeOnIce: string;
}

export interface GoaliesLast5Game {
  decision: string;
  gameDate: string;
  gameId: number;
  gameTypeId: SeasonType;
  gamesStarted: number;
  goalsAgainst: number;
  homeRoadFlag: string;
  opponentAbbrev: string;
  penaltyMins: number;
  savePctg: number;
  shotsAgainst: number;
  teamAbbrev: string;
  toi: string;
}

export interface GoaliesSeasonTotal {
  gameTypeId: SeasonType;
  gamesPlayed: number;
  goalsAgainst: number;
  goalsAgainstAvg: number;
  leagueAbbrev: string;
  losses: number;
  season: number;
  sequence: number;
  shutouts: number;
  teamName: { default: string };
  ties: number;
  timeOnIce: string;
  wins: number;
  shotsAgainst?: number;
  savePctg?: number;
}

export interface Award {
  trophy: { default: string };
  seasons: Array<unknown>; // Data is truncated
}

export interface SkaterNhlInfo {
  playerId: number;
  isActive: boolean;
  currentTeamId: number;
  currentTeamAbbrev: string;
  fullTeamName: { default: string; fr: string };
  firstName: { default: string };
  lastName: { default: string };
  teamLogo: string;
  sweaterNumber: number;
  position: string;
  headshot: string;
  heroImage: string;
  heightInInches: number;
  heightInCentimeters: number;
  weightInPounds: number;
  weightInKilograms: number;
  birthDate: string;
  birthCity: { default: string };
  birthStateProvince: { default: string };
  birthCountry: string;
  shootsCatches: string;
  draftDetails: SkaterDraftDetails;
  playerSlug: string;
  inTop100AllTime: number;
  inHHOF: number;
  featuredStats: SkaterFeaturedStats;
  careerTotals: SkaterCareerTotals;
  shopLink: string;
  twitterLink: string;
  watchLink: string;
  last5Games: SkaterLast5Game[];
  seasonTotals: SkaterSeasonTotal[];
  awards: SkaterAward[];
}

export interface SkaterDraftDetails {
  year: number;
  teamAbbrev: string;
  round: number;
  pickInRound: number;
  overallPick: number;
}

export interface SkaterFeaturedStats {
  season: number;
  regularSeason: SkaterSubSeason;
}

export interface SkaterSubSeason {
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  pim: number;
  gameWinningGoals: number;
  otGoals: number;
  shots: number;
  shootingPctg: number;
  powerPlayGoals: number;
  powerPlayPoints: number;
  shorthandedGoals: number;
  shorthandedPoints: number;
}

export interface SkaterCareerTotals {
  regularSeason: SkaterSeasonStats;
  playoffs: SkaterSeasonStats;
}

export interface SkaterSeasonStats {
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  pim: number;
  powerPlayGoals: number;
  powerPlayPoints: number;
  shorthandedPoints: number;
  gameWinningGoals: number;
  otGoals: number;
  shots: number;
  shootingPctg: number;
  faceoffWinningPctg?: number;
  avgToi?: string;
}

export interface SkaterLast5Game {
  assists: number;
  gameDate: string;
  gameId: number;
  gameTypeId: SeasonType;
  goals: number;
  homeRoadFlag: string;
  opponentAbbrev: string;
  pim: number;
  plusMinus: number;
  points: number;
  powerPlayGoals: number;
  shifts: number;
  shorthandedGoals: number;
  shots: number;
  teamAbbrev: string;
  toi: string;
  faceoffPctg?: number;
  faceoffWins?: number;
  faceoffTaken?: number;
  hits?: number;
  blockedShots?: number;
  penaltiesDrawn?: number;
  penaltiesTaken?: number;
  giveaways?: number;
  takeaways?: number;
}

export interface SkaterSeasonTotal {
  gameTypeId: SeasonType;
  gamesPlayed: number;
  goals: number;
  assists: number;
  leagueAbbrev: string;
  pim: number;
  points: number;
  season: number;
  sequence: number;
  teamName: { default: string };
  faceoffPctg?: number;
  faceoffWins?: number;
  faceoffTaken?: number;
  hits?: number;
  blockedShots?: number;
  penaltiesDrawn?: number;
  penaltiesTaken?: number;
  giveaways?: number;
  takeaways?: number;
  timeOnIce?: string;
}

export interface SkaterAward {
  trophy: { default: string; fr: string };
  seasons: SkaterAwardSeason[];
}

export interface SkaterAwardSeason {
  seasonId: number;
  gamesPlayed: number;
  gameTypeId: SeasonType;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  hits: number;
  blockedShots: number;
  pim: number;
}

export interface SkaterCurrentTeamRoster {
  playerId: number;
  lastName: { default: string };
  firstName: { default: string };
  playerSlug: string;
}

export const skaterColumns: ColumnDef<SkaterSeasonTotal>[] = [
  {
    accessorKey: "season",
    header: "season",
    accessorFn: (row) => seasonFormat(row.season, 0),
  },
  {
    accessorKey: "leagueAbbrev",
    header: "L",
  },
  {
    accessorKey: "teamName",
    header: "T.",
    accessorFn: (row) => row.teamName.default,
  },
  {
    accessorKey: "gamesPlayed",
    header: "GP",
  },
  {
    accessorKey: "goals",
    header: "G",
  },
  {
    accessorKey: "assists",
    header: "A",
  },
  {
    accessorKey: "points",
    header: "PTS",
  },
  {
    accessorKey: "plusMinus",
    header: "+/-",
  },
  {
    accessorKey: "pim",
    header: "pim",
  },
];

export const goalieColumns: ColumnDef<GoaliesSeasonTotal>[] = [
  {
    accessorKey: "season",
    header: "season",
    accessorFn: (row) => seasonFormat(row.season, 0),
  },
  {
    accessorKey: "leagueAbbrev",
    header: "L",
  },
  {
    accessorKey: "teamName",
    header: "T.",
    accessorFn: (row) => row.teamName.default,
  },
  {
    accessorKey: "gamesPlayed",
    header: "GP",
  },
  {
    accessorKey: "goalsAgainst",
    header: "GA",
  },
  {
    accessorKey: "goalsAgainstAvg",
    header: "GAA",
    accessorFn: (row) => row.goalsAgainstAvg?.toFixed(2),
  },
  {
    accessorKey: "wins",
    header: "W",
  },
  {
    accessorKey: "losses",
    header: "L",
  },
  {
    accessorKey: "otLosses",
    header: "OT",
  },
  {
    accessorKey: "shutouts",
    header: "SO",
  },
  {
    accessorKey: "savePctg",
    header: "S%",
    accessorFn: (row) => row.savePctg?.toFixed(3),
  },
  {
    accessorKey: "goals",
    header: "G",
  },
  {
    accessorKey: "assists",
    header: "A",
  },
];

interface PlayerPointsTableProps {
  playerInfo: GoalieNhlInfo | SkaterNhlInfo;
  seasonType: SeasonType;
}

export default function PlayerPointsTable(props: PlayerPointsTableProps) {
  const [showOnlyNHL, setShowOnlyNHL] = useState(true);
  const t = useTranslations();

  const TotalNhlSkaterRow = (season: SkaterSeasonStats) => (
    <TableRow>
      <TableCell colSpan={3}>{t("NhlTotal")}</TableCell>
      <TableCell>{season?.gamesPlayed}</TableCell>
      <TableCell>{season?.goals}</TableCell>
      <TableCell>{season?.assists}</TableCell>
      <TableCell>{season?.points}</TableCell>
      <TableCell>{season?.plusMinus}</TableCell>
      <TableCell>{season?.pim}</TableCell>
    </TableRow>
  );

  const TotalNhlGoalieRow = (season: GoalieStats) => (
    <TableRow>
      <TableCell colSpan={3}>{t("NhlTotal")}</TableCell>
      <TableCell>{season?.gamesPlayed}</TableCell>
      <TableCell>{season?.goalsAgainst}</TableCell>
      <TableCell>{season?.goalsAgainstAvg?.toFixed(2)}</TableCell>
      <TableCell>{season?.wins}</TableCell>
      <TableCell>{season?.losses}</TableCell>
      <TableCell>{season?.otLosses}</TableCell>
      <TableCell>{season?.shutouts}</TableCell>
      <TableCell>{season?.savePctg?.toFixed(3)}</TableCell>
      <TableCell>{season?.goals}</TableCell>
      <TableCell>{season?.assists}</TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="nhl-only"
          checked={showOnlyNHL}
          onCheckedChange={() => setShowOnlyNHL(!showOnlyNHL)}
        />
        <label htmlFor="nhl-only">{t("ShowOnlyNhlStats")}</label>
      </div>
      <DataTable
        data={props.playerInfo.seasonTotals.filter(
          (s) =>
            s.gameTypeId == props.seasonType &&
            (!showOnlyNHL || s.leagueAbbrev === "NHL")
        )}
        // @ts-expect-error, known type issue, might need to separate into skater and goalies table function.
        columns={
          props.playerInfo.position !== "G" ? skaterColumns : goalieColumns
        }
        initialState={{
          columnPinning: { left: ["season"] },
        }}
        meta={{
          props: null,
          getRowStyles: (row: Row<SkaterSeasonTotal | GoaliesSeasonTotal>) => {
            if (showOnlyNHL) return "";

            if (row.original.leagueAbbrev === "NHL") {
              return "bg-[#DDD700] hover:bg-[#DDD700]";
            } else if (["AHL", "KHL"].includes(row.original.leagueAbbrev)) {
              return "bg-[#DD7272] hover:bg-[#DD7272]";
            }
          },
          onRowClick: () => null,
          t: null,
        }}
        title={null}
        tableFooter={
          props.playerInfo.careerTotals
            ? props.playerInfo.position !== "G"
              ? TotalNhlSkaterRow(
                  (props.seasonType === SeasonType.SEASON
                    ? props.playerInfo.careerTotals.regularSeason
                    : props.playerInfo.careerTotals
                        .playoffs) as SkaterSeasonStats
                )
              : TotalNhlGoalieRow(
                  (props.seasonType === SeasonType.SEASON
                    ? props.playerInfo.careerTotals.regularSeason
                    : props.playerInfo.careerTotals.playoffs) as GoalieStats
                )
            : null
        }
      />
    </div>
  );
}
