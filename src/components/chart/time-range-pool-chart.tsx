"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { usePoolContext } from "@/context/pool-context";
import { getPoolTimeRangeCharts } from "@/data/pool/model";

const chartConfig = {} satisfies ChartConfig;
const participantColors = [
  "#FF6633",
  "#FFB399",
  "#FF33FF",
  "#FF1199",
  "#00B3E6",
  "#E6B333",
  "#3366E6",
  "#999966",
  "#99FF99",
  "#B34D4D",
];

interface TimeRangePoolChartProps {
  positionFilter: "F" | "D" | "G" | null;
}

export function TimeRangePoolChart(props: TimeRangePoolChartProps) {
  // Now parse all the pool date from the start of the season to the current date.
  const { poolStartDate, poolSelectedEndDate, poolInfo } = usePoolContext();

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[250px] w-full"
    >
      <LineChart
        accessibilityLayer
        data={getPoolTimeRangeCharts(
          poolInfo,
          poolStartDate,
          poolSelectedEndDate,
          props.positionFilter
        )}
        margin={{
          left: 12,
          right: 12,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) => {
            const date = new Date(value + "T00:00:00");
            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="w-[150px]"
              labelFormatter={(value) => {
                return new Date(value + "T00:00:00").toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                );
              }}
            />
          }
        />
        {poolInfo.participants.map((p, index) => (
          <Line
            key={p.id}
            dataKey={p.name}
            type="monotone"
            strokeWidth={2}
            dot={false}
            stroke={participantColors[index]}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
