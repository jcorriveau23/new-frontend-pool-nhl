"use client";
import React from "react";
import { salaryFormat, seasonFormat } from "@/app/utils/formating";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  // Season being played, in the 20252026 format. Needed to turn the expiration
  // season into a remaining term; without it the term is simply not shown.
  currentSeason?: number | null;
  onClick?: (e: React.MouseEvent) => void;
  // Layout only — the amount takes its size from the row it sits in.
  className?: string;
}

/*
A cap hit reads as a figure, not as a label: these sit in columns of numbers, so
the amount is set in the same tabular figures as the stats beside it rather than
being boxed in a pill. A dotted underline on hover is the affordance that there
is more behind it; the detail lives in the popover.
*/
export default function PlayerSalary({
  playerName,
  team,
  salary,
  contractExpirationSeason,
  teamSalaryCap,
  currentSeason,
  onClick,
  className,
}: PlayerSalary) {
  const t = useTranslations();

  // A player with neither a cap hit nor an expiration season is simply not
  // under contract, which matters as much as the amount itself when building
  // a trade or a dynasty roster.
  const hasContract = salary != null || contractExpirationSeason != null;
  const formatedSalary = salary != null ? salaryFormat(salary) : null;
  const capShare =
    salary != null && teamSalaryCap ? (salary / teamSalaryCap) * 100 : null;

  /*
  Seasons still to run, the current one included — so a deal expiring at the end
  of this season reads as 1, not 0.

  This is the term *remaining*, never the length the contract was signed for:
  the backend records when a deal ends, not when it started, so the original
  length is not knowable from here. Both values are `20252026`-style, and only
  the opening year matters for the arithmetic.
  */
  const seasonsLeft =
    contractExpirationSeason != null && currentSeason != null
      ? Math.floor(contractExpirationSeason / 10000) -
        Math.floor(currentSeason / 10000) +
        1
      : null;
  // An expiration already in the past is not a term, it is an expired contract.
  const remainingTerm =
    seasonsLeft !== null && seasonsLeft > 0 ? seasonsLeft : null;

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={200}
        onClick={onClick}
        aria-label={t("SalaryDetails", { playerName: playerName ?? "" })}
        className={cn(
          "cursor-pointer rounded-sm whitespace-nowrap tabular-nums decoration-dotted underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
          formatedSalary ? "font-medium text-success" : "text-muted-foreground",
          className,
        )}
      >
        {formatedSalary}
        {formatedSalary && remainingTerm ? (
          // Cap-site shorthand: the AAV times the years still to run.
          <span className="ml-0.5 font-normal text-muted-foreground">
            {`\u00d7${remainingTerm}`}
          </span>
        ) : null}
        {formatedSalary ? null : (
          <>
            {/* An em dash is how a table says "no value". Which kind of nothing
                it is depends on `hasContract`: a player can carry an expiration
                season with no cap hit recorded, and that is not the same as
                being unsigned — so only the unsigned case says so out loud. */}
            <span aria-hidden>—</span>
            {hasContract ? null : (
              <span className="sr-only">{t("NoContract")}</span>
            )}
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-56 max-w-72 p-3">
        <div className="flex items-center gap-2">
          {team ? <TeamLogo teamId={team} width={20} height={20} /> : null}
          <span className="truncate text-sm font-medium">{playerName}</span>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-4">
          <span className="text-xs tracking-wide text-muted-foreground uppercase">
            {t("Salary")}
          </span>
          <span
            className={cn(
              "text-lg font-semibold tabular-nums",
              formatedSalary ? "text-success" : "text-muted-foreground",
            )}
          >
            {formatedSalary ?? (hasContract ? "—" : t("NoContract"))}
          </span>
        </div>
        {remainingTerm !== null ? (
          <div className="mt-1.5 flex items-baseline justify-between gap-4">
            <span className="text-xs tracking-wide text-muted-foreground uppercase">
              {t("ContractTerm")}
            </span>
            <span className="text-sm font-medium tabular-nums">
              {t("SeasonsRemaining", { years: remainingTerm })}
            </span>
          </div>
        ) : null}
        {capShare !== null ? (
          <>
            {/* What actually says whether a contract is big: the share of the
                cap it eats, not the number of millions. */}
            <Progress value={capShare} className="mt-2 h-1.5" />
            <p className="mt-1.5 text-right text-xs tabular-nums text-muted-foreground">
              {t("PercentOfCapShare", { percent: capShare.toFixed(1) })}
            </p>
          </>
        ) : null}
        <Separator className="my-3" />
        <p className="text-xs text-muted-foreground">
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
