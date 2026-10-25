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
import { ChartColumnBig, Lock, Skull, Trophy } from "lucide-react";
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
  DateClock,
  ParticipantStatus,
  PickOutcome,
  SurvivorPool,
  SurvivorStandingRow,
  SurvivorStandings,
  WeekStatus,
} from "@/data/survivor/model";
import {
  PICK_OUTCOME_LABEL_KEY,
  PickCellState,
  arePicksRevealed,
  clockForWeek,
  currentWeek,
  dateClocks,
  pickCellState,
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

const NAME_CELL = "sticky left-0 z-[1] max-w-[40vw] sm:max-w-xs";
const NAME_CELL_BG = "bg-background group-hover:bg-muted/50";

// How a settled outcome reads in a cell. A date still to be settled and a game
// that never produced a result are both "nothing came of it", and are kept
// apart because they are not the same thing to a participant.
const OUTCOME_STYLE: Record<PickOutcome, string> = {
  [PickOutcome.Won]: "bg-emerald-500/15",
  [PickOutcome.Lost]: "bg-destructive/15",
  [PickOutcome.Void]: "bg-muted",
  [PickOutcome.Pending]: "",
};

/*
How a result the games have produced but the settlement has not recorded reads.

The same two colours as a settled outcome, outlined rather than filled: it is
the same result, and it is not on the board yet. Filling it identically would
say the strike had been counted when the standings' own numbers say it has
not; leaving it blank is what this whole thing is fixing.
*/
const PROVISIONAL_STYLE: Record<PickOutcome.Won | PickOutcome.Lost, string> = {
  [PickOutcome.Won]: "bg-emerald-500/5 ring-1 ring-emerald-500/40 ring-inset",
  [PickOutcome.Lost]: "bg-destructive/5 ring-1 ring-destructive/40 ring-inset",
};

const cellStyle = (state: PickCellState): string => {
  switch (state.kind) {
    case "settled":
      return OUTCOME_STYLE[state.outcome];
    case "provisional":
      return PROVISIONAL_STYLE[state.outcome];
    default:
      return "";
  }
};

/*
What the cell says, in words.

The wording is not decoration: the colour and the padlock are both channels a
reader may not have, so whatever the cell shows is also in the label and the
tooltip. A provisional result says both halves — what happened, and that it has
not been counted yet.
*/
const cellStateKey = (state: PickCellState): string => {
  switch (state.kind) {
    case "settled":
      return PICK_OUTCOME_LABEL_KEY[state.outcome];
    case "provisional":
      return state.outcome === PickOutcome.Won
        ? "SurvivorPickWonUnsettled"
        : "SurvivorPickLostUnsettled";
    case "locked":
      return "SurvivorPickLocked";
    default:
      return "SurvivorPickStillOpen";
  }
};

function PickCell({
  row,
  week,
  clocks,
}: {
  row: SurvivorStandingRow;
  week: number;
  clocks: DateClock[];
}) {
  const t = useTranslations();
  const pick = row.picks[String(week)];

  if (pick === undefined) {
    // They made no pick that date — missed it, or had nothing left to pick.
    return (
      <TableCell className="text-muted-foreground text-center">—</TableCell>
    );
  }

  const name = team_info[pick.team_id]?.fullName ?? `#${pick.team_id}`;

  /*
  What this pick has come to, which on an unsettled date is four different
  things — see `pickCellState`. The reveal comes with the date's first game,
  the deadline with its last, and the results with each game as it ends, so one
  column holds picks that can still move, picks that are in, and picks the
  games have already decided.

  A padlock marks the middle of those three. The one thing it is not put on is
  a decided pick: its game being over is what the colour is saying, and a
  padlock there would read as the only thing worth knowing about it.
  */
  const state = pickCellState(pick, week, clocks);
  const stateLabel = t(cellStateKey(state));

  return (
    <TableCell className={cn("text-center", cellStyle(state))}>
      <Tooltip>
        <TooltipTrigger
          aria-label={`${name} — ${stateLabel}`}
          className="relative inline-flex cursor-default"
        >
          <TeamLogo teamId={pick.team_id} width={24} height={24} alt={name} />
          {state.kind === "locked" ? (
            <Lock
              aria-hidden="true"
              className="text-muted-foreground bg-background absolute -right-1.5 -bottom-1 size-3 rounded-full p-px"
            />
          ) : null}
        </TooltipTrigger>
        <TooltipContent>
          {name} — {stateLabel}
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
  // One clock per revealed date still waiting to be settled, which is what
  // every column reads itself against.
  const clocks = dateClocks(standings);

  // The date in view when its picks are not public yet, which is the question
  // the grid otherwise leaves somebody asking.
  const selected =
    selectedWeek === null ? null : weekByNumber(pool, selectedWeek);
  const selectedIsHidden =
    selected !== null && !arePicksRevealed(standings.revealed_weeks, selected);
  const selectedClock =
    selected === null ? null : clockForWeek(clocks, selected.week);
  const selectedIsRevealed =
    selected !== null && arePicksRevealed(standings.revealed_weeks, selected);
  /*
  The date being played, mid-flight: its first game has started so the grid is
  showing everybody's pick, and its last has not, so the teams yet to play can
  still be picked. The most common state on a Saturday afternoon, and the one
  that most needs saying — a column of picks reads as a closed date otherwise.

  Judged on the clock rather than on the week's status, which stays `Open`
  throughout: a date that has begun has teams in play, and one that has not has
  none. `pick_window_closed` is what keeps the second half of the sentence
  honest — once every game has started there are no teams left yet to play, and
  the line below this one has the right thing to say about that date instead.
  */
  const selectedIsUnderWay =
    selectedIsRevealed &&
    selectedClock !== null &&
    selectedClock.started_team_ids.length > 0 &&
    selectedClock.pick_window_closed !== true;

  /*
  The date in view has results the settlement has not recorded.

  The gap this grid used to show nothing in: the games are over, everybody can
  see who went out, and the standings' own counts — the wins column, the
  losses, the skulls — do not move until somebody settles the date. Both halves
  have to be said, or the colours read as a board that has already been
  updated.
  */
  const selectedHasProvisionalResults =
    selectedIsRevealed &&
    selectedClock !== null &&
    (selectedClock.won_team_ids ?? []).length +
      (selectedClock.lost_team_ids ?? []).length >
      0;

  /*
  And the other way round: a date whose first puck has yet to drop, whose picks
  are in the grid anyway because this pool plays them public. Told apart by the
  setting rather than by the week's status, since a date revealed by its own
  first game is the case above.
  */
  const selectedIsOpenAndPublic =
    selected !== null &&
    selected.status === WeekStatus.Open &&
    !selectedIsUnderWay &&
    !selectedHasProvisionalResults &&
    pool.settings.public_picks &&
    currentWeek(pool)?.week === selected.week &&
    selectedIsRevealed;

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

      {selectedIsUnderWay ? (
        <p className="text-muted-foreground text-sm">
          {t("SurvivorWeekUnderWay", { week: selected.week })}
        </p>
      ) : null}

      {selectedHasProvisionalResults ? (
        <p className="text-muted-foreground text-sm">
          {t("SurvivorWeekResultsNotSettled", { week: selected.week })}
        </p>
      ) : null}

      {selectedIsOpenAndPublic ? (
        <p className="text-muted-foreground text-sm">
          {t("SurvivorWeekPicksArePublic", { week: selected.week })}
        </p>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(NAME_CELL, "bg-background")}>
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
                <TableHead key={week} className="text-center whitespace-nowrap">
                  <WeekStatsDialog
                    week={week}
                    pickDate={entry?.pick_date ?? null}
                    rows={standings.rows}
                    clock={clockForWeek(clocks, week)}
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
                className={cn("group", isOut && "text-muted-foreground")}
              >
                <TableCell
                  className={cn(NAME_CELL, NAME_CELL_BG, "font-medium")}
                >
                  <span className="flex items-center gap-1.5">
                    {winners.has(row.participant_id) ? (
                      <Trophy className="size-4 shrink-0 text-amber-500" />
                    ) : null}
                    {isOut ? <Skull className="size-3.5 shrink-0" /> : null}
                    <span className="min-w-0 truncate">{row.name}</span>
                    {isOut && row.eliminated_week !== null ? (
                      <span className="shrink-0 text-xs whitespace-nowrap">
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
                  <PickCell key={week} row={row} week={week} clocks={clocks} />
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
