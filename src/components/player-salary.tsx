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

interface PlayerSalary {
  playerName: string | undefined;
  team: number | null | undefined;
  salary: number | null | undefined; // salary in $.
  contractExpirationSeason: number | null | undefined; // in the following format 20232024.
  onBadgeClick?: (e: React.MouseEvent) => void;
}

export default function PlayerSalary({
  playerName,
  team,
  salary,
  contractExpirationSeason,
  onBadgeClick,
}: PlayerSalary) {
  const formatedSalary = salary ? salaryFormat(salary) : "";

  const [isOpen, setIsOpen] = React.useState(false);
  const t = useTranslations();

  const handleBadgeClick = (e: React.MouseEvent) => {
    setIsOpen(!isOpen);
    if (onBadgeClick) {
      onBadgeClick(e);
    }
  };
  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger>
          <Badge
            variant="outline"
            onClick={handleBadgeClick}
            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
          >
            {formatedSalary}
          </Badge>
        </PopoverTrigger>
        <PopoverContent>
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">
                {t("SalaryDetails", { playerName: playerName })}
              </h4>
            </div>
            <div className="grid gap-2">
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-sm font-medium">{t("Team")}:</span>
                <span className="col-span-2 text-sm">
                  {team && <TeamLogo teamId={team} width={30} height={30} />}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-sm font-medium">
                  {t("ContractExpiration")}
                </span>
                <span className="col-span-2 text-sm">
                  {contractExpirationSeason &&
                    t("ContractExpirationValue", {
                      season: seasonFormat(contractExpirationSeason, 0),
                    })}
                </span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-sm font-medium">{t("Salary")}:</span>
                <span className="col-span-2 text-sm">{formatedSalary}</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
