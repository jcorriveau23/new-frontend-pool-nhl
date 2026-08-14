"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Standing, StandingSeason } from "@/data/nhl/standing";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Number of teams per division qualifying directly for the playoffs, the
// remaining spots of a conference being filled by the wild cards.
const DIVISION_PLAYOFF_SPOTS = 3;
const WILD_CARD_SPOTS_PER_CONFERENCE = 2;

// Which optional columns make sense for the season being displayed. The NHL
// rules changed a lot over time, showing an all-zero `OTL` column for 1975 or
// an empty `ROW` for 1993 is just noise.
interface ColumnFlags {
  ties: boolean;
  otLosses: boolean;
  regulationWins: boolean;
  row: boolean;
  shootout: boolean;
}

interface Props {
  standings: Standing[];
  season: StandingSeason | undefined;
  // Rendered on the same row as the tab list so the whole toolbar sits on one
  // line on desktop.
  seasonSelector: React.ReactNode;
}

function columnFlags(
  standings: Standing[],
  season: StandingSeason | undefined,
): ColumnFlags {
  // The season metadata is authoritative, but it is missing for a date that
  // does not resolve to a known season, so fall back on the rows themselves.
  const someRow = (predicate: (team: Standing) => boolean) =>
    standings.some(predicate);

  return {
    ties: season?.tiesInUse ?? someRow((team) => team.ties > 0),
    otLosses:
      season?.pointForOTlossInUse ?? someRow((team) => team.otLosses > 0),
    regulationWins:
      season?.regulationWinsInUse ?? someRow((team) => team.regulationWins > 0),
    row: season?.rowInUse ?? someRow((team) => team.regulationPlusOtWins > 0),
    shootout: someRow((team) => team.shootoutWins + team.shootoutLosses > 0),
  };
}

function pointsPercentage(pointPctg: number): string {
  // NHL convention: 3 decimals without the leading zero (.738).
  return pointPctg.toFixed(3).replace(/^0/, "");
}

function signedDifferential(differential: number): string {
  return differential > 0 ? `+${differential}` : `${differential}`;
}

function record(wins: number, losses: number, otLossesOrTies: number): string {
  return `${wins}-${losses}-${otLossesOrTies}`;
}

// A group of teams rendered as a single table, `rank` being the sequence to
// display in the leftmost column (league, conference, division or wild card).
interface Group {
  key: string;
  title?: string;
  teams: Standing[];
  rank: (team: Standing, index: number) => React.ReactNode;
  // Draw the playoff cut line under the row at this index (0 based).
  cutAfterIndex?: number;
}

