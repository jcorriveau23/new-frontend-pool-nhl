"use client";

/*
How a survivor date's picks were spread across the teams.

The standard survivor chart: one bar per team, as long as the number of people
who backed it, most-picked at the top. Deep into a season that is the question
the pool actually argues about — whether the field piled onto one favourite, and
whether that favourite went down.

Horizontal, because the categories are NHL team names and a column chart would
turn them into rotated stubs. The bars are labelled at the tip and the X axis
and gridlines are gone with them: every value is on screen already, so an axis
would only repeat it in fainter ink.

Colour carries the outcome, and never on its own — the count rides each bar,
the legend names each outcome in words, and the dialog around this has a table
view. See `SURVIVOR_OUTCOME_COLORS` for why the fills are teal and orange
rather than the standings grid's green and red.
*/

import * as React from "react";
import { useTranslations } from "next-intl";
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { PICK_OUTCOME_LABEL_KEY } from "@/lib/survivor";
import { TeamPickTally } from "@/lib/survivor-week-stats";
import team_info from "@/lib/teams";

import { SURVIVOR_OUTCOME_COLORS } from "./colors";

interface Props {
  teams: TeamPickTally[];
  // Of the picks made, so the tooltip can say "7 of 24" rather than a bare
  // percentage somebody has to take on trust.
  picksMade: number;
}

const teamName = (teamId: number) =>
  team_info[teamId]?.fullName ?? `#${teamId}`;

// Enough room for the longest team name at this type size ("Columbus Blue
// Jackets"), so a tick is never clipped into something unreadable.
const NAME_WIDTH = 152;

// One bar plus its share of the air between bars. The chart grows with its
// rows rather than squeezing twenty teams into a fixed height, the way
// `ContractValueChart` does.
const ROW_HEIGHT = 30;

// Capped rather than filling the band: the leftover is the air that keeps a
// stack of bars from reading as a solid block.
const BAR_SIZE = 16;

const percent = (share: number) => `${Math.round(share * 100)}%`;

function PickTooltip({
  active,
  payload,
  picksMade,
}: TooltipProps<ValueType, NameType> & { picksMade: number }) {
  const t = useTranslations();

  if (!active || !payload?.length) {
    return null;
  }

  const team = payload[0].payload as TeamPickTally;

  return (
    <div className="border-border/50 bg-background w-56 rounded-lg border px-2.5 py-2 text-xs shadow-xl">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{teamName(team.teamId)}</span>
        <span className="font-semibold tabular-nums">
          {percent(team.share)}
        </span>
      </div>
      <p className="text-muted-foreground mt-0.5">
        {t("SurvivorWeekPicksOnTeam", {
          count: team.count,
          total: picksMade,
        })}
      </p>
      <p className="mt-1.5 flex items-center gap-2 border-t pt-1.5">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-[2px]"
          style={{ backgroundColor: SURVIVOR_OUTCOME_COLORS[team.outcome] }}
        />
        {/* The outcome in words, which is what makes the fill above a
        reminder rather than the only way to read the bar. */}
        <span>{t(PICK_OUTCOME_LABEL_KEY[team.outcome])}</span>
      </p>
    </div>
  );
}

export function SurvivorWeekPicksChart({ teams, picksMade }: Props) {
  const t = useTranslations();

  // `ChartContainer` wants a config for its CSS variables; the fills here are
  // per-bar rather than per-series, so there is one entry and the `Cell`s
  // below carry the colour.
  const chartConfig = React.useMemo(
    () => ({ count: { label: t("SurvivorWeekPicksAxis") } }),
    [t],
  );

  if (teams.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-xs">
        {t("SurvivorWeekNobodyPicked")}
      </p>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto w-full"
      style={{ height: teams.length * ROW_HEIGHT + 16 }}
    >
      <BarChart
        accessibilityLayer
        data={teams}
        layout="vertical"
        // Room on the right for the count that rides each bar's tip.
        margin={{ left: 0, right: 28, top: 4, bottom: 4 }}
        barCategoryGap={8}
      >
        {/* Hidden, not absent: the bars still need a measured domain, and the
        counts are all directly labelled so the ticks would only repeat them. */}
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="teamId"
          tickLine={false}
          axisLine={false}
          width={NAME_WIDTH}
          tickMargin={6}
          tick={{ fontSize: 11 }}
          tickFormatter={(teamId: number) => teamName(teamId)}
        />
        <ChartTooltip
          cursor={false}
          content={<PickTooltip picksMade={picksMade} />}
        />
        <Bar
          dataKey="count"
          barSize={BAR_SIZE}
          // Rounded at the data end, square where it leaves the baseline.
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        >
          {teams.map((team) => (
            <Cell
              key={team.teamId}
              fill={SURVIVOR_OUTCOME_COLORS[team.outcome]}
            />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            offset={6}
            className="fill-muted-foreground"
            fontSize={11}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
