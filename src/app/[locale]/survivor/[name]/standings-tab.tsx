"use client";

/*
The standings: who is left, and what everybody picked on the dates that have
been revealed.

The rows arrive already counted and already sorted — a pool of hundreds would
otherwise ship every pick of every date for the browser to aggregate, on the
page people reload all Saturday evening. This module only renders them.

Only revealed dates have columns, and only up to the one in view. A hidden date
is absent rather than blank, and not by omission here: the backend leaves its
picks out of the payload entirely, because one that carried them would reveal
them to whoever read the response. The screen says so rather than leaving a gap
nobody can explain.

Which dates those are is the backend's call, taken from `revealed_weeks`
rather than worked out again here: a date goes public once its last game has
started, and the browser holds none of the league's schedule to know when that
was. In a pool with `public_picks` on, the date being played is in the grid
before then — that is what the owner turned it on for — so the screen says
that too, or a column of picks for a date still taking them would read as a
deadline already passed.
*/

import * as React from "react";
import { ChartColumnBig, Skull, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamLogo } from "@/components/team-logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import team_info from "@/lib/teams";
import { cn } from "@/lib/utils";
import {
  ParticipantStatus,
  PickOutcome,
  SurvivorPool,
  SurvivorStandingRow,
  SurvivorStandings,
  WeekStatus,
} from "@/data/survivor/model";
import {
  PICK_OUTCOME_LABEL_KEY,
  arePicksRevealed,
  currentWeek,
  revealedWeeksUpTo,
  weekByNumber,
} from "@/lib/survivor";
import WeekStatsDialog from "./week-stats-dialog";

interface Props {
  pool: SurvivorPool;
  standings: SurvivorStandings;
  // The date in view, shared with the pick screen. The grid stops there, so
  // reading back through the season is a matter of moving the selector.
  selectedWeek: number | null;
}

// How an outcome reads in a cell. A date still to be settled and a game that
// never produced a result are both "nothing came of it", and are kept apart
// because they are not the same thing to a participant.
const OUTCOME_STYLE: Record<PickOutcome, string> = {
  [PickOutcome.Won]: "bg-emerald-500/15",
  [PickOutcome.Lost]: "bg-destructive/15",
  [PickOutcome.Void]: "bg-muted",
  [PickOutcome.Pending]: "",
};

function PickCell({ row, week }: { row: SurvivorStandingRow; week: number }) {
  const t = useTranslations();
  const pick = row.picks[String(week)];

  if (pick === undefined) {
    // They made no pick that date — missed it, or had nothing left to pick.
    return (
      <TableCell className="text-muted-foreground text-center">—</TableCell>
    );
  }

  const name = team_info[pick.team_id]?.fullName ?? `#${pick.team_id}`;
  const outcome = t(PICK_OUTCOME_LABEL_KEY[pick.outcome]);

  return (
    <TableCell className={cn("text-center", OUTCOME_STYLE[pick.outcome])}>
      <Tooltip>
        <TooltipTrigger
          aria-label={`${name} — ${outcome}`}
          className="inline-flex cursor-default"
        >
          <TeamLogo teamId={pick.team_id} width={24} height={24} alt={name} />
        </TooltipTrigger>
        <TooltipContent>
          {name} — {outcome}
        </TooltipContent>
      </Tooltip>
    </TableCell>
  );
}

