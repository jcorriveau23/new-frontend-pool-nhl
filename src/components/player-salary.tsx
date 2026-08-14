"use client";
import React from "react";
import { salaryFormat, seasonFormat } from "@/app/utils/formating";
import { Badge } from "./ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { TeamLogo } from "./team-logo";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface PlayerSalary {
  playerName: string | undefined;
  team: number | null | undefined;
  salary: number | null | undefined; // salary in $.
  contractExpirationSeason: number | null | undefined; // in the following format 20232024.
  // Cap of the team owning the player, when the caller knows it. It turns the
  // amount into a share, which is what actually says whether a contract is big.
  teamSalaryCap?: number | null;
  onBadgeClick?: (e: React.MouseEvent) => void;
  // Lets a dense table shrink the badge without touching the popover.
  badgeClassName?: string;
}

export default function PlayerSalary({
  playerName,
  team,
  salary,
  contractExpirationSeason,
  teamSalaryCap,
  onBadgeClick,
  badgeClassName,
}: PlayerSalary) {
  const t = useTranslations();

  // A player with neither a cap hit nor an expiration season is simply not
  // under contract, which matters as much as the amount itself when building
  // a trade or a dynasty roster.
  const hasContract = salary != null || contractExpirationSeason != null;
  const formatedSalary = salary != null ? salaryFormat(salary) : null;

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={200}
        onClick={onBadgeClick}
        aria-label={t("SalaryDetails", { playerName: playerName ?? "" })}
        className="outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-full"
      >
        <Badge
          variant="outline"
          className={cn(
            "cursor-pointer whitespace-nowrap tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground",
            hasContract
              ? "font-semibold"
              : "border-dashed font-normal text-muted-foreground",
            badgeClassName,
          )}
        >
          {formatedSalary ?? t("NoContract")}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-48 max-w-64 p-3">
        <div className="flex items-center gap-2">
          {team ? <TeamLogo teamId={team} width={24} height={24} /> : null}
          <span className="truncate text-sm font-medium">{playerName}</span>
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">
          {formatedSalary ?? (
            <span className="text-base font-normal text-muted-foreground">
              {t("NoContract")}
            </span>
          )}
        </div>
        {salary != null && teamSalaryCap ? (
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {t("PercentOfCapShare", {
              percent: ((salary / teamSalaryCap) * 100).toFixed(1),
            })}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {contractExpirationSeason
            ? t("ContractUntil", {
                season: seasonFormat(contractExpirationSeason, 0),
              })
            : t("NoContractHint")}
        </p>
      </PopoverContent>
    </Popover>
  );
}
