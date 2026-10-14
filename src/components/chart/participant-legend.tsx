"use client";

import * as React from "react";

import { ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export interface ParticipantLegendEntry {
  name: string;
  total: number;
}

interface ParticipantLegendProps {
  config: ChartConfig;
  // Participants in the order they should be listed, best first.
  standings: ParticipantLegendEntry[];
  selectedParticipant: string;
  onSelect: (participant: string) => void;
}

// The legend shared by the participant charts: it doubles as a mini standing,
// marks the pooler in view, and selects another one on click.
export function ParticipantLegend({
  config,
  standings,
  selectedParticipant,
  onSelect,
}: ParticipantLegendProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {standings.map((entry, index) => {
        const isSelected = entry.name === selectedParticipant;
        return (
          <button
            key={entry.name}
            type="button"
            onClick={() => onSelect(entry.name)}
            aria-pressed={isSelected}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs transition-colors",
              isSelected
                ? "border-primary/40 bg-selection font-semibold text-selection-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted",
            )}
          >
            <span className="tabular-nums opacity-60">{index + 1}</span>
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: config[entry.name]?.color as string }}
            />
            {config[entry.name]?.label ?? entry.name}
            <span className="font-mono tabular-nums">
              {entry.total.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
