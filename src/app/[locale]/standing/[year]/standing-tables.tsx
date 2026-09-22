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

/*
Every column is shown at every width and the table scrolls sideways inside its
card, like the pool `DataTable`. The rank and the team travel with the scroll,
so a stat read halfway through the row still has a team attached to it.
*/
const PINNED_CELL =
  "sticky z-[1] bg-card group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))]";
/*
The team column sticks at exactly the width of the rank column, so the two read
that width from the same variable, set on the table below. `min-w` is what
makes the column obey it: a plain `width` is only a suggestion to the auto
table layout, which drops the column back to its content as soon as the table
is wider than its scroll port — precisely when the offset has to be right.
*/
const RANK_CELL = `${PINNED_CELL} left-0 w-[var(--rank-width)] min-w-[var(--rank-width)]`;
// Enough for a two digit sequence...
const RANK_WIDTH = "[--rank-width:2.5rem] sm:[--rank-width:3.5rem]";
// ...and for the `WC10` of the wild card race, which needs the extra room.
const WIDE_RANK_WIDTH = "[--rank-width:2.75rem] sm:[--rank-width:4.25rem]";
// The logo, the abbreviation and the clinch badge do not fit in the width the
// auto layout hands this column once the table overflows, and they spill over
// the scrolled stats rather than widening the cell, so the room is reserved
// here. A hard 1px edge reads as a clipped table; the soft shadow on the inner
// edge says the stats pass underneath the team instead.
const TEAM_CELL = `${PINNED_CELL} left-[var(--rank-width)] min-w-28 border-r shadow-[inset_-6px_0_5px_-5px_color-mix(in_oklab,var(--foreground)_25%,transparent)] sm:min-w-32`;

// A group of teams rendered as a single table, `rank` being the sequence to
// display in the leftmost column (league, conference, division or wild card).
interface Group {
  key: string;
  title?: string;
  teams: Standing[];
  rank: (team: Standing, index: number) => React.ReactNode;
  // Draw the playoff cut line under the row at this index (0 based).
  cutAfterIndex?: number;
  // The wild card race ranks its teams `WC1` to `WC10` instead of a bare
  // sequence, which no longer fits in the standard rank column.
  wideRank?: boolean;
}

