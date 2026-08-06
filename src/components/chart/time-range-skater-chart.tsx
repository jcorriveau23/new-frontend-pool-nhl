"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { usePoolContext } from "@/context/pool-context";
import { getSkaterTimeRangeCharts, SkaterSettings } from "@/data/pool/model";
import { PlayerStatsChart } from "./time-range-player-chart";

interface TimeRangePlayerChartProps {
  playerId: string;
  skaterSettings: SkaterSettings;
}

export function TimeRangeSkaterChart(props: TimeRangePlayerChartProps) {
  // Now parse all the pool date from the start of the season to the current date.
  const { selectedPoolUser, poolStartDate, poolSelectedEndDate, poolInfo } =
    usePoolContext();
  const t = useTranslations();

  const data = React.useMemo(
    () =>
      getSkaterTimeRangeCharts(
        poolInfo,
        poolStartDate,
        poolSelectedEndDate,
        props.playerId,
        selectedPoolUser.id,
        props.skaterSettings
      ),
    [
      poolInfo,
      poolStartDate,
      poolSelectedEndDate,
      props.playerId,
      selectedPoolUser.id,
      props.skaterSettings,
    ]
  );

  return (
    <PlayerStatsChart
      data={data}
      series={[
        { key: "poolPoints", label: t("poolPoints") },
        { key: "goals", label: t("goals") },
        { key: "assists", label: t("assists") },
        { key: "hattricks", label: t("hattricks") },
        { key: "shootoutGoals", label: t("shootoutGoals") },
      ]}
    />
  );
}
