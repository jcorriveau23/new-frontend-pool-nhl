// Page listing every injured NHL player, grouped by the team they belong to.
// The report is scraped from CBS Sports; see @/lib/injuries.

import * as React from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import PageTitle from "@/components/page-title";
import { TeamLogo } from "@/components/team-logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getInjuriesByTeam, getInjuredPlayers } from "@/lib/injuries";

// The page CBS publishes the report on, credited under the title.
const CBS_INJURIES_URL = "https://www.cbssports.com/nhl/injuries/";

export default async function Injuries() {
  const t = await getTranslations();
  const injuredPlayers = await getInjuredPlayers();

  if (injuredPlayers === null || Object.keys(injuredPlayers).length === 0) {
    return (
      <div>
        <PageTitle title={t("InjuryReportPageTitle")} />
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("NoInjuryData")}
        </p>
      </div>
    );
  }

  const teams = await getInjuriesByTeam(injuredPlayers);
  const injuredCount = Object.keys(injuredPlayers).length;

  return (
    <div className="w-full">
      <PageTitle
        title={t("InjuryReportPageTitle")}
        subtitle={t("InjuryReportSubtitle", {
          count: injuredCount,
          teams: teams.filter((team) => team.teamId !== null).length,
        })}
      />

      {/* The user asked for the provenance of this data to be stated on the
          page itself, not only in the source. */}
      <p className="text-muted-foreground pb-6 text-sm">
        {t("InjuryDataSourceCbs")}{" "}
        <a
          href={CBS_INJURIES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {t("ViewOnCbsSports")}
        </a>
      </p>

      <div className="flex flex-col gap-4">
        {teams.map((team) => (
          <Card key={team.teamId ?? "no-team"}>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <TeamLogo teamId={team.teamId} width={32} height={32} />
              <CardTitle className="flex-1 text-base">
                {team.teamName ?? t("InjuredPlayersWithoutTeam")}
              </CardTitle>
              <Badge variant="secondary">{team.players.length}</Badge>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Player")}</TableHead>
                    <TableHead>{t("Position")}</TableHead>
                    <TableHead>{t("InjuryType")}</TableHead>
                    <TableHead>{t("InjuredSince")}</TableHead>
                    <TableHead>{t("ExpectedReturn")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.players.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/player/${player.id}`}
                          className="text-primary hover:underline"
                        >
                          {player.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {player.position}
                      </TableCell>
                      <TableCell>{player.type}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {player.date}
                      </TableCell>
                      <TableCell>{player.recovery}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
