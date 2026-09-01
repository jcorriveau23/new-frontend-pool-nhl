import { Position } from "@/data/pool/model";

/*
Chart palettes, kept apart from `utils.tsx` on purpose.

These are plain strings, but `utils.tsx` also holds a helper that builds
Recharts elements. Anything importing a colour from there pulled the whole
library in with it — which is how `cap-allocation-chart`, a div-based meter
that draws no chart at all, was putting Recharts in the initial bundle of every
pool page. Splitting the constants out keeps that import free.
*/

// Forwards, defense and goalies keep the same color everywhere they are charted
// together. These three slots are not consecutive on purpose: chart-1/2/3 are
// neighbouring blues that fall under the perceptual separation floor, while
// chart-1/3/5 clear it in both light and dark mode.
export const POSITION_COLORS: Record<Position, string> = {
  [Position.F]: "var(--chart-1)",
  [Position.D]: "var(--chart-3)",
  [Position.G]: "var(--chart-5)",
};

// Colors used to give each pool participant a stable identity across every
// chart of the pool. Indexed by the participant position in the pool.
export const PARTICIPANT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];
