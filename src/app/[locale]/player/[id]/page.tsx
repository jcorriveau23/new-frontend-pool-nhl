import * as React from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { goalieColumns, skaterColumns } from "./columns";
import { DataTable } from "@/components/ui/data-table";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "@/navigation";
import PageTitle from "@/components/page-title";

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
  gameTypeId: number;
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
  gameTypeId: number;
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
  gameTypeId: number;
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
  gameTypeId: number;
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
  gameTypeId: number;
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

const getServerSidePlayerInfo = async (playerId: string) => {
  /* 
    Query the player info of a specific player id. 
    */
  const res = await fetch(
    `https://api-web.nhle.com/v1/player/${playerId}/landing`,
    { next: { revalidate: 21600 } } // revalidate each 6 hours
  );
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data;
};

export default async function Player({ params }: { params: { id: string } }) {
  const t = await getTranslations();
  const playerInfo: GoalieNhlInfo | SkaterNhlInfo =
    await getServerSidePlayerInfo(params.id);

  const PlayerBaseInfo = () => (
    <Table>
      <TableCaption>
        {playerInfo.firstName.default} {playerInfo.lastName.default}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>
            <div className="flex flex-row">
              <Avatar>
                <AvatarImage src={playerInfo.headshot} />
              </Avatar>
              <Image
                width={60}
                height={60}
                alt="team"
                src={playerInfo.teamLogo}
              />
            </div>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="text-left">{t("Position")}</TableCell>
          <TableCell className="text-left">{playerInfo.position}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="text-left">{t("BirthCity")}</TableCell>
          <TableCell className="text-left">
            {playerInfo.birthCity?.default},{" "}
            {playerInfo.birthStateProvince?.default}, {playerInfo?.birthCountry}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="text-left">{t("Drafted")}</TableCell>
          <TableCell className="text-left">
            {playerInfo.draftDetails ? (
              <Link
                className="text-link hover:underline"
                href={`/draft/${playerInfo.draftDetails.year}`}
              >
                {t("DraftDetail", {
                  pick: playerInfo.draftDetails.pickInRound,
                  round: playerInfo.draftDetails.round,
                  team: playerInfo.draftDetails.teamAbbrev,
                  year: playerInfo.draftDetails.year,
                })}
              </Link>
            ) : (
              t("NotDrafted")
            )}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  const PlayerPoints = (seasonType: SeasonType) => (
    <DataTable
      data={playerInfo.seasonTotals.filter(
        (s) => s.gameTypeId === seasonType && s.leagueAbbrev === "NHL"
      )}
      columns={playerInfo.position !== "G" ? skaterColumns : goalieColumns}
      initialState={{
        columnPinning: { left: ["season"] },
      }}
      meta={null}
      title={null}
    />
  );

  return (
    <div className="items-center text-center">
      <PageTitle title={t("NHLPlayerinformationPageTitle")} />
      {PlayerBaseInfo()}
      <Accordion type="single" collapsible defaultValue="regularSeason">
        <AccordionItem value="regularSeason">
          <AccordionTrigger>{t("RegularSeason")}</AccordionTrigger>
          <AccordionContent>{PlayerPoints(SeasonType.SEASON)}</AccordionContent>
        </AccordionItem>
      </Accordion>
      <Accordion type="single" collapsible defaultValue="playoff">
        <AccordionItem value="playoff">
          <AccordionTrigger>{t("Playoff")}</AccordionTrigger>
          <AccordionContent>
            {PlayerPoints(SeasonType.PLAYOFF)}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
