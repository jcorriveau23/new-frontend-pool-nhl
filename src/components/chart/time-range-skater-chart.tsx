"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { usePoolContext } from "@/context/pool-context";
import { getSkaterTimeRangeCharts, SkaterSettings } from "@/data/pool/model";
import { generateReferenceAreas } from "./utils";
import { useTranslations } from "next-intl";

interface TimeRangePlayerChartProps {
  playerId: string;
  skaterSettings: SkaterSettings;
}

export function TimeRangeSkaterChart(props: TimeRangePlayerChartProps) {
  // Now parse all the pool date from the start of the season to the current date.
  const { selectedPoolUser, poolStartDate, poolSelectedEndDate, poolInfo } =
    usePoolContext();
  const t = useTranslations();

  const data = getSkaterTimeRangeCharts(
    poolInfo,
    poolStartDate,
    poolSelectedEndDate,
    props.playerId,
    selectedPoolUser.id,
    props.skaterSettings
  );

  return (
    <ChartContainer
      config={{
        poolPoints: {
          label: t("poolPoints"),
        },
        goals: {
          label: t("goals"),
        },
        assists: {
          label: t("assists"),
        },
        hattricks: {
          label: t("hattricks"),
        },
        shootoutGoals: {
          label: t("shootoutGoals"),
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
        <CartesianGrid />
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
          label={t("poolPoints")}
          type="monotone"
          strokeWidth={2}
          dot={false}
          stroke="#33FF33"
        />
        <Line
          dataKey={"assists"}
          type="monotone"
          strokeWidth={1}
          dot={false}
          stroke="#FFBB66"
        />
        <Line
          dataKey={"goals"}
          type="monotone"
          strokeWidth={1}
          dot={false}
          stroke="#FF6666"
        />
        <Line
          dataKey={"hattricks"}
          type="monotone"
          strokeWidth={1}
          dot={false}
          stroke="#FF6600"
        />
        <Line
          dataKey={"shootoutGoals"}
          type="monotone"
          strokeWidth={1}
          dot={false}
          stroke="#6666FF"
        />
        {generateReferenceAreas(data)}
      </LineChart>
    </ChartContainer>
  );
}
