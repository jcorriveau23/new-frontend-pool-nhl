"use client";

import { Trophy } from "lucide-react";
import type { TooltipProps } from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import { ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface RankedTooltipContentProps extends TooltipProps<ValueType, NameType> {
  config: ChartConfig;
  selectedParticipant: string;

  // How the hovered x value is rendered as the tooltip heading.
  labelFormatter: (label: string) => string;

  // Shows the gap to the leader next to each participant. Useful on a
  // per-period chart where the standings restart every bar.
  showGapToLeader?: boolean;
}

// Tooltip that ranks every participant of the pool by the hovered value, so a
// chart with many overlapping series can still be read at a glance.
export function RankedTooltipContent({
  active,
  payload,
  label,
  config,
  selectedParticipant,
  labelFormatter,
  showGapToLeader = false,
}: RankedTooltipContentProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const sorted = [...payload].sort(
    (a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)
  );

  const leaderValue = Number(sorted[0]?.value ?? 0);

  const formattedLabel =
    typeof label === "string" ? labelFormatter(label) : null;

  return (
    <div className="grid min-w-[11rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      {formattedLabel ? <div className="font-medium">{formattedLabel}</div> : null}
      <div className="grid gap-0.5">
        {sorted.map((item, index) => {
          const name = String(item.dataKey ?? item.name ?? "");
          const isSelected = name === selectedParticipant;
          const value = Number(item.value ?? 0);
          const gap = leaderValue - value;

          return (
            <div
              key={name}
              className={cn(
                "flex items-center gap-2 rounded px-1 py-0.5",
                isSelected && "bg-selection"
              )}
            >
              <span className="w-3 shrink-0 text-muted-foreground tabular-nums">
                {index === 0 ? (
                  <Trophy className="size-3" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: config[name]?.color as string }}
              />
              <span
                className={cn(
                  "flex-1 truncate",
                  isSelected
                    ? "font-semibold text-selection-foreground"
                    : "text-muted-foreground"
                )}
              >
                {config[name]?.label ?? name}
              </span>
              {showGapToLeader && gap > 0 ? (
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                  {`−${gap}`}
                </span>
              ) : null}
              <span
                className={cn(
                  "font-mono tabular-nums",
                  isSelected
                    ? "font-semibold text-selection-foreground"
                    : "text-foreground"
                )}
              >
                {value.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
