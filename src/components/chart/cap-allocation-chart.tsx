"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Position } from "@/data/pool/model";
import { salaryFormat } from "@/app/utils/formating";
import { CapAllocation } from "@/lib/lineup-analytics";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { POSITION_COLORS } from "./colors";

interface CapAllocationChartProps {
  allocation: CapAllocation;
  teamSalaryCap: number;
}

const POSITION_LABEL: Record<Position, string> = {
  [Position.F]: "Forwards",
  [Position.D]: "Defense",
  [Position.G]: "Goalies",
};

// A single stacked meter reads better than a chart with axes here: there is one
// total to split, and the numbers that matter live in the legend below it.
export function CapAllocationChart({
  allocation,
  teamSalaryCap,
}: CapAllocationChartProps) {
  const t = useTranslations();

  const isOverCap = allocation.spaceLeft < 0;
  // Over the cap the meter scales to the lineup instead of the cap, so the
  // overflow stays visible instead of being clipped at 100%.
  const scale = Math.max(allocation.usedSalary, teamSalaryCap);

  // Only the three positions are drawn: the empty part of the track already is
  // the remaining space, painting it would just be a segment the color of its
  // own background.
  const segments = allocation.slices
    .filter((slice) => slice.salary > 0)
    .map((slice) => ({
      key: slice.position as string,
      label: t(POSITION_LABEL[slice.position]),
      salary: slice.salary,
      share: slice.share,
      color: POSITION_COLORS[slice.position],
    }));

  return (
    <div className="space-y-3">
      <div className="relative flex h-6 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((segment) => (
          <Tooltip key={segment.key}>
            <TooltipTrigger
              render={
                <div
                  className="h-full border-r-2 border-card transition-[width] duration-300"
                  style={{
                    width: `${(segment.salary / scale) * 100}%`,
                    backgroundColor: segment.color,
                  }}
                />
              }
            />
            <TooltipContent>
              {segment.label} — {salaryFormat(segment.salary)}
            </TooltipContent>
          </Tooltip>
        ))}
        {isOverCap ? (
          <span
            aria-hidden="true"
            className="absolute inset-y-0 w-0.5 bg-destructive"
            style={{ left: `${(teamSalaryCap / scale) * 100}%` }}
          />
        ) : null}
      </div>
      <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: segment.color }}
            />
            <span className="truncate">{segment.label}</span>
            <span className="ml-auto shrink-0 font-medium tabular-nums">
              {salaryFormat(segment.salary)}
            </span>
            <span className="w-11 shrink-0 text-right tabular-nums text-muted-foreground">
              {Math.round(segment.share)}%
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2 text-xs">
          <span
            aria-hidden="true"
            className={cn(
              "size-2.5 shrink-0 rounded-[3px]",
              isOverCap ? "bg-destructive" : "bg-muted ring-1 ring-border"
            )}
          />
          <span className="truncate">
            {isOverCap ? t("OverCapSpace") : t("CapSpaceLeft")}
          </span>
          <span
            className={cn(
              "ml-auto shrink-0 font-medium tabular-nums",
              isOverCap ? "text-destructive" : "text-success"
            )}
          >
            {salaryFormat(Math.abs(allocation.spaceLeft))}
          </span>
          <span className="w-11 shrink-0 text-right tabular-nums text-muted-foreground">
            {Math.round(
              (Math.abs(allocation.spaceLeft) / teamSalaryCap) * 100
            )}
            %
          </span>
        </li>
      </ul>
    </div>
  );
}
