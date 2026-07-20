"use client";

import * as React from "react";
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { useTranslations } from "next-intl";

import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { generateReferenceAreas } from "./utils";

const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export type PlayerChartPoint = Record<string, string | number | boolean>;

export interface PlayerChartSeries {
  key: string;
  label: string;
}

interface PlayerStatsChartProps {
  data: PlayerChartPoint[];
  series: PlayerChartSeries[];
}

const formatShortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

export function PlayerStatsChart({ data, series }: PlayerStatsChartProps) {
  const t = useTranslations();
  const [hiddenSeries, setHiddenSeries] = React.useState<Set<string>>(
    () => new Set()
  );
  const [brushRange, setBrushRange] = React.useState<{
    startIndex?: number;
    endIndex?: number;
  }>({});

  const toggleSeries = (key: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const colorFor = (key: string) =>
    SERIES_COLORS[series.findIndex((s) => s.key === key) % SERIES_COLORS.length];

  const lastPoint = data[data.length - 1];
  const totalPoolPoints = Number(lastPoint?.poolPoints ?? 0);
  const gamesPlayed = Number(lastPoint?.games ?? 0);
  const pointsPerGame = gamesPlayed > 0 ? totalPoolPoints / gamesPlayed : 0;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {series.map((s) => (
          <SummaryTile
            key={s.key}
            label={s.label}
            value={Number(lastPoint?.[s.key] ?? 0).toLocaleString()}
            color={colorFor(s.key)}
          />
        ))}
        <SummaryTile label={t("games")} value={gamesPlayed.toLocaleString()} />
        <SummaryTile
          label={t("pointsPerGame")}
          value={pointsPerGame.toFixed(3)}
        />
      </div>
      <ChartContainer
        config={{}}
        className="aspect-auto h-[280px] w-full [&_.recharts-brush-texts]:fill-muted-foreground [&_.recharts-brush_rect]:fill-muted"
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
            tickFormatter={formatShortDate}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={36}
            allowDecimals={false}
            tickFormatter={(value) => Math.round(value).toLocaleString()}
          />
          <ChartTooltip
            content={
              <PlayerTooltipContent
                data={data}
                series={series}
                hiddenSeries={hiddenSeries}
                colorFor={colorFor}
                inRosterLabel={t("inRoster")}
                notInRosterLabel={t("notInRoster")}
              />
            }
          />
          {generateReferenceAreas(
            data,
            brushRange.startIndex ?? 0,
            brushRange.endIndex ?? data.length - 1
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              type="monotone"
              strokeWidth={s.key === "poolPoints" ? 2.5 : 1.5}
              strokeOpacity={s.key === "poolPoints" ? 1 : 0.75}
              dot={false}
              stroke={colorFor(s.key)}
              hide={hiddenSeries.has(s.key)}
              isAnimationActive={false}
            />
          ))}
          <Brush
            dataKey="date"
            height={28}
            travellerWidth={8}
            stroke="var(--chart-1)"
            fill="var(--muted)"
            tickFormatter={formatShortDate}
            onChange={(range) => setBrushRange(range)}
          />
        </LineChart>
      </ChartContainer>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        {series.map((s) => {
          const isHidden = hiddenSeries.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleSeries(s.key)}
              className={cn(
                "flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs transition-opacity hover:opacity-100",
                isHidden
                  ? "text-muted-foreground opacity-40 line-through"
                  : "text-foreground opacity-100"
              )}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: colorFor(s.key) }}
              />
              {s.label}
            </button>
          );
        })}
        <span className="flex items-center gap-1.5 px-1.5 py-0.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 shrink-0 rounded-[2px] border border-destructive/60 bg-destructive/20" />
          {t("notInRoster")}
        </span>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="grid gap-0.5">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {color ? (
          <span
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: color }}
          />
        ) : null}
        {label}
      </span>
      <span className="font-mono text-base font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

function PlayerTooltipContent({
  active,
  payload,
  label,
  data,
  series,
  hiddenSeries,
  colorFor,
  inRosterLabel,
  notInRosterLabel,
}: TooltipProps<ValueType, NameType> & {
  data: PlayerChartPoint[];
  series: PlayerChartSeries[];
  hiddenSeries: Set<string>;
  colorFor: (key: string) => string;
  inRosterLabel: string;
  notInRosterLabel: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload as PlayerChartPoint;
  const isInRoster = Boolean(point.isInRoster);
  const index = data.findIndex((d) => d.date === label);
  const prevPoint = index > 0 ? data[index - 1] : null;

  const formattedLabel =
    typeof label === "string"
      ? new Date(`${label}T00:00:00`).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

  return (
    <div className="grid min-w-[12rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="flex items-center justify-between gap-3">
        {formattedLabel ? (
          <span className="font-medium">{formattedLabel}</span>
        ) : null}
        <span
          className={cn(
            "rounded px-1.5 py-px text-[10px] font-medium",
            isInRoster
              ? "bg-selection text-selection-foreground"
              : "bg-destructive/15 text-destructive"
          )}
        >
          {isInRoster ? inRosterLabel : notInRosterLabel}
        </span>
      </div>
      <div className="grid gap-0.5">
        {series
          .filter((s) => !hiddenSeries.has(s.key))
          .map((s) => {
            const value = Number(point[s.key] ?? 0);
            const delta = value - Number(prevPoint?.[s.key] ?? 0);
            return (
              <div key={s.key} className="flex items-center gap-2 px-1 py-0.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: colorFor(s.key) }}
                />
                <span className="flex-1 truncate text-muted-foreground">
                  {s.label}
                </span>
                {delta > 0 ? (
                  <span className="font-mono tabular-nums text-muted-foreground">
                    +{delta.toLocaleString()}
                  </span>
                ) : null}
                <span className="font-mono font-medium tabular-nums text-foreground">
                  {value.toLocaleString()}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
