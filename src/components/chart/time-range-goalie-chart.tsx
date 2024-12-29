"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { usePoolContext } from "@/context/pool-context";
import { getGoalieTimeRangeCharts, GoaliesSettings } from "@/data/pool/model";
import { generateReferenceAreas } from "./utils";
import { useTranslations } from "next-intl";

interface TimeRangePlayerChartProps {
  playerId: string;
  goaliesSettings: GoaliesSettings;
}

export function TimeRangeGoalieChart(props: TimeRangePlayerChartProps) {
  // Now parse all the pool date from the start of the season to the current date.
  const { selectedPoolUser, poolStartDate, poolSelectedEndDate, poolInfo } =
    usePoolContext();
  const t = useTranslations();

  const data = getGoalieTimeRangeCharts(
    poolInfo,
    poolStartDate,
    poolSelectedEndDate,
    props.playerId,
    selectedPoolUser.id,
    props.goaliesSettings
  );

  return (
    <ChartContainer
      config={{
        poolPoints: {
          label: t("poolPoints"),
        },
        wins: {
          label: t("wins"),
        },
        otlosses: {
          label: t("otlosses"),
        },
        shutout: {
          label: t("shutout"),
        },
        goals: {
          label: t("goals"),
        },
        assists: {
          label: t("assists"),
        },
      }}
      className="aspect-auto h-[250px] w-full"
    >
      <LineChart
        accessibilityLayer
        data={data}
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
        <Line
          dataKey={"poolPoints"}
          type="monotone"
          strokeWidth={2}
          dot={false}
          stroke="#33FF33"
        />
        <Line
          dataKey={"wins"}
          type="monotone"
          strokeWidth={1}
          dot={false}
          stroke="#FFBB66"
        />
        <Line
          dataKey={"shutout"}
          type="monotone"
          strokeWidth={1}
          dot={false}
          stroke="#FF6666"
        />
        <Line
          dataKey={"otlosses"}
          type="monotone"
          strokeWidth={1}
          dot={false}
          stroke="#FF6600"
        />
        <Line
          dataKey={"assists"}
          type="monotone"
          strokeWidth={1}
          dot={false}
          stroke="#6666FF"
        />
        <Line
          dataKey={"goals"}
          type="monotone"
          strokeWidth={1}
          dot={false}
          stroke="#00AA22"
        />
        {generateReferenceAreas(data)}
      </LineChart>
    </ChartContainer>
  );
}
