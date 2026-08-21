import { ReferenceArea } from "recharts";

import { Position } from "@/data/pool/model";

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

export const generateReferenceAreas = (
  data: Record<string, string | number | boolean>[],
  visibleStartIndex = 0,
  visibleEndIndex = data.length - 1
) => {
  // Returns the areas where the player was not in the alignment to display a
  // shaded background when it occurs. Areas are clamped to the visible window
  // (controlled by the brush) since recharts discards reference areas whose
  // bounds fall outside the rendered domain.
  const areas: React.ReactElement[] = [];
  let start: number | null = null;

  const pushArea = (startIndex: number, endIndex: number) => {
    const clampedStart = Math.max(startIndex, visibleStartIndex);
    const clampedEnd = Math.min(endIndex, visibleEndIndex);
    if (clampedStart > clampedEnd) {
      return;
    }
    areas.push(
      <ReferenceArea
        key={`area-${startIndex}-${endIndex}`}
        x1={data[clampedStart].date as string}
        x2={data[clampedEnd].date as string}
        fill="var(--destructive)"
        fillOpacity={0.12}
        stroke="var(--destructive)"
        strokeOpacity={0.35}
        strokeDasharray="4 4"
      />
    );
  };

  data.forEach((point, index) => {
    if (!point.isInRoster && start === null) {
      start = index;
    } else if (point.isInRoster && start !== null) {
      pushArea(start, index - 1);
      start = null;
    }
  });

  // Handle case where the last area extends to the end
  if (start !== null) {
    pushArea(start, data.length - 1);
  }

  return areas;
};
