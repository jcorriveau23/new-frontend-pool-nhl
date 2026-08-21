"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Player } from "@/data/pool/model";
import {
  getCapAllocation,
  getContractValues,
  LineupPlayers,
} from "@/lib/lineup-analytics";
import { CapAllocationChart } from "./chart/cap-allocation-chart";
import { ContractExpirationChart } from "./chart/contract-expiration-chart";
import { ContractValueChart } from "./chart/contract-value-chart";
import {
  PoolerCapEfficiencyChart,
  PoolerEfficiencyEntry,
} from "./chart/pooler-cap-efficiency-chart";
import InformationIcon from "./information-box";

export interface LineupAnalytics {
  // Pool points made so far by each player, keyed by player id.
  playerPoolPoints: Record<number, number>;
  poolers: PoolerEfficiencyEntry[];
}

interface LineupAnalysisProps {
  lineup: LineupPlayers;
  reservists: Player[];
  teamSalaryCap: number;
  selectedParticipant: string;
  // Absent while the pool has no scored day yet (a draft, for instance): the
  // two charts that read production are then left out.
  analytics?: LineupAnalytics;
}

export const ChartCard = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl border bg-card p-4">
    <header className="mb-3 flex items-center gap-1.5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <InformationIcon text={hint} />
    </header>
    {children}
  </section>
);

export default function LineupAnalysis({
  lineup,
  reservists,
  teamSalaryCap,
  selectedParticipant,
  analytics,
}: LineupAnalysisProps) {
  const t = useTranslations();

  const starters = [...lineup.forwards, ...lineup.defense, ...lineup.goalies];
  const allocation = getCapAllocation(lineup, teamSalaryCap);
  const contractValues = analytics
    ? getContractValues(starters, analytics.playerPoolPoints)
    : [];

  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <ChartCard title={t("CapAllocation")} hint={t("CapAllocationHint")}>
        <CapAllocationChart
          allocation={allocation}
          teamSalaryCap={teamSalaryCap}
        />
      </ChartCard>

      <ChartCard
        title={t("ContractExpirations")}
        hint={t("ContractExpirationsHint")}
      >
        <ContractExpirationChart players={[...starters, ...reservists]} />
      </ChartCard>

      {analytics ? (
        <ChartCard title={t("ContractValue")} hint={t("ContractValueHint")}>
          <ContractValueChart values={contractValues} />
        </ChartCard>
      ) : null}

      {analytics && analytics.poolers.length > 1 ? (
        <ChartCard title={t("CapEfficiency")} hint={t("CapEfficiencyHint")}>
          <PoolerCapEfficiencyChart
            poolers={analytics.poolers}
            teamSalaryCap={teamSalaryCap}
            selectedParticipant={selectedParticipant}
          />
        </ChartCard>
      ) : null}
    </div>
  );
}
