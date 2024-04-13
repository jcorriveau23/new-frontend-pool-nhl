"use server";
import * as React from "react";

import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTranslations } from "next-intl/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import team_info from "@/lib/teams";
import PlayerLink from "@/components/player-link";
import { Combobox } from "@/components/ui/combobox";

interface Player {
  id: number;
  birthCountry: string;
  birthStateProvince: string | null;
  firstName: string;
  lastName: string;
  onRoster: string;
  position: string;
  yearsPro: number | null;
}

interface Team {
  id: number;
  commonName: string;
  fullName: string;
  logos: {
    id: number;
    background: string;
    endSeason: number;
    secureUrl: string;
    startSeason: number;
    teamId: number;
    url: string;
  }[];
  placeName: string;
  triCode: string;
}

interface FranchiseTeam {
  franchise: {
    mostRecentTeamId: number;
    teamCommonName: string;
    teamPlaceName: string;
  };
}

interface DraftProspect {
  id: number;
}

interface DraftedByTeam {
  id: number;
  commonName: string;
  fullName: string;
  logos: {
    id: number;
    background: string;
    endSeason: number;
    secureUrl: string;
    startSeason: number;
    teamId: number;
    url: string;
  }[];
  placeName: string;
  triCode: string;
}

interface Data {
  id: number;
  ageInDays: number;
  ageInDaysForYear: number;
  ageInYears: number;
  amateurClubName: string;
  amateurLeague: string;
  birthDate: string;
  birthPlace: string;
  countryCode: string;
  csPlayerId: number;
  draftDate: string;
  draftMasterId: number;
  draftProspect: DraftProspect;
  draftYear: number;
  draftedByTeamId: number;
  firstName: string;
  franchiseTeam: FranchiseTeam;
  height: number;
  lastName: string;
  notes: null;
  overallPickNumber: number;
  pickInRound: number;
  player: Player;
  playerId: number;
  playerName: string;
  position: string;
  removedOutright: string;
  removedOutrightWhy: null;
  roundNumber: number;
  shootsCatches: string;
  supplementalDraft: string;
  team: Team;
  teamPickHistory: string;
  triCode: string;
  weight: number;
}

interface DraftData {
  data: Data[];
  total: number;
}

const FIRST_DRAFT_YEAR = 1963;
const LAST_DRAFT_YEAR = 2023;

const getServerSideSeasonDraft = async (year: string) => {
  /* 
      Query the player info of a specific player id. 
      */
  const res = await fetch(
    `https://records.nhl.com/site/api/draft?include=draftProspect.id&include=player.birthStateProvince&include=player.birthCountry&include=player.position&include=player.onRoster&include=player.yearsPro&include=player.firstName&include=player.lastName&include=player.id&include=team.id&include=team.placeName&include=team.commonName&include=team.fullName&include=team.triCode&include=team.logos&include=franchiseTeam.franchise.mostRecentTeamId&include=franchiseTeam.franchise.teamCommonName&include=franchiseTeam.franchise.teamPlaceName&sort=[{"property":"overallPickNumber","direction":"ASC"}]&cayenneExp=draftYear=${year}`,
    { next: { revalidate: 86400 } } // revalidate each day
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
  const draft: DraftData = await getServerSideSeasonDraft(params.year);

  const t = await getTranslations();

  const rounds = Array.from(new Set(draft.data.map((d) => d.roundNumber)));

  const getListOfYears = () => {
    const years = [];
    for (let year = LAST_DRAFT_YEAR; year >= FIRST_DRAFT_YEAR; year--) {
      years.push(year);
    }
    return years;
  };

  const YearInputs = () => (
    <Combobox
      selections={getListOfYears().map((y) => ({
        value: y.toString(),
        label: y.toString(),
      }))}
      defaultSelectedValue={params.year}
      emptyText=""
      linkTo="/draft"
    />
  );

  const RoundTable = (round: number) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>{t("Player")}</TableHead>
          <TableHead>{t("Position")}</TableHead>
          <TableHead>{t("T")}</TableHead>
          <TableHead>{t("Height")}</TableHead>
          <TableHead>{t("Weight")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {draft.data
          .filter((d) => d.roundNumber === round)
          .map((d) => (
            <TableRow key={d.id}>
              <TableCell>{d.pickInRound}</TableCell>
              <TableCell>
                <PlayerLink
                  name={`${d.firstName} ${d.lastName}`}
                  id={d.playerId}
                  textStyle={null}
                />
              </TableCell>
              <TableCell>{d.position}</TableCell>
              <TableCell>
                <Image
                  width={30}
                  height={30}
                  alt="team"
                  src={team_info[d.draftedByTeamId ?? 0].logo}
                />
              </TableCell>
              <TableCell>{`${Math.floor(d.height / 12)}' ${
                d.height % 12
              }''`}</TableCell>
              <TableCell>{d.weight}</TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );

  if (rounds.length == 0) {
    return (
      <div className="items-center text-center">
        {YearInputs()}
        <h1>{t("NoDraftInfoForYear", { year: params.year })}</h1>
      </div>
    );
  }

  return (
    <div className="items-center text-center">
      {YearInputs()}
      {rounds.map((r) => (
        <Accordion
          key={r}
          type="single"
          collapsible
          defaultValue={r.toString()}
        >
          <AccordionItem value={r.toString()}>
            <AccordionTrigger>
              {t("Round")} #{r}
            </AccordionTrigger>
            <AccordionContent>{RoundTable(r)}</AccordionContent>
          </AccordionItem>
        </Accordion>
      ))}
    </div>
  );
}
