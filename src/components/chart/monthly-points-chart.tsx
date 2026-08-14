"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";
import { usePoolContext } from "@/context/pool-context";
import { PeriodResult } from "@/app/[locale]/pool/[name]/in-progress/records-tab/records-calculation";

import { PARTICIPANT_COLORS } from "./utils";
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
  const { poolInfo, selectedParticipant } = usePoolContext();

  const data = React.useMemo(
    () =>
      months.map((month) => {
        const entry: Record<string, string | number> = { month: month.key };

        for (const standing of month.standings) {
          const participant = poolInfo.participants.find(
            (user) => user.id === standing.participantId
          );
          if (participant) {
            entry[participant.name] = standing.poolPoints;
          }
        }

        return entry;
      }),
    [months, poolInfo.participants]
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
    [poolInfo.participants]
  );

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 12, right: 12, top: 8 }}>
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
        {poolInfo.participants.map((participant) => (
          <Bar
            key={participant.id}
            dataKey={participant.name}
            fill={chartConfig[participant.name].color as string}
            fillOpacity={participant.name === selectedParticipant ? 1 : 0.55}
            radius={2}
            isAnimationActive={false}
          />
        ))}
        <ChartLegend verticalAlign="bottom" content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}
