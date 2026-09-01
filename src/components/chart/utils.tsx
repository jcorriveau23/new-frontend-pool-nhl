import { ReferenceArea } from "recharts";

// The one chart helper that builds Recharts elements, which is why it is kept
// out of `colors.ts`: importing a colour must not pull the library in.

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
