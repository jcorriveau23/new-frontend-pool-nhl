import * as React from "react";

import Image from "next/image";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTranslations } from "next-intl/server";
import { seasonFormat } from "@/app/utils/formating";

interface Season {
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

interface SeasonData {
  currentDate: string;
  seasons: Season[];
}

interface Standing {
  conferenceHomeSequence: number;
  conferenceL10Sequence: number;
  conferenceRoadSequence: number;
  conferenceSequence: number;
  date: string;
  divisionAbbrev: string;
  divisionHomeSequence: number;
  divisionL10Sequence: number;
  divisionName: string;
  divisionRoadSequence: number;
  divisionSequence: number;
  gameTypeId: number;
  gamesPlayed: number;
  goalDifferential: number;
  goalDifferentialPctg: number;
  goalAgainst: number;
  goalFor: number;
  goalsForPctg: number;
  homeGamesPlayed: number;
  homeGoalDifferential: number;
  homeGoalsAgainst: number;
  homeGoalsFor: number;
  homeLosses: number;
  homeOtLosses: number;
  homePoints: number;
  homeRegulationPlusOtWins: number;
  homeRegulationWins: number;
  homeTies: number;
  homeWins: number;
  l10GamesPlayed: number;
  l10GoalDifferential: number;
  l10GoalsAgainst: number;
  l10GoalsFor: number;
  l10Losses: number;
  l10OtLosses: number;
  l10Points: number;
  l10RegulationPlusOtWins: number;
  l10RegulationWins: number;
  l10Ties: number;
  l10Wins: number;
  leagueHomeSequence: number;
  leagueL10Sequence: number;
  leagueRoadSequence: number;
  leagueSequence: number;
  losses: number;
  otLosses: number;
  placeName: { default: string; fr?: string };
  pointPctg: number;
  points: number;
  regulationPlusOtWinPctg: number;
  regulationPlusOtWins: number;
  regulationWinPctg: number;
  regulationWins: number;
  roadGamesPlayed: number;
  roadGoalDifferential: number;
  roadGoalsAgainst: number;
  roadGoalsFor: number;
  roadLosses: number;
  roadOtLosses: number;
  roadPoints: number;
  roadRegulationPlusOtWins: number;
  roadRegulationWins: number;
  roadTies: number;
  roadWins: number;
  seasonId: number;
  shootoutLosses: number;
  shootoutWins: number;
  streakCode: string;
  streakCount: number;
  teamName: { default: string; fr?: string };
  teamCommonName: { default: string };
  teamAbbrev: { default: string };
  clinchIndicator?: string;
  teamLogo: string;
  ties: number;
  waiversSequence: number;
  wildcardSequence: number;
  winPctg: number;
  wins: number;
}

interface StandingsData {
  wildCardIndicator: boolean;
  standings: Standing[];
}

const getServerSideStandingSeason = async () => {
  /* 
      Query the player info of a specific player id. 
      */
  const res = await fetch(
    "https://api-web.nhle.com/v1/standings-season",
    { next: { revalidate: 86400 } } // revalidate each day
  );
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data;
};

const getServerSideStanding = async (date: string) => {
  /* 
        Query the player info of a specific player id. 
        */
  const res = await fetch(
    `https://api-web.nhle.com/v1/standings/${date}`,
    { next: { revalidate: 21600 } } // revalidate each 6 hours
  );
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data;
};

export default async function Standing({
  params,
}: {
  params: { year: string };
}) {
  const standingSeasons: SeasonData = await getServerSideStandingSeason();
  const standing: StandingsData = await getServerSideStanding(params.year);
  const t = await getTranslations();

  const StandingLeague = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead colSpan={4}></TableHead>
          <TableHead>{t("GP")}</TableHead>
          <TableHead>{t("RECORD")}</TableHead>
          <TableHead>PTS</TableHead>
          <TableHead>DIFF</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {standing.standings
          .sort((team) => team.leagueSequence)
          .map((team) => (
            <TableRow key={team.teamAbbrev.default}>
              <TableCell>{team.leagueSequence}</TableCell>
              <TableCell>
                <Image width={30} height={30} alt="team" src={team.teamLogo} />
              </TableCell>
              <TableCell>{team.teamAbbrev.default}</TableCell>
              <TableCell> {team.clinchIndicator}</TableCell>
              <TableCell>{team.gamesPlayed}</TableCell>
              <TableCell>
                {team.wins}-{team.losses}-{team.otLosses + team.ties}
              </TableCell>
              <TableCell>{team.points}</TableCell>
              <TableCell>{team.goalDifferential}</TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="items-center text-center">
      <div className="space-x-2">
        {t("Season")}
        <Combobox
          selections={standingSeasons.seasons.reverse().map((s) => ({
            value: s.standingsEnd,
            label: seasonFormat(s.id, 0),
          }))}
          defaultSelectedValue={
            params.year === "now" // If now is selected take the latest date.
              ? standingSeasons.seasons[0].standingsEnd
              : params.year
          }
          emptyText=""
          linkTo={`/standing/\${value}`}
        />
      </div>
      {StandingLeague()}
    </div>
  );
}
