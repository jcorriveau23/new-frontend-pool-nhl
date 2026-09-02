"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import { Position } from "@/data/pool/model";
import { salaryFormat } from "@/app/utils/formating";
import { ContractValue } from "@/lib/lineup-analytics";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

import { POSITION_COLORS } from "./colors";

interface ContractValueChartProps {
  values: ContractValue[];
}

const ROW_HEIGHT = 24;
const CHART_PADDING = 24;

const ValueTooltip = ({
  active,
  payload,
}: TooltipProps<ValueType, NameType>) => {
  const t = useTranslations();

  if (!active || !payload?.length) {
    return null;
  }

  const value = payload[0].payload as ContractValue;

  return (
    <div className="grid gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{value.name}</div>
      <div className="grid gap-0.5 tabular-nums text-muted-foreground">
        <span>
          {t("Salary")}: {salaryFormat(value.salary)}
        </span>
        <span>
          {t("poolPoints")}: {value.poolPoints}
        </span>
        <span className="text-foreground">
          {t("PointsPerMillionValue", {
            value: value.pointsPerMillion.toFixed(1),
          })}
        </span>
        {value.salaryPerPoint !== null ? (
          <span>
            {t("SalaryPerPointValue", {
              value: salaryFormat(value.salaryPerPoint),
            })}
          </span>
        ) : (
          <span>{t("NoPointYet")}</span>
        )}
      </div>
    </div>
  );
};

// Ranked bars: which contracts of the lineup buy the most pool points per
// million of cap. Points per million rather than dollars per point, so a player
// who has not scored yet lands on zero instead of off the scale.
export function ContractValueChart({ values }: ContractValueChartProps) {
  const t = useTranslations();

  const chartConfig = React.useMemo(
    () => ({
      pointsPerMillion: { label: t("PointsPerMillion") },
    }),
    [t]
  );

  if (values.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        {t("NoContractToCompare")}
      </p>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto w-full"
      style={{ height: values.length * ROW_HEIGHT + CHART_PADDING * 2 }}
    >
      <BarChart
        accessibilityLayer
        data={values}
        layout="vertical"
        margin={{ left: 4, right: 44, top: 4, bottom: 4 }}
        barCategoryGap={2}
      >
        <XAxis type="number" dataKey="pointsPerMillion" hide />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={116}
          tickMargin={4}
          interval={0}
        />
        <ChartTooltip cursor={false} content={<ValueTooltip />} />
        <Bar dataKey="pointsPerMillion" radius={4} isAnimationActive={false}>
          {values.map((value) => (
            <Cell
              key={value.playerId}
              fill={POSITION_COLORS[value.position as Position]}
            />
          ))}
          <LabelList
            dataKey="pointsPerMillion"
            position="right"
            className="fill-muted-foreground"
            fontSize={11}
            formatter={(value: number) => value.toFixed(1)}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
