"use client";

/*
The outcomes a survivor date produced, named in words.

Plain markup, and in its own file rather than beside the chart it belongs to,
for the reason `colors.ts` records: anything the dialog imports statically
pulls its whole module graph into the bundle, and the chart's graph is Recharts.
The legend is on screen the moment the dialog opens, so importing it from the
chart file would undo the lazy load the chart is behind.

It is also not Recharts' own legend, which keys off the series and would show a
single entry called "picks" — the identity on that chart is per bar. And it is
not optional: the fills are the weaker channel, so the words have to be on
screen rather than waiting behind a hover.
*/

import { useTranslations } from "next-intl";

import { PickOutcome } from "@/data/survivor/model";
import { PICK_OUTCOME_LABEL_KEY } from "@/lib/survivor";

import { SURVIVOR_OUTCOME_COLORS } from "./colors";

export function SurvivorOutcomeLegend({
  // Only the outcomes the date actually produced: a Saturday nobody lost on
  // should not carry a "Lost" key.
  outcomes,
  counts,
}: {
  outcomes: PickOutcome[];
  counts: Record<PickOutcome, number>;
}) {
  const t = useTranslations();

  if (outcomes.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {outcomes.map((outcome) => (
        <li key={outcome} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: SURVIVOR_OUTCOME_COLORS[outcome] }}
          />
          <span className="text-muted-foreground">
            {t(PICK_OUTCOME_LABEL_KEY[outcome])}
          </span>
          <span className="tabular-nums">{counts[outcome]}</span>
        </li>
      ))}
    </ul>
  );
}