export default function StandingTables(props: Props) {
  const t = useTranslations();

  const flags = React.useMemo(
    () => columnFlags(props.standings, props.season),
    [props.standings, props.season],
  );

  // What a section row has to span. The fixed columns are the rank, the team,
  // GP, W, L, Pts, P%, GF, GA, Diff, home, road, L10 and the streak; the others
  // come and go with the rules of the season, so they are counted from the
  // flags that add them to the header below.
  const columnCount =
    14 +
    [
      flags.otLosses,
      flags.ties,
      flags.regulationWins,
      flags.row,
      flags.shootout,
    ].filter(Boolean).length;

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
        wideRank: true,
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
        "group",
        // Under `border-separate` the row's own border is not painted, so the
        // playoff cut line is drawn by the cells of the row.
        group.cutAfterIndex === index &&
          "[&>td]:border-primary [&>td]:border-b-2",
      )}
    >
      <TableCell
        className={cn(
          RANK_CELL,
          "text-muted-foreground text-right tabular-nums",
        )}
      >
        {group.rank(team, index)}
      </TableCell>
      <TableCell className={TEAM_CELL}>
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
      <TableCell className="text-muted-foreground text-right tabular-nums">
        {pointsPercentage(team.pointPctg)}
      </TableCell>
      {flags.regulationWins ? (
        <TableCell className="text-right tabular-nums">
          {team.regulationWins}
        </TableCell>
      ) : null}
      {flags.row ? (
        <TableCell className="text-right tabular-nums">
          {team.regulationPlusOtWins}
        </TableCell>
      ) : null}
      <TableCell className="text-right tabular-nums">{team.goalFor}</TableCell>
      <TableCell className="text-right tabular-nums">
        {team.goalAgainst}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {signedDifferential(team.goalDifferential)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {record(
          team.homeWins,
          team.homeLosses,
          flags.ties ? team.homeTies : team.homeOtLosses,
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {record(
          team.roadWins,
          team.roadLosses,
          flags.ties ? team.roadTies : team.roadOtLosses,
        )}
      </TableCell>
      {flags.shootout ? (
        <TableCell className="text-right tabular-nums">
          {team.shootoutWins}-{team.shootoutLosses}
        </TableCell>
      ) : null}
      <TableCell className="text-right tabular-nums">
        {record(
          team.l10Wins,
          team.l10Losses,
          flags.ties ? team.l10Ties : team.l10OtLosses,
        )}
      </TableCell>
      <TableCell className="text-right">
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

  /*
  Groups sharing a table are separated by a full width section row rather than
  by a card of their own: the wild card race is read by comparing the teams
  chasing the last two spots with the ones holding the division seeds, which
  only works when all of them line up under the same columns and scroll
  together. A single group needs no section row, the card title already says
  what it is.
  */
  const SectionRow = (group: Group) => (
    <TableRow key={`${group.key}-section`} className="hover:bg-transparent">
      <TableCell colSpan={columnCount} className="bg-muted/50 font-semibold">
        {/* Pinned like the rank and the team, so the section a row belongs to
            stays readable however far the stats are scrolled. */}
        <span className="sticky left-1 inline-block sm:left-3">
          {group.title}
        </span>
      </TableCell>
    </TableRow>
  );

  const StandingTable = (groups: Group[]) => (
    /*
    `Table` cells carry no padding of their own, the density here matches the
    one used by the pool `DataTable` so both read the same.

    `border-separate` is what makes the pinned columns work, for the same
    reason as in that table: under the collapsed border model the borders
    belong to the table rather than to the cells, so a row line would slide
    out from under a sticky cell instead of staying with it. The row lines
    below therefore live on the cells.
    */
    <Table
      className={cn(
        groups.some((group) => group.wideRank) ? WIDE_RANK_WIDTH : RANK_WIDTH,
        "border-separate border-spacing-0 [&_td]:border-b [&_td]:px-1 [&_td]:py-1.5 [&_td]:whitespace-nowrap [&_th]:border-b [&_th]:px-1 [&_th]:whitespace-nowrap [&_tbody_tr:last-child>td]:border-b-0 sm:[&_td]:px-3 sm:[&_td]:py-2 sm:[&_th]:px-3",
      )}
    >
      <TableHeader>
        {/* The header is pinned sideways like the rows, so it must not pick up
            a hover tint the pinned cells would not repaint. */}
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(RANK_CELL, "text-right")}>#</TableHead>
          <TableHead className={TEAM_CELL}>{t("Team")}</TableHead>
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
          <TableHead className="text-right">{t("PointsPctShort")}</TableHead>
          {flags.regulationWins ? (
            <TableHead className="text-right">
              {t("RegulationWinsShort")}
            </TableHead>
          ) : null}
          {flags.row ? (
            <TableHead className="text-right">
              {t("RegulationPlusOtWinsShort")}
            </TableHead>
          ) : null}
          <TableHead className="text-right">{t("GoalsForShort")}</TableHead>
          <TableHead className="text-right">{t("GoalsAgainstShort")}</TableHead>
          <TableHead className="text-right">
            {t("GoalDifferentialShort")}
          </TableHead>
          <TableHead className="text-right">{t("HomeRecordShort")}</TableHead>
          <TableHead className="text-right">{t("RoadRecordShort")}</TableHead>
          {flags.shootout ? (
            <TableHead className="text-right">{t("ShootoutShort")}</TableHead>
          ) : null}
          <TableHead className="text-right">{t("LastTenShort")}</TableHead>
          <TableHead className="text-right">{t("StreakShort")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => (
          <React.Fragment key={group.key}>
            {groups.length > 1 && group.title ? SectionRow(group) : null}
            {group.teams.map((team, index) => StandingRow(team, group, index))}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  );

  // Every view sits on a card surface. The league table is the only card
  // without a title, it needs no header to say what it is.
  const GroupsCard = (
    key: string,
    title: string | undefined,
    groups: Group[],
  ) => (
    <Card key={key} className="overflow-hidden">
      {title ? (
        <CardHeader className="py-4">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={cn("px-0 pb-2", !title && "pt-2")}>
        {StandingTable(groups)}
      </CardContent>
    </Card>
  );

  const GroupCard = (group: Group) =>
    GroupsCard(group.key, group.title, [group]);

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
          {/* The tab labels are long once translated ("Meilleurs deuxièmes"),
              wider than a phone screen. Left alone the strip stretches the
              whole page sideways, so it scrolls on its own instead. */}
          <div className="min-w-0 overflow-x-auto text-left">
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
          </div>
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
            <div className="flex flex-col gap-4">
              {wildCardConferences.map(({ conference, groups }) =>
                GroupsCard(conference, conference, groups),
              )}
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
