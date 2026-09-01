"use client";

import { useTranslations } from "next-intl";

import { Player } from "@/data/pool/model";
import { getCapAllocation, getContractValues } from "@/lib/lineup-analytics";
import { CapAllocationChart } from "./chart/cap-allocation-chart";
import {
  ContractExpirationChart,
  ContractValueChart,
} from "./chart/lazy";
import { ChartCard } from "./lineup-analysis";

interface Props {
  // The players kept for next season, split the way the cap counts them.
  protectedLineup: {
    forwards: Player[];
    defense: Player[];
    goalies: Player[];
  };
  // Every player of the roster, protected or not: what is being chosen from.
  rosterPlayers: Player[];
  teamSalaryCap: number;
  // Pool points made this season, keyed by player id. Absent when the season
  // was never scored, the chart that reads production is then left out.
  playerPoolPoints?: Record<number, number>;
}

export default function ProtectionAnalysis({
  protectedLineup,
  rosterPlayers,
  teamSalaryCap,
  playerPoolPoints,
}: Props) {
  const t = useTranslations();

  const allocation = getCapAllocation(protectedLineup, teamSalaryCap);
  // Ranked over the whole roster and not only the protected players: this is
  // the chart the protection choice is made on.
  const contractValues = playerPoolPoints
    ? getContractValues(rosterPlayers, playerPoolPoints)
    : [];

  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <ChartCard
        title={t("CapAllocation")}
        hint={t("ProtectedCapAllocationHint")}
      >
        <CapAllocationChart
          allocation={allocation}
          teamSalaryCap={teamSalaryCap}
        />
      </ChartCard>

      <ChartCard
        title={t("ContractExpirations")}
        hint={t("ProtectionContractExpirationsHint")}
      >
        <ContractExpirationChart players={rosterPlayers} />
      </ChartCard>

      {playerPoolPoints ? (
        <ChartCard
          title={t("ContractValue")}
          hint={t("ProtectionContractValueHint")}
        >
          <ContractValueChart values={contractValues} />
        </ChartCard>
      ) : null}
    </div>
  );
}
