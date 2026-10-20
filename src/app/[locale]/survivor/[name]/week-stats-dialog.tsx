"use client";

/*
A date's pick stats, opened from its column in the standings.

Three things, in the order somebody reads them: the headline numbers, the
spread across the teams, and the same spread as a table. The table is not a
fallback — it is the channel that always works, for a reader the fills do not
reach and for anybody who wants the exact numbers rather than a bar's length.

It hangs off the column header rather than sitting under the table because the
question is always about one date, and the header is where somebody is already
looking when they ask it. The grid underneath keeps a column per revealed date,
so every one of them has its own.
*/

import * as React from "react";
import { ChartColumnBig, Table2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamLogo } from "@/components/team-logo";
import { SurvivorOutcomeLegend } from "@/components/chart/survivor-outcome-legend";
import { SurvivorWeekPicksChart } from "@/components/chart/lazy";
import { SurvivorStandingRow } from "@/data/survivor/model";
import { PICK_OUTCOME_LABEL_KEY } from "@/lib/survivor";
import { outcomesPresent, survivorWeekStats } from "@/lib/survivor-week-stats";
import team_info from "@/lib/teams";

interface Props {
  week: number;
  // The Saturday it was played on, so the dialog names a date rather than only
  // a number.
  pickDate: string | null;
  rows: SurvivorStandingRow[];
  trigger: React.ReactElement;
}

const teamName = (teamId: number) =>
  team_info[teamId]?.fullName ?? `#${teamId}`;

/*
One headline number.

The stat-tile shape: a label in sentence case and a value, with the value in
proportional figures — these are standalone numbers, not a column, so lining
the digits up would only make them look loose.
*/
function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-0.5 text-xl font-semibold">{value}</p>
      {hint === undefined ? null : (
        <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
      )}
    </div>
  );
}

export default function WeekStatsDialog({
  week,
  pickDate,
  rows,
  trigger,
}: Props) {
  const t = useTranslations();

  /*
  Counted when the dialog is built rather than per render. It is cheap — one
  pass over the standings rows — but it is also the input the chart's bar order
  is derived from, and recomputing it on every render would hand Recharts a new
  array each time.
  */
  const stats = React.useMemo(
    () => survivorWeekStats(rows, week),
    [rows, week],
  );
  const outcomes = React.useMemo(() => outcomesPresent(stats), [stats]);

  /*
  A week the whole field was on one team opens as the table.

  One bar is not a chart — its length compares against nothing, and the number
  it would carry is already in the tiles above. It stays a toggle rather than a
  hard case so the view is still consistent with every other week.
  */
  const [showTable, setShowTable] = React.useState(stats.teams.length === 1);

  const percent = (share: number) => `${Math.round(share * 100)}%`;

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("SurvivorWeekStatsTitle", { week })}</DialogTitle>
          <DialogDescription>
            {pickDate === null
              ? t("SurvivorWeekStatsDescriptionNoDate")
              : t("SurvivorWeekStatsDescription", { date: pickDate })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatTile
              label={t("SurvivorWeekPicksMade")}
              value={`${stats.picksMade}/${stats.fieldSize}`}
              hint={
                stats.noPick > 0
                  ? t("SurvivorWeekNoPickCount", { count: stats.noPick })
                  : undefined
              }
            />
            <StatTile
              label={t("SurvivorWeekMostPicked")}
              value={
                stats.mostPicked === null
                  ? "—"
                  : percent(stats.mostPicked.share)
              }
              hint={
                stats.mostPicked === null
                  ? undefined
                  : teamName(stats.mostPicked.teamId)
              }
            />
            <StatTile
              label={t("SurvivorWeekEliminated")}
              value={String(stats.eliminated)}
            />
          </div>

          {/*
          The legend sits above both views: it is the words behind the fills,
          and the table carries the same vocabulary in its own column.
          */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SurvivorOutcomeLegend
              outcomes={outcomes}
              counts={stats.byOutcome}
            />
            {stats.teams.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setShowTable((shown) => !shown)}
              >
                {showTable ? (
                  <ChartColumnBig className="size-4" />
                ) : (
                  <Table2 className="size-4" />
                )}
                {t(
                  showTable ? "SurvivorWeekShowChart" : "SurvivorWeekShowTable",
                )}
              </Button>
            ) : null}
          </div>

          {showTable ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("SurvivorWeekTeamColumn")}</TableHead>
                  <TableHead className="text-right">
                    {t("SurvivorWeekPicksAxis")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("SurvivorWeekShareColumn")}
                  </TableHead>
                  <TableHead>{t("SurvivorWeekOutcomeColumn")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.teams.map((team) => (
                  <TableRow key={team.teamId}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <TeamLogo
                          teamId={team.teamId}
                          width={20}
                          height={20}
                          alt={teamName(team.teamId)}
                        />
                        <span className="truncate">
                          {teamName(team.teamId)}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {team.count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {percent(team.share)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t(PICK_OUTCOME_LABEL_KEY[team.outcome])}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <SurvivorWeekPicksChart
              teams={stats.teams}
              picksMade={stats.picksMade}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
