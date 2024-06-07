// Page allowing user to select a season and show all available team for that season,
// selecting a team will link to the team per season page.
"use server";

import { getAllTeamForSeason } from "@/lib/nhl";
import Image from "next/image";

import team_info from "@/lib/teams";
import { getAllYears } from "@/lib/nhl";
import { Combobox } from "@/components/ui/combobox";
import { Link } from "@/navigation";
import { getTranslations } from "next-intl/server";
import { seasonWithYearFormat } from "@/app/utils/formating";

export default async function Rosters({
  params,
}: {
  params: { season: string };
}) {
  const t = await getTranslations();
  const YearInputs = () => (
    <div className="space-x-2">
      {t("Season")}
      <Combobox
        selections={getAllYears().map((season) => ({
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
    <div className="items-center text-center space-y-2">
      {YearInputs()}
      {getAllTeamForSeason(Number(params.season)).map((teamId) => (
        <div
          key={teamId}
          className="mx-10 border-2 rounded-sm hover:border-primary hover:cursor-pointer bg-muted"
        >
          <Link href={`/roster/${params.season}/${teamId}`}>
            <p>{team_info[Number(teamId)]?.fullName}</p>
            <div className="flex justify-center">
              <Image
                key={teamId}
                width={40}
                height={40}
                alt="team"
                src={team_info[Number(teamId)]?.logo}
              />
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
