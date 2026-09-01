"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/*
Deferred entry points for every chart that pulls in Recharts.

Recharts is the single heaviest dependency in the client bundle, and none of
these charts is on screen when a page first paints — each one is behind a dialog
or a toggle the pooler has to open. Importing them statically put the whole
library in the initial download of the pool pages anyway; going through
`next/dynamic` moves it to the moment a chart is first shown.

`CapAllocationChart` is deliberately not here: it is a plain div meter with no
Recharts import, so deferring it would buy nothing and cost a skeleton flash.

`ssr: false` because a Recharts tree needs measured DOM to lay itself out, so
there is no useful server render to keep — only a hydration mismatch to avoid.
*/

// Charts declare their own heights; these match so opening one does not shift
// the content underneath it.
const chartFallback = (className: string) => {
  const ChartFallback = () => <Skeleton className={`w-full ${className}`} />;
  ChartFallback.displayName = "ChartFallback";
  return ChartFallback;
};

export const MonthlyPointsChart = dynamic(
  () => import("./monthly-points-chart").then((m) => m.MonthlyPointsChart),
  { loading: chartFallback("h-[320px]"), ssr: false }
);

export const TimeRangePoolChart = dynamic(
  () => import("./time-range-pool-chart").then((m) => m.TimeRangePoolChart),
  { loading: chartFallback("h-[320px]"), ssr: false }
);

export const TimeRangeSkaterChart = dynamic(
  () => import("./time-range-skater-chart").then((m) => m.TimeRangeSkaterChart),
  { loading: chartFallback("h-[280px]"), ssr: false }
);

export const TimeRangeGoalieChart = dynamic(
  () => import("./time-range-goalie-chart").then((m) => m.TimeRangeGoalieChart),
  { loading: chartFallback("h-[280px]"), ssr: false }
);

export const ContractExpirationChart = dynamic(
  () =>
    import("./contract-expiration-chart").then((m) => m.ContractExpirationChart),
  { loading: chartFallback("h-[260px]"), ssr: false }
);

export const PoolerCapEfficiencyChart = dynamic(
  () =>
    import("./pooler-cap-efficiency-chart").then(
      (m) => m.PoolerCapEfficiencyChart
    ),
  { loading: chartFallback("h-[260px]"), ssr: false }
);

// This one sizes itself to its row count rather than a fixed height, so the
// fallback only reserves a plausible minimum.
export const ContractValueChart = dynamic(
  () => import("./contract-value-chart").then((m) => m.ContractValueChart),
  { loading: chartFallback("h-[200px]"), ssr: false }
);