export default function StandingTables(props: Props) {
  const t = useTranslations();

  const flags = React.useMemo(
    () => columnFlags(props.standings, props.season),
    [props.standings, props.season],
  );

  const hasConferences = props.standings.some((team) => team.conferenceName);
  const hasDivisions = props.standings.some((team) => team.divisionName);
  const hasWildCard =
    hasConferences &&
    hasDivisions &&
    props.standings.some((team) => team.wildcardSequence > 0);

  const sortedBy = React.useCallback(
    (teams: Standing[], sequence: (team: Standing) => number) =>
      [...teams].sort((a, b) => sequence(a) - sequence(b)),
    [],
  );

  // Groups the teams by conference or division name, keeping the groups in the
  // order the API returned them so both conferences keep their usual side.
  const groupBy = React.useCallback(
    (key: (team: Standing) => string | undefined) => {
      const groups = new Map<string, Standing[]>();
      for (const team of props.standings) {
        const name = key(team);
        if (!name) {
          continue;
        }
        const teams = groups.get(name);
        if (teams) {
          teams.push(team);
        } else {
          groups.set(name, [team]);
        }
      }
      return groups;
    },
    [props.standings],
  );

  const leagueGroups: Group[] = [
    {
      key: "league",
      teams: sortedBy(props.standings, (team) => team.leagueSequence),
      rank: (team) => team.leagueSequence,
    },
  ];

  const conferenceGroups: Group[] = Array.from(
    groupBy((team) => team.conferenceName),
    ([name, teams]) => ({
      key: name,
      title: name,
      teams: sortedBy(teams, (team) => team.conferenceSequence),
      rank: (team: Standing) => team.conferenceSequence,
    }),
  );

  const divisionGroups: Group[] = Array.from(
    groupBy((team) => team.divisionName),
    ([name, teams]) => ({
      key: name,
      title: name,
      teams: sortedBy(teams, (team) => team.divisionSequence),
      rank: (team: Standing) => team.divisionSequence,
    }),
  );

  // Wild card layout: per conference, the top 3 of each division then the
  // teams chasing the two remaining spots, with the playoff cut line drawn
  // under the second wild card.
  const wildCardConferences = Array.from(
    groupBy((team) => team.conferenceName),
    ([conference, teams]) => {
      const divisions = new Map<string, Standing[]>();
      for (const team of teams) {
        if (!team.divisionName) {
          continue;
        }
        const divisionTeams = divisions.get(team.divisionName);
        if (divisionTeams) {
          divisionTeams.push(team);
        } else {
          divisions.set(team.divisionName, [team]);
        }
      }

      const groups: Group[] = Array.from(
        divisions,
        ([name, divisionTeams]) => ({
          key: `${conference}-${name}`,
          title: name,
          teams: sortedBy(divisionTeams, (team) => team.divisionSequence).slice(
            0,
            DIVISION_PLAYOFF_SPOTS,
          ),
          rank: (team: Standing) => team.divisionSequence,
        }),
      );

      groups.push({
        key: `${conference}-wildcard`,
        title: t("WildCard"),
        teams: sortedBy(
          teams.filter((team) => team.wildcardSequence > 0),
          (team) => team.wildcardSequence,
        ),
        rank: (team: Standing) => `WC${team.wildcardSequence}`,
        cutAfterIndex: WILD_CARD_SPOTS_PER_CONFERENCE - 1,
      });

      return { conference, groups };
    },
  );

  const clinchLabels: Record<string, string> = {
    p: t("ClinchPresidentsTrophy"),
    z: t("ClinchConference"),
    y: t("ClinchDivision"),
    x: t("ClinchPlayoffSpot"),
    e: t("ClinchEliminated"),
  };

  const StandingRow = (
    team: Standing,
    group: Group,
    index: number,
  ): React.ReactNode => (
    <TableRow
      key={team.teamAbbrev.default}
      className={cn(
        group.cutAfterIndex === index && "border-primary border-b-2",
      )}
    >
      <TableCell className="text-muted-foreground w-8 text-right tabular-nums">
        {group.rank(team, index)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <TeamLogo
            src={team.teamLogo}
            alt={team.teamAbbrev.default}
            width={24}
            height={24}
          />
          <span className="font-medium">{team.teamAbbrev.default}</span>
          {team.clinchIndicator ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge variant="outline" className="uppercase">
                    {team.clinchIndicator}
                  </Badge>
                }
              />
              <TooltipContent>
                {clinchLabels[team.clinchIndicator] ?? team.clinchIndicator}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {team.gamesPlayed}
      </TableCell>
      <TableCell className="text-right tabular-nums">{team.wins}</TableCell>
      <TableCell className="text-right tabular-nums">{team.losses}</TableCell>
      {flags.otLosses ? (
        <TableCell className="text-right tabular-nums">
          {team.otLosses}
        </TableCell>
      ) : null}
      {flags.ties ? (
        <TableCell className="text-right tabular-nums">{team.ties}</TableCell>
      ) : null}
      <TableCell className="text-right font-semibold tabular-nums">
        {team.points}
      </TableCell>
      <TableCell className="text-muted-foreground hidden text-right tabular-nums md:table-cell">
        {pointsPercentage(team.pointPctg)}
      </TableCell>
      {flags.regulationWins ? (
        <TableCell className="hidden text-right tabular-nums xl:table-cell">
          {team.regulationWins}
        </TableCell>
      ) : null}
      {flags.row ? (
        <TableCell className="hidden text-right tabular-nums xl:table-cell">
          {team.regulationPlusOtWins}
        </TableCell>
      ) : null}
      <TableCell className="hidden text-right tabular-nums lg:table-cell">
        {team.goalFor}
      </TableCell>
      <TableCell className="hidden text-right tabular-nums lg:table-cell">
        {team.goalAgainst}
      </TableCell>
      <TableCell className="hidden text-right tabular-nums md:table-cell">
        {signedDifferential(team.goalDifferential)}
      </TableCell>
      <TableCell className="hidden text-right tabular-nums xl:table-cell">
        {record(
          team.homeWins,
          team.homeLosses,
          flags.ties ? team.homeTies : team.homeOtLosses,
        )}
      </TableCell>
      <TableCell className="hidden text-right tabular-nums xl:table-cell">
        {record(
          team.roadWins,
          team.roadLosses,
          flags.ties ? team.roadTies : team.roadOtLosses,
        )}
      </TableCell>
      {flags.shootout ? (
        <TableCell className="hidden text-right tabular-nums xl:table-cell">
          {team.shootoutWins}-{team.shootoutLosses}
        </TableCell>
      ) : null}
      <TableCell className="hidden text-right tabular-nums lg:table-cell">
        {record(
          team.l10Wins,
          team.l10Losses,
          flags.ties ? team.l10Ties : team.l10OtLosses,
        )}
      </TableCell>
      <TableCell className="hidden text-right md:table-cell">
        {team.streakCount > 0 ? (
          <Badge
            variant={team.streakCode === "W" ? "default" : "secondary"}
            className="tabular-nums"
          >
            {team.streakCode}
            {team.streakCount}
          </Badge>
        ) : null}
      </TableCell>
    </TableRow>
  );

  const StandingTable = (group: Group) => (
    // `Table` cells carry no padding of their own, the density here matches the
    // one used by the pool `DataTable` so both read the same.
    <Table className="[&_td]:px-1 [&_td]:py-1.5 [&_th]:px-1 sm:[&_td]:px-3 sm:[&_td]:py-2 sm:[&_th]:px-3">
      <TableHeader>
        <TableRow>
          <TableHead className="w-8 text-right">#</TableHead>
          <TableHead>{t("Team")}</TableHead>
          <TableHead className="text-right">{t("GP")}</TableHead>
          <TableHead className="text-right">{t("W")}</TableHead>
          <TableHead className="text-right">{t("LossesShort")}</TableHead>
          {flags.otLosses ? (
            <TableHead className="text-right">{t("OTL")}</TableHead>
          ) : null}
          {flags.ties ? (
            <TableHead className="text-right">{t("TiesShort")}</TableHead>
          ) : null}
          <TableHead className="text-right">{t("Pts")}</TableHead>
          <TableHead className="hidden text-right md:table-cell">
            {t("PointsPctShort")}
          </TableHead>
          {flags.regulationWins ? (
            <TableHead className="hidden text-right xl:table-cell">
              {t("RegulationWinsShort")}
            </TableHead>
          ) : null}
          {flags.row ? (
            <TableHead className="hidden text-right xl:table-cell">
              {t("RegulationPlusOtWinsShort")}
            </TableHead>
          ) : null}
          <TableHead className="hidden text-right lg:table-cell">
            {t("GoalsForShort")}
          </TableHead>
          <TableHead className="hidden text-right lg:table-cell">
            {t("GoalsAgainstShort")}
          </TableHead>
          <TableHead className="hidden text-right md:table-cell">
            {t("GoalDifferentialShort")}
          </TableHead>
          <TableHead className="hidden text-right xl:table-cell">
            {t("HomeRecordShort")}
          </TableHead>
          <TableHead className="hidden text-right xl:table-cell">
            {t("RoadRecordShort")}
          </TableHead>
          {flags.shootout ? (
            <TableHead className="hidden text-right xl:table-cell">
              {t("ShootoutShort")}
            </TableHead>
          ) : null}
          <TableHead className="hidden text-right lg:table-cell">
            {t("LastTenShort")}
          </TableHead>
          <TableHead className="hidden text-right md:table-cell">
            {t("StreakShort")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {group.teams.map((team, index) => StandingRow(team, group, index))}
      </TableBody>
    </Table>
  );

  // Every view sits on a card surface. The league table is the only group
  // without a header, it needs no title to say what it is.
  const GroupCard = (group: Group) => (
    <Card key={group.key} className="overflow-hidden">
      {group.title ? (
        <CardHeader className="py-4">
          <CardTitle className="text-base">{group.title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={cn("px-0 pb-2", !group.title && "pt-2")}>
        {StandingTable(group)}
      </CardContent>
    </Card>
  );

  const clinchLegend = props.standings.some((team) => team.clinchIndicator) ? (
    <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 px-1 pt-4 text-xs">
      {Object.entries(clinchLabels).map(([indicator, label]) => (
        <span key={indicator}>
          <span className="text-foreground font-semibold uppercase">
            {indicator}
          </span>{" "}
          {label}
        </span>
      ))}
    </div>
  ) : null;

  return (
    <>
      <Tabs defaultValue="league">
        <div className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="league">{t("League")}</TabsTrigger>
            {hasConferences ? (
              <TabsTrigger value="conference">{t("Conference")}</TabsTrigger>
            ) : null}
            {hasDivisions ? (
              <TabsTrigger value="division">{t("Division")}</TabsTrigger>
            ) : null}
            {hasWildCard ? (
              <TabsTrigger value="wildcard">{t("WildCard")}</TabsTrigger>
            ) : null}
          </TabsList>
          <div className="shrink-0">{props.seasonSelector}</div>
        </div>

        <TabsContent value="league">
          <div className="flex flex-col gap-4">
            {leagueGroups.map(GroupCard)}
          </div>
        </TabsContent>

        {hasConferences ? (
          <TabsContent value="conference">
            <div className="flex flex-col gap-4">
              {conferenceGroups.map(GroupCard)}
            </div>
          </TabsContent>
        ) : null}

        {hasDivisions ? (
          <TabsContent value="division">
            <div className="flex flex-col gap-4 xl:grid xl:grid-cols-2">
              {divisionGroups.map(GroupCard)}
            </div>
          </TabsContent>
        ) : null}

        {hasWildCard ? (
          <TabsContent value="wildcard">
            <div className="flex flex-col gap-6">
              {wildCardConferences.map(({ conference, groups }) => (
                <div key={conference} className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {conference}
                  </h2>
                  <div className="flex flex-col gap-4">
                    {groups.map(GroupCard)}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground pt-4 text-xs">
              {t("PlayoffCutLineHint")}
            </p>
          </TabsContent>
        ) : null}
      </Tabs>
      {clinchLegend}
    </>
  );
}
