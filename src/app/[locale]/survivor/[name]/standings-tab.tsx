"use client";

/*
The standings: who is left, and what everybody picked on the dates that have
been revealed.

The rows arrive already counted and already sorted — a pool of hundreds would
otherwise ship every pick of every date for the browser to aggregate, on the
page people reload all Saturday evening. This module only renders them.

Only revealed dates have columns. An open date is absent rather than blank: a
payload that carried its picks would reveal them to whoever read the response.
*/

import * as React from "react";
import { Skull, Trophy } from "lucide-react";
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
} from "@/data/survivor/model";

interface Props {
  pool: SurvivorPool;
  standings: SurvivorStandings;
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

const OUTCOME_LABEL_KEY: Record<PickOutcome, string> = {
  [PickOutcome.Won]: "SurvivorOutcomeWon",
  [PickOutcome.Lost]: "SurvivorOutcomeLost",
  [PickOutcome.Void]: "SurvivorOutcomeVoid",
  [PickOutcome.Pending]: "SurvivorOutcomePending",
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
  const outcome = t(OUTCOME_LABEL_KEY[pick.outcome]);

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
  const { pool, standings } = props;
  const t = useTranslations();

  const winners = new Set(standings.winners ?? []);

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
              {standings.revealed_weeks.map((week) => (
                <TableHead key={week} className="text-center">
                  {week}
                </TableHead>
              ))}
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
                  {standings.revealed_weeks.map((week) => (
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
