// Page allowing user to select a season and show all available team for that season,
// selecting a team will link to the team per season page.
"use server";

import * as React from "react";
import { getAllTeamForSeason, getAllYears, FIRST_NHL_SEASON } from "@/lib/nhl";
import team_info from "@/lib/teams";
import { getSeasonInfo, lastSeasonYear } from "@/lib/season-info";
import { Combobox } from "@/components/ui/link-combobox";
import { Label } from "@/components/ui/label";
import { getTranslations } from "next-intl/server";
import { seasonFormat, seasonWithYearFormat } from "@/app/utils/formating";
import PageTitle from "@/components/page-title";
import TeamList, { Team } from "./team-list";

export default async function Rosters(props: {
  params: Promise<{ season: string }>;
  searchParams: Promise<string[][] | Record<string, string> | string>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const queryString = new URLSearchParams(searchParams).toString();
  const t = await getTranslations();
  const lastSeason = lastSeasonYear(await getSeasonInfo());

  const teams: Team[] = getAllTeamForSeason(Number(params.season)).map(
    (teamId) => ({
      id: Number(teamId),
      name: team_info[Number(teamId)]?.fullName,
    }),
  );

  const seasonSelector = (
    <div className="flex items-center gap-2">
      <Label className="text-muted-foreground">{t("Season")}</Label>
      <Combobox
        selections={getAllYears(FIRST_NHL_SEASON, lastSeason).map((season) => ({
          value: `${season}${season + 1}`,
          label: seasonWithYearFormat(season),
        }))}
        defaultSelectedValue={params.season}
        emptyText=""
        linkTo={`/roster/\${value}`}
      />
    </div>
  );

  return (
    <div>
      <PageTitle
        title={t("NhlTeamRosterPageTitle")}
        subtitle={t("TeamCountForSeason", {
          count: teams.length,
          season: seasonFormat(Number(params.season), 0),
        })}
      />
      <TeamList
        teams={teams}
        season={params.season}
        queryString={queryString}
        seasonSelector={seasonSelector}
      />
    </div>
  );
}
