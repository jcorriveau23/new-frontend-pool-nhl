"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import { salaryFormat } from "@/app/utils/formating";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";

import { PARTICIPANT_COLORS } from "./colors";

export interface PoolerEfficiencyEntry {
  id: string;
  name: string;
  capUsed: number;
  poolPoints: number;
}

interface PoolerCapEfficiencyChartProps {
  poolers: PoolerEfficiencyEntry[];
  teamSalaryCap: number;
  selectedParticipant: string;
}

const MILLION = 1_000_000;

interface EfficiencyPoint {
  name: string;
  capUsed: number;
  poolPoints: number;
  pointsPerMillion: number;
  isSelected: boolean;
}

const EfficiencyTooltip = ({
  active,
  payload,
}: TooltipProps<ValueType, NameType>) => {
  const t = useTranslations();

  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload as EfficiencyPoint;

  return (
    <div className="grid gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{point.name}</div>
      <div className="grid gap-0.5 tabular-nums text-muted-foreground">
        <span>
          {t("RosterSalaryUsed")}: {salaryFormat(point.capUsed * MILLION)}
        </span>
        <span>
          {t("poolPoints")}: {point.poolPoints}
        </span>
        <span className="text-foreground">
          {t("PointsPerMillionValue", {
            value: point.pointsPerMillion.toFixed(1),
          })}
        </span>
      </div>
    </div>
  );
};

// Cap spent against points made, one dot per pooler: the further up and to the
// left, the more a pooler gets out of his money.
export function PoolerCapEfficiencyChart({
  poolers,
  teamSalaryCap,
  selectedParticipant,
}: PoolerCapEfficiencyChartProps) {
  const t = useTranslations();

  const points = React.useMemo<EfficiencyPoint[]>(
    () =>
      poolers.map((pooler) => ({
        name: pooler.name,
        capUsed: pooler.capUsed / MILLION,
        poolPoints: pooler.poolPoints,
        pointsPerMillion:
          pooler.capUsed > 0 ? pooler.poolPoints / (pooler.capUsed / MILLION) : 0,
        isSelected: pooler.name === selectedParticipant,
      })),
    [poolers, selectedParticipant]
  );

  // The cap line is the whole point of the reference: the domain has to hold it
  // even when everybody sits well under the cap.
  const capInMillions = teamSalaryCap / MILLION;
  const capUsedValues = points.map((point) => point.capUsed);
  const xDomain: [number, number] = [
    Math.min(...capUsedValues, capInMillions) - 2,
    Math.max(...capUsedValues, capInMillions) + 2,
  ];

  const chartConfig = React.useMemo<ChartConfig>(
    () =>
      poolers.reduce((config, pooler, index) => {
        config[pooler.name] = {
          label: pooler.name,
          color: PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length],
        };
        return config;
      }, {} as ChartConfig),
    [poolers]
  );

  return (
    <div className="space-y-3">
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[260px] w-full"
      >
        <ScatterChart margin={{ left: 4, right: 16, top: 8, bottom: 16 }}>
          <CartesianGrid />
          <XAxis
            type="number"
            dataKey="capUsed"
            name={t("RosterSalaryUsed")}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            domain={xDomain}
            tickFormatter={(value: number) => `$${value.toFixed(0)}M`}
          />
          <YAxis
            type="number"
            dataKey="poolPoints"
            name={t("poolPoints")}
            tickLine={false}
            axisLine={false}
            width={44}
            tickMargin={4}
          />
          <ZAxis type="number" range={[110, 110]} />
          <ReferenceLine
            x={teamSalaryCap / MILLION}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: t("SalaryCap"),
              position: "insideTopRight",
              fontSize: 11,
              fill: "var(--muted-foreground)",
            }}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: "4 4" }}
            content={<EfficiencyTooltip />}
          />
          {points.map((point, index) => (
            <Scatter
              key={point.name}
              name={point.name}
              data={[point]}
              fill={PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length]}
              fillOpacity={point.isSelected ? 1 : 0.6}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </ScatterChart>
      </ChartContainer>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs">
        {points.map((point, index) => (
          <li
            key={point.name}
            className={
              point.isSelected
                ? "flex items-center gap-1.5 font-semibold"
                : "flex items-center gap-1.5 text-muted-foreground"
            }
          >
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{
                backgroundColor:
                  PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length],
              }}
            />
            {point.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
