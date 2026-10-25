"use client";

/*
One participant's season, opened from their name in the standings.

The grid answers "what did everybody pick on this date". This answers the other
question people ask of it — "how has Marc got this far" — which the grid can
only answer by reading one row across twenty-six columns on a phone.

Everything here is already in the standings payload the page holds, so opening
it costs no request: a row carries its picks per revealed date, and the dates
themselves come from the pool. The outcome of each is resolved through the same
`pickCellState` the grid uses, so a date showing a provisional result here says
what the cell it was opened from says rather than "not settled" beside it.
*/

import * as React from "react";
import { Lock, Skull, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
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
import team_info from "@/lib/teams";
import { cn } from "@/lib/utils";
import {
  DateClock,
  ParticipantStatus,
  PickOutcome,
  SurvivorPool,
  SurvivorStandingRow,
} from "@/data/survivor/model";
import {
  PickCellState,
  participantHistory,
  pickCellStateLabelKey,
} from "@/lib/survivor";

interface Props {
  pool: SurvivorPool;
  row: SurvivorStandingRow;
  revealedWeeks: number[];
  clocks: DateClock[];
  trigger: React.ReactElement;
}

const teamName = (teamId: number) =>
  team_info[teamId]?.fullName ?? `#${teamId}`;

/*
How a date's result reads down the list.

The same two colours the grid uses, and the same restraint about which of them
is filled: a result the settlement has not recorded is outlined, because the
wins beside it have not counted it yet.
*/
const ROW_TONE: Record<PickOutcome, string> = {
  [PickOutcome.Won]: "bg-emerald-500/10",
  [PickOutcome.Lost]: "bg-destructive/10",
  [PickOutcome.Void]: "bg-muted/50",
  [PickOutcome.Pending]: "",
};

const rowTone = (state: PickCellState | null): string => {
  if (state === null) {
    return "";
  }
  switch (state.kind) {
    case "settled":
      return ROW_TONE[state.outcome];
    case "provisional":
      return state.outcome === PickOutcome.Won
        ? "bg-emerald-500/5"
        : "bg-destructive/5";
    default:
      return "";
  }
};

export default function ParticipantHistoryDialog(props: Props) {
  const { pool, row, revealedWeeks, clocks, trigger } = props;
  const t = useTranslations();

  /*
  Built when the dialog is, not per render: it walks every revealed date, and a
  pool in March has twenty-odd of them per participant.
  */
  const entries = React.useMemo(
    () => participantHistory({ pool, row, revealedWeeks, clocks }),
    [pool, row, revealedWeeks, clocks],
  );

  const isOut = row.status === ParticipantStatus.Eliminated;

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isOut ? <Skull className="size-4 shrink-0" /> : null}
            <span className="min-w-0 truncate">{row.name}</span>
          </DialogTitle>
          <DialogDescription>
            {isOut && row.eliminated_week !== null
              ? t("SurvivorHistoryOut", { week: row.eliminated_week })
              : t("SurvivorHistoryAlive")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {t("SurvivorHistoryWins", { count: row.wins })}
            </Badge>
            {pool.settings.strikes_allowed > 0 ? (
              <Badge variant="outline">
                {t("SurvivorHistoryStrikes", { count: row.strikes })}
              </Badge>
            ) : null}
            {/*
            How many of the league they have spent. Counted from the picks on
            show rather than from the pool, which does not carry it — so it is
            the teams used across the revealed dates, which for anybody but a
            latecomer is their whole season.
            */}
            <Badge variant="outline">
              {t("SurvivorHistoryTeamsUsed", {
                count: new Set(
                  entries
                    .map((entry) => entry.teamId)
                    .filter((teamId): teamId is number => teamId !== null),
                ).size,
              })}
            </Badge>
          </div>

          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("SurvivorHistoryNothingYet")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("SurvivorSelectWeek")}</TableHead>
                  <TableHead>{t("SurvivorWeekTeamColumn")}</TableHead>
                  <TableHead>{t("SurvivorWeekOutcomeColumn")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow
                    key={entry.week}
                    className={cn("hover:bg-transparent", rowTone(entry.state))}
                  >
                    <TableCell className="align-top">
                      <span className="font-medium whitespace-nowrap">
                        {t("SurvivorWeekLabel", { week: entry.week })}
                      </span>
                      {entry.pickDate === null ? null : (
                        <span className="text-muted-foreground block text-xs">
                          {entry.pickDate}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.teamId === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <TeamLogo
                            teamId={entry.teamId}
                            width={20}
                            height={20}
                            alt={teamName(entry.teamId)}
                          />
                          <span className="min-w-0 truncate">
                            {teamName(entry.teamId)}
                          </span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {/*
                      A date they let go by is in the list with nothing rather
                      than left out: "you missed week 4" is part of a season,
                      and skipping it would read as a season of nothing but
                      picks.
                      */}
                      {entry.state === null ? (
                        t("SurvivorHistoryNoPick")
                      ) : (
                        <span className="flex items-center gap-1.5">
                          {entry.state.kind === "settled" &&
                          entry.state.outcome === PickOutcome.Won ? (
                            <Trophy className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          ) : null}
                          {entry.state.kind === "locked" ? (
                            <Lock className="size-3 shrink-0" />
                          ) : null}
                          {t(pickCellStateLabelKey(entry.state))}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
