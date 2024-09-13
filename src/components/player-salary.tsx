"use client";
import React from "react";
import { salaryFormat, seasonFormat } from "@/app/utils/formating";
import InformationIcon from "./information-box";
import { useTranslations } from "next-intl";
import { Badge } from "./ui/badge";

interface Props {
  playerName: string;
  salary: number; // salary in $.
  contractExpirationSeason: number; // in the following format 20232024.
}

export default function PlayerSalary(props: Props) {
  const t = useTranslations();
  return (
    <div className="flex items-center space-x-2">
      <Badge>{salaryFormat(props.salary)}</Badge>
      <InformationIcon
        text={t("ContractExpirationDateMessage", {
          playerName: props.playerName,
          season: seasonFormat(props.contractExpirationSeason, 0),
        })}
      />
    </div>
  );
}
