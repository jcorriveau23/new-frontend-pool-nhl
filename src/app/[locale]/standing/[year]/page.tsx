// Page showing the NHL standing for a given date, by league, conference,
// division or wild card race.
"use server";

import * as React from "react";

import {
  getServerSideStanding,
  getServerSideStandingSeasons,
} from "@/actions/standing";
import { StandingSeason } from "@/data/nhl/standing";
import { Combobox } from "@/components/ui/link-combobox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getTranslations } from "next-intl/server";
import { seasonFormat } from "@/app/utils/formating";
import PageTitle from "@/components/page-title";
import StandingTables from "./standing-tables";

export default async function Standing(props: {
  params: Promise<{ year: string }>;
}) {
  const params = await props.params;
  const [standingSeasons, standing] = await Promise.all([
    getServerSideStandingSeasons(),
    getServerSideStanding(params.year),
  ]);
  const t = await getTranslations();

  if (
    standingSeasons === null ||
    standing === null ||
    standing.standings.length === 0
  ) {
    return (
      <div>
        <PageTitle title={t("NhlStandingPageTitle")} />
        <Alert>
          <AlertTitle>{t("NoStandingFound")}</AlertTitle>
          <AlertDescription>{t("NoStandingFoundHint")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // The seasons come oldest first, the most recent one is the useful default.
  const seasons = [...standingSeasons.seasons].reverse();

  // `params.year` is a date, the standing itself tells which season it lands
  // in. Matching on the season id keeps the selector in sync with the table
  // even for `now`, which resolves to the last completed season in the
  // off-season.
  const season: StandingSeason | undefined = seasons.find(
    (s) => s.id === standing.standings[0].seasonId,
  );

  const seasonSelector = (
    <div className="flex items-center gap-2">
      <Label className="text-muted-foreground">{t("Season")}</Label>
      <Combobox
        selections={seasons.map((s) => ({
          value: s.standingsEnd,
          label: seasonFormat(s.id, 0),
        }))}
        defaultSelectedValue={season?.standingsEnd ?? params.year}
        emptyText=""
        linkTo={`/standing/\${value}`}
      />
    </div>
  );

  return (
    <div>
      <PageTitle
        title={t("NhlStandingPageTitle")}
        subtitle={t("StandingAsOfDate", {
          date: standing.standings[0].date,
          season: season ? seasonFormat(season.id, 0) : params.year,
        })}
      />
      <StandingTables
        standings={standing.standings}
        season={season}
        seasonSelector={seasonSelector}
      />
    </div>
  );
}
