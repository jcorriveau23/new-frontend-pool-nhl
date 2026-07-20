"use client";

import * as React from "react";
import { Brush, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartTooltip,
} from "@/components/ui/chart";
import { usePoolContext } from "@/context/pool-context";
import { getPoolTimeRangeCharts } from "@/data/pool/model";
import { cn } from "@/lib/utils";

const PARTICIPANT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

interface TimeRangePoolChartProps {
  positionFilter: "F" | "D" | "G" | null;
}

export function TimeRangePoolChart(props: TimeRangePoolChartProps) {
  const {
    poolStartDate,
    poolSelectedEndDate,
    poolInfo,
    selectedParticipant,
    updateSelectedParticipant,
  } = usePoolContext();

  const data = React.useMemo(
    () =>
      getPoolTimeRangeCharts(
        poolInfo,
        poolStartDate,
        poolSelectedEndDate,
        props.positionFilter
      ),
    [poolInfo, poolStartDate, poolSelectedEndDate, props.positionFilter]
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
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[320px] w-full [&_.recharts-brush-texts]:fill-muted-foreground [&_.recharts-brush_rect]:fill-muted"
    >
      <LineChart
        accessibilityLayer
        data={data}
        margin={{ left: 12, right: 12, top: 8 }}
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
            />
          }
        />
        {poolInfo.participants.map((p) => {
          const isSelected = p.name === selectedParticipant;
          return (
            <Line
              key={p.id}
              dataKey={p.name}
              type="monotone"
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeOpacity={isSelected ? 1 : 0.35}
              dot={false}
              stroke={chartConfig[p.name].color as string}
              isAnimationActive={false}
            />
          );
        })}
        <ChartLegend
          verticalAlign="bottom"
          content={
            <PoolLegendContent
              config={chartConfig}
              selectedParticipant={selectedParticipant}
              onSelect={updateSelectedParticipant}
            />
          }
        />
        <Brush
          dataKey="date"
          height={28}
          travellerWidth={8}
          stroke="var(--chart-1)"
          fill="var(--muted)"
          tickFormatter={(value) => {
            const date = new Date(value + "T00:00:00");
            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          }}
        />
      </LineChart>
    </ChartContainer>
  );
}

function RankedTooltipContent({
  active,
  payload,
  label,
  config,
  selectedParticipant,
}: TooltipProps<ValueType, NameType> & {
  config: ChartConfig;
  selectedParticipant: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const sorted = [...payload].sort(
    (a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)
  );

  const formattedLabel =
    typeof label === "string"
      ? new Date(`${label}T00:00:00`).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

  return (
    <div className="grid min-w-[11rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      {formattedLabel ? <div className="font-medium">{formattedLabel}</div> : null}
      <div className="grid gap-0.5">
        {sorted.map((item, index) => {
          const name = String(item.dataKey ?? item.name ?? "");
          const isSelected = name === selectedParticipant;
          return (
            <div
              key={name}
              className={cn(
                "flex items-center gap-2 rounded px-1 py-0.5",
                isSelected && "bg-selection"
              )}
            >
              <span className="w-3 shrink-0 text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: config[name]?.color as string }}
              />
              <span
                className={cn(
                  "flex-1 truncate",
                  isSelected
                    ? "font-semibold text-selection-foreground"
                    : "text-muted-foreground"
                )}
              >
                {config[name]?.label ?? name}
              </span>
              <span
                className={cn(
                  "font-mono tabular-nums",
                  isSelected
                    ? "font-semibold text-selection-foreground"
                    : "text-foreground"
                )}
              >
                {Number(item.value ?? 0).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PoolLegendContent({
  config,
  selectedParticipant,
  onSelect,
}: {
  config: ChartConfig;
  selectedParticipant: string;
  onSelect: (participant: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 pt-3">
      {Object.entries(config).map(([name, item]) => {
        const isSelected = name === selectedParticipant;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onSelect(name)}
            className={cn(
              "flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs transition-opacity hover:opacity-100",
              isSelected
                ? "font-semibold text-foreground opacity-100"
                : "text-muted-foreground opacity-60"
            )}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color as string }}
            />
            {item.label as string}
          </button>
        );
      })}
    </div>
  );
}
