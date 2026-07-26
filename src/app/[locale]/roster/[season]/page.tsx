// Page allowing user to select a season and show all available team for that season,
// selecting a team will link to the team per season page.
"use server";

import { getAllTeamForSeason } from "@/lib/nhl";
import { TeamLogo } from "@/components/team-logo";

import team_info from "@/lib/teams";
import { getAllYears, FIRST_NHL_SEASON } from "@/lib/nhl";
import { getSeasonInfo, lastSeasonYear } from "@/lib/season-info";
import { Combobox } from "@/components/ui/link-combobox";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { seasonWithYearFormat } from "@/app/utils/formating";
import PageTitle from "@/components/page-title";

export default async function Rosters(props: {
  params: Promise<{ season: string }>;
  searchParams: Promise<string[][] | Record<string, string> | string>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const queryString = new URLSearchParams(searchParams).toString();
  const t = await getTranslations();
  const lastSeason = lastSeasonYear(await getSeasonInfo());

  const YearInputs = () => (
    <div className="space-x-2">
      {t("Season")}
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
    <div className="flex flex-col items-center text-center gap-2">
      <PageTitle title={t("NhlTeamRosterPageTitle")} />
      {YearInputs()}
      {getAllTeamForSeason(Number(params.season)).map((teamId) => (
        <div
          key={teamId}
          className="mx-10 border-2 rounded-sm hover:border-primary hover:cursor-pointer bg-muted"
        >
          <Link href={`/roster/${params.season}/${teamId}?${queryString}`}>
            <p>{team_info[Number(teamId)]?.fullName}</p>
            <div className="flex justify-center">
              <TeamLogo teamId={Number(teamId)} width={40} height={40} />
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