export default function StandingsTab(props: Props) {
  const { pool, standings, selectedWeek } = props;
  const t = useTranslations();

  const winners = new Set(standings.winners ?? []);
  const columns = revealedWeeksUpTo(standings.revealed_weeks, selectedWeek);

  // The date in view when its picks are not public yet, which is the question
  // the grid otherwise leaves somebody asking.
  const selected =
    selectedWeek === null ? null : weekByNumber(pool, selectedWeek);
  const selectedIsHidden =
    selected !== null && !arePicksRevealed(standings.revealed_weeks, selected);
  // And the other way round: a date still taking picks whose picks are in the
  // grid because this pool plays with them public. A date revealed by its own
  // deadline is not this case — nothing is left to pick on it — so it is told
  // apart by the pool's setting rather than by the week's status alone.
  const selectedIsOpenAndPublic =
    selected !== null &&
    selected.status === WeekStatus.Open &&
    pool.settings.public_picks &&
    currentWeek(pool)?.week === selected.week &&
    arePicksRevealed(standings.revealed_weeks, selected);

  return (
    <div className="space-y-4 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {t("SurvivorStillAlive", { count: standings.alive_count })}
        </Badge>
        <Badge variant="outline">
          {t("SurvivorEliminated", { count: standings.eliminated_count })}
        </Badge>
        {pool.settings.strikes_allowed > 0 ? (
          <Badge variant="outline">
            {t("SurvivorStrikesAllowed", {
              count: pool.settings.strikes_allowed,
            })}
          </Badge>
        ) : null}
      </div>

      {standings.revealed_weeks.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("SurvivorNothingRevealedYet")}
        </p>
      ) : null}

      {selectedIsHidden ? (
        <p className="text-muted-foreground text-sm">
          {t("SurvivorWeekStillOpen", { week: selected.week })}
        </p>
      ) : null}

      {selectedIsOpenAndPublic ? (
        <p className="text-muted-foreground text-sm">
          {t("SurvivorWeekPicksArePublic", { week: selected.week })}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-inherit">
                {t("Pooler")}
              </TableHead>
              {pool.settings.strikes_allowed > 0 ? (
                <TableHead className="text-center">
                  {t("SurvivorStrikes")}
                </TableHead>
              ) : null}
              <TableHead className="text-center">{t("SurvivorWins")}</TableHead>
              {columns.map((week) => {
                // The number alone does not say which Saturday it was.
                const entry = weekByNumber(pool, week);
                return (
                  <TableHead
                    key={week}
                    className="text-center whitespace-nowrap"
                  >
                    {/*
                    The header is the handle for that date's pick stats. A
                    button rather than the plain text it was, because the
                    column is where somebody already is when they wonder how
                    the field split.
                    */}
                    <WeekStatsDialog
                      week={week}
                      pickDate={entry?.pick_date ?? null}
                      rows={standings.rows}
                      trigger={
                        <button
                          type="button"
                          className="hover:text-foreground focus-visible:ring-ring -mx-1 cursor-pointer rounded px-1 focus-visible:ring-2 focus-visible:outline-none"
                          aria-label={t("SurvivorWeekStatsTitle", { week })}
                        >
                          <span className="flex items-center gap-1">
                            {t("SurvivorWeekLabel", { week })}
                            <ChartColumnBig className="size-3 opacity-60" />
                          </span>
                          {entry !== null ? (
                            <span className="text-muted-foreground block text-[10px] font-normal">
                              {entry.pick_date}
                            </span>
                          ) : null}
                        </button>
                      }
                    />
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.rows.map((row) => {
              const isOut = row.status === ParticipantStatus.Eliminated;
              return (
                <TableRow
                  key={row.participant_id}
                  className={cn(isOut && "text-muted-foreground")}
                >
                  <TableCell className="sticky left-0 bg-inherit font-medium">
                    <span className="flex items-center gap-1.5">
                      {winners.has(row.participant_id) ? (
                        <Trophy className="size-4 text-amber-500" />
                      ) : null}
                      {isOut ? <Skull className="size-3.5" /> : null}
                      <span className="truncate">{row.name}</span>
                      {isOut && row.eliminated_week !== null ? (
                        <span className="text-xs">
                          {t("SurvivorOutInWeek", {
                            week: row.eliminated_week,
                          })}
                        </span>
                      ) : null}
                    </span>
                  </TableCell>
                  {pool.settings.strikes_allowed > 0 ? (
                    <TableCell className="text-center">{row.strikes}</TableCell>
                  ) : null}
                  <TableCell className="text-center">{row.wins}</TableCell>
                  {columns.map((week) => (
                    <PickCell key={week} row={row} week={week} />
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
