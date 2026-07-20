"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { usePoolContext } from "@/context/pool-context";
import { getGoalieTimeRangeCharts, GoaliesSettings } from "@/data/pool/model";
import { PlayerStatsChart } from "./time-range-player-chart";

interface TimeRangePlayerChartProps {
  playerId: string;
  goaliesSettings: GoaliesSettings;
}

export function TimeRangeGoalieChart(props: TimeRangePlayerChartProps) {
  // Now parse all the pool date from the start of the season to the current date.
  const { selectedPoolUser, poolStartDate, poolSelectedEndDate, poolInfo } =
    usePoolContext();
  const t = useTranslations();

  const data = React.useMemo(
    () =>
      getGoalieTimeRangeCharts(
        poolInfo,
        poolStartDate,
        poolSelectedEndDate,
        props.playerId,
        selectedPoolUser.id,
        props.goaliesSettings
      ),
    [
      poolInfo,
      poolStartDate,
      poolSelectedEndDate,
      props.playerId,
      selectedPoolUser.id,
      props.goaliesSettings,
    ]
  );

  return (
    <PlayerStatsChart
      data={data}
      series={[
        { key: "poolPoints", label: t("poolPoints") },
        { key: "wins", label: t("wins") },
        { key: "otlosses", label: t("otlosses") },
        { key: "shutout", label: t("shutout") },
        { key: "goals", label: t("goals") },
        { key: "assists", label: t("assists") },
      ]}
    />
  );
}
