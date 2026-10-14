"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Customized,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { usePoolContext } from "@/context/pool-context";
import { PeriodResult } from "@/app/[locale]/pool/[name]/in-progress/records-tab/records-calculation";

import { PARTICIPANT_COLORS } from "./colors";
import { ParticipantLegend } from "./participant-legend";
import { RankedTooltipContent } from "./ranked-tooltip";

interface MonthlyPointsChartProps {
  // Monthly aggregates, oldest first, as produced by aggregateByPeriod.
  months: PeriodResult[];
}

const formatMonth = (monthKey: string) =>
  new Date(`${monthKey}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

export function MonthlyPointsChart({ months }: MonthlyPointsChartProps) {
  const { poolInfo, selectedParticipant, updateSelectedParticipant } =
    usePoolContext();
  const t = useTranslations();

  const data = React.useMemo(
    () =>
      months.map((month) => {
        const entry: Record<string, string | number> = { month: month.key };

        for (const standing of month.standings) {
          const participant = poolInfo.participants.find(
            (user) => user.id === standing.participantId,
          );
          if (participant) {
            entry[participant.name] = standing.poolPoints;
          }
        }

        return entry;
      }),
    [months, poolInfo.participants],
  );

  const chartConfig = React.useMemo(
    () =>
      poolInfo.participants.reduce((config, participant, index) => {
        config[participant.name] = {
          label: participant.name,
          color: PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length],
        };
        return config;
      }, {} as ChartConfig),
    [poolInfo.participants],
  );

  // The legend doubles as a mini standing: participants are listed by the
  // points they made over every charted month, which is their season total.
  const standings = React.useMemo(
    () =>
      poolInfo.participants
        .map((participant) => ({
          name: participant.name,
          total: data.reduce(
            (total, month) => total + Number(month[participant.name] ?? 0),
            0,
          ),
        }))
        .sort((a, b) => b.total - a.total),
    [data, poolInfo.participants],
  );

  // What the pool made on average that month, so a bar can be read against the
  // month it was made in — scoring months and quiet months are far apart.
  const averages = React.useMemo(
    () =>
      data.map((month) =>
        poolInfo.participants.length === 0
          ? 0
          : poolInfo.participants.reduce(
              (total, participant) =>
                total + Number(month[participant.name] ?? 0),
              0,
            ) / poolInfo.participants.length,
      ),
    [data, poolInfo.participants],
  );

  return (
    <div className="grid gap-3">
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[320px] w-full"
      >
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ left: 12, right: 12, top: 8 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={formatMonth}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={36}
            tickFormatter={(value) => Math.round(value).toLocaleString()}
          />
          <ChartTooltip
            content={
              <RankedTooltipContent
                config={chartConfig}
                selectedParticipant={selectedParticipant}
                labelFormatter={formatMonth}
                showGapToLeader
              />
            }
          />
          {/* Bars keep their order whatever is selected — moving them around
              each click would make the months unreadable — so the pooler in
              view is told apart by the others fading back instead. */}
          {poolInfo.participants.map((participant) => {
            const isSelected = participant.name === selectedParticipant;
            return (
              <Bar
                key={participant.id}
                dataKey={participant.name}
                fill={chartConfig[participant.name].color as string}
                fillOpacity={isSelected ? 1 : 0.3}
                radius={2}
                isAnimationActive={false}
              />
            );
          })}
          <Customized
            component={
              <MonthlyAverageMarkers
                monthKeys={data.map((month) => month.month as string)}
                averages={averages}
              />
            }
          />
        </BarChart>
      </ChartContainer>
      <ParticipantLegend
        config={chartConfig}
        standings={standings}
        selectedParticipant={selectedParticipant}
        onSelect={updateSelectedParticipant}
      />
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-block w-4 border-t border-dashed border-current" />
        {t("MonthlyAverage")}
      </div>
    </div>
  );
}

// A band scale on the month axis, a linear one on the points axis; recharts
// hands both to whatever <Customized> renders.
type AxisScale = ((value: unknown) => number | undefined) & {
  bandwidth?: () => number;
};

interface MonthlyAverageMarkersProps {
  monthKeys: string[];
  averages: number[];
  // Injected by recharts, never passed by hand.
  xAxisMap?: Record<string, { scale?: AxisScale }>;
  yAxisMap?: Record<string, { scale?: AxisScale }>;
}

// The pool average of each month, drawn across the whole month instead of as a
// single season-wide line: the months themselves are what differ.
function MonthlyAverageMarkers({
  monthKeys,
  averages,
  xAxisMap,
  yAxisMap,
}: MonthlyAverageMarkersProps) {
  const xScale = xAxisMap?.[0]?.scale;
  const yScale = yAxisMap?.[0]?.scale;

  if (!xScale || !yScale || typeof xScale.bandwidth !== "function") {
    return null;
  }

  const bandWidth = xScale.bandwidth();

  return (
    <g className="recharts-layer text-muted-foreground">
      {monthKeys.map((monthKey, index) => {
        const x = xScale(monthKey);
        const y = yScale(averages[index]);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return null;
        }

        return (
          <line
            key={monthKey}
            x1={x}
            x2={(x as number) + bandWidth}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        );
      })}
    </g>
  );
}
