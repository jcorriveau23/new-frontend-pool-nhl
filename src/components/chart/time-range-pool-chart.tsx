"use client";

import * as React from "react";
import { Brush, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useLocale, useTranslations } from "next-intl";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { usePoolContext } from "@/context/pool-context";
import { getPoolTimeRangeCharts } from "@/data/pool/model";
import { cn } from "@/lib/utils";

import { PARTICIPANT_COLORS } from "./utils";
import { RankedTooltipContent } from "./ranked-tooltip";

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
  const t = useTranslations();
  const locale = useLocale();

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

  // Window kept by the brush, so the header and the legend describe what is
  // actually plotted rather than the whole season.
  const [brushRange, setBrushRange] = React.useState<{
    startIndex?: number;
    endIndex?: number;
  }>({});

  React.useEffect(() => {
    // The brush resets itself when the charted days change (position filter,
    // selected date, pool update), so the stored window has to follow.
    setBrushRange({});
  }, [data]);

  const lastIndex = Math.max(data.length - 1, 0);
  const visibleStartIndex = Math.min(brushRange.startIndex ?? 0, lastIndex);
  const visibleEndIndex = Math.min(brushRange.endIndex ?? lastIndex, lastIndex);

  // The legend doubles as a mini standing: participants are listed in the order
  // of the last visible day, with the total they had reached on that day.
  const standings = React.useMemo(() => {
    const lastPoint = data[visibleEndIndex];
    return poolInfo.participants
      .map((participant) => ({
        name: participant.name,
        total: Number(lastPoint?.[participant.name] ?? 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [data, visibleEndIndex, poolInfo.participants]);

  const formatDate = React.useCallback(
    (value: string, withYear = false) =>
      new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        ...(withYear ? { year: "numeric" } : {}),
      }),
    [locale]
  );

  const scopeLabel = props.positionFilter
    ? {
        F: t("Forwards"),
        D: t("Defense"),
        G: t("Goalies"),
      }[props.positionFilter]
    : t("AllPositions");

  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        {t("NoData")}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="grid gap-0.5">
          <h3 className="text-sm font-semibold leading-none">
            {t("PointsProgression")}
          </h3>
          <p className="text-xs text-muted-foreground">{scopeLabel}</p>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {`${formatDate(
            data[visibleStartIndex].date as string,
            true
          )} – ${formatDate(data[visibleEndIndex].date as string, true)}`}
        </span>
      </div>
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
            tickFormatter={(value) => formatDate(value)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={44}
            allowDecimals={false}
            // Recharts recomputes the domain from the window kept by the brush,
            // so an "auto" domain zooms on the points actually shown instead of
            // always starting at 0, where late season totals look flat.
            domain={["auto", "auto"]}
            padding={{ top: 8, bottom: 8 }}
            tickFormatter={(value) => Math.round(value).toLocaleString()}
          />
          <ChartTooltip
            content={
              <RankedTooltipContent
                config={chartConfig}
                selectedParticipant={selectedParticipant}
                labelFormatter={(label) => formatDate(label, true)}
              />
            }
          />
          {/* The selected participant is drawn last so its line stays on top of
              the others instead of being hidden behind them. */}
          {[...poolInfo.participants]
            .sort((a, b) =>
              a.name === selectedParticipant
                ? 1
                : b.name === selectedParticipant
                ? -1
                : 0
            )
            .map((p) => {
              const isSelected = p.name === selectedParticipant;
              return (
                <Line
                  key={p.id}
                  dataKey={p.name}
                  type="monotone"
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  strokeOpacity={isSelected ? 1 : 0.35}
                  dot={false}
                  activeDot={isSelected ? { r: 4 } : { r: 3 }}
                  stroke={chartConfig[p.name].color as string}
                  isAnimationActive={false}
                />
              );
            })}
          <Brush
            dataKey="date"
            height={28}
            travellerWidth={8}
            stroke="var(--chart-1)"
            fill="var(--muted)"
            tickFormatter={(value) => formatDate(value)}
            onChange={(range) => setBrushRange(range)}
          />
        </LineChart>
      </ChartContainer>
      <PoolLegendContent
        config={chartConfig}
        standings={standings}
        selectedParticipant={selectedParticipant}
        onSelect={updateSelectedParticipant}
      />
    </div>
  );
}

function PoolLegendContent({
  config,
  standings,
  selectedParticipant,
  onSelect,
}: {
  config: ChartConfig;
  standings: { name: string; total: number }[];
  selectedParticipant: string;
  onSelect: (participant: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {standings.map((entry, index) => {
        const isSelected = entry.name === selectedParticipant;
        return (
          <button
            key={entry.name}
            type="button"
            onClick={() => onSelect(entry.name)}
            aria-pressed={isSelected}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs transition-colors",
              isSelected
                ? "border-primary/40 bg-selection font-semibold text-selection-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            <span className="tabular-nums opacity-60">{index + 1}</span>
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: config[entry.name]?.color as string }}
            />
            {config[entry.name]?.label ?? entry.name}
            <span className="font-mono tabular-nums">
              {entry.total.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
