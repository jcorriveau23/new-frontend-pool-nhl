"use server";

// Page displaying yearly data for a specific team on a specific season.

import Image from "next/image";
import { DataTable } from "@/components/ui/data-table";
import { goaliesSeasonColumns, skaterSeasonColumns } from "./columns";
import team_info from "@/lib/teams";
import { Combobox } from "@/components/ui/combobox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getTranslations } from "next-intl/server";
import { getAllYearsForTeam } from "@/lib/nhl";

// https://api.nhle.com/stats/rest/en/skater/summary?isAggregate=false&isGame=false&sort=[{%22property%22:%22points%22,%22direction%22:%22DESC%22},{%22property%22:%22goals%22,%22direction%22:%22DESC%22},{%22property%22:%22assists%22,%22direction%22:%22DESC%22},{%22property%22:%22playerId%22,%22direction%22:%22ASC%22}]&start=0&limit=50&factCayenneExp=gamesPlayed%3E=1&cayenneExp=teamId=8%20and%20gameTypeId=2%20and%20seasonId%3C=20172018%20and%20seasonId%3E=20172018

const getServerSideSkatersTeamPerSeason = async (
  teamId: string,
  season: string
) => {
  /*
  Query the list of skaters and their points for a specific team and season.
  */
  const urlSkaters = `https://api.nhle.com/stats/rest/en/skater/summary?isAggregate=false&isGame=false&sort=[{%22property%22:%22points%22,%22direction%22:%22DESC%22},{%22property%22:%22goals%22,%22direction%22:%22DESC%22}]&start=0&limit=50&factCayenneExp=gamesPlayed%3E=1&cayenneExp=teamId=
      ${teamId}
      %20and%20gameTypeId=2%20and%20seasonId%3C=
      ${season}
      %20and%20seasonId%3E=
      ${season}`;

  const res = await fetch(
    urlSkaters,
    { next: { revalidate: 86400 } } // revalidate each day
  );
  if (!res.ok) {
    return null;
  }

  const data = await res.json();

  return data;
};

const getServerSideGoaliesTeamPerSeason = async (
  teamId: string,
  season: string
) => {
  /*
  Query the list of goalies and their stats for a specific team and season.
  */
  const urlgoalies = `https://api.nhle.com/stats/rest/en/goalie/summary?isAggregate=false&isGame=false&sort=[{%22property%22:%22wins%22,%22direction%22:%22DESC%22}]&start=0&limit=50&factCayenneExp=gamesPlayed%3E=1&cayenneExp=teamId=
        ${teamId}
        %20and%20gameTypeId=2%20and%20seasonId%3C=
        ${season}
        %20and%20seasonId%3E=
        ${season}`;

  const res = await fetch(
    urlgoalies,
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
  params: { season: string; teamId: string };
}) {
  const t = await getTranslations();
  const skaters = await getServerSideSkatersTeamPerSeason(
    params.teamId,
    params.season
  );

  const goalies = await getServerSideGoaliesTeamPerSeason(
    params.teamId,
    params.season
  );

  const YearInputs = () => (
    <div>
      Season:{" "}
      <Combobox
        selections={getAllYearsForTeam(Number(params.teamId)).map((season) => ({
          value: `${season}${season + 1}`,
          label: `${season.toString()}-${(season + 1).toString().slice(2)}`,
        }))}
        defaultSelectedValue={params.season}
        emptyText=""
        linkTo={`/roster/\${value}/${params.teamId}`}
      />
    </div>
  );

  if (
    skaters === null ||
    skaters.data.length === 0 ||
    goalies === null ||
    goalies.data.length === 0
  ) {
    return (
      <div className="items-center text-center">
        {YearInputs()}
        <h1>
          {t("NoRosterInfoForSeason", {
            team: team_info[Number(params.teamId)]?.fullName,
            season: `${params.season.slice(0, 4)}-${params.season.slice(6)}`,
          })}
        </h1>
      </div>
    );
  }

  return (
    <div className="items-center text-center">
      <div>
        <Image
          width={60}
          height={60}
          alt="team"
          src={team_info[Number(params.teamId)]?.logo}
        />
        {YearInputs()}
      </div>
      <Accordion type="single" collapsible defaultValue="skaters">
        <AccordionItem value="skaters">
          <AccordionTrigger>{t("Skaters")}</AccordionTrigger>
          <AccordionContent>
            <DataTable
              data={skaters.data}
              columns={skaterSeasonColumns}
              initialState={{
                columnPinning: { left: ["player"] },
                sorting: [
                  {
                    id: "points",
                    desc: true,
                  },
                ],
              }}
              meta={null}
              title={null}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Accordion type="single" collapsible defaultValue="goalies">
        <AccordionItem value="goalies">
          <AccordionTrigger>{t("Goalies")}</AccordionTrigger>
          <AccordionContent>
            <DataTable
              data={goalies.data}
              columns={goaliesSeasonColumns}
              initialState={{
                columnPinning: { left: ["player"] },
                sorting: [
                  {
                    id: "wins",
                    desc: true,
                  },
                ],
              }}
              meta={null}
              title={null}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
