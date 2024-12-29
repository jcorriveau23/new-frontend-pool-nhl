import { ReferenceArea } from "recharts";

export const generateReferenceAreas = (
  data: Record<string, string | number | boolean>[]
) => {
  // Returns the areas where the player was not in the alignment to display the background in red when it occur.
  const areas = [];
  let start: number | null = null;

  data.forEach((point, index) => {
    if (!point.isInRoster && start === null) {
      start = index;
    } else if (point.isInRoster && start !== null) {
      areas.push(
        <ReferenceArea
          key={`area-${start}-${index - 1}`}
          x1={data[start].date as string}
          x2={data[index - 1].date as string}
          fill="rgba(255, 0, 0, 0.4)"
        />
      );
      start = null;
    }
  });

  // Handle case where the last area extends to the end
  if (start !== null) {
    areas.push(
      <ReferenceArea
        key={`area-${start}-${data.length - 1}`}
        x1={data[start].date as string}
        x2={data[data.length - 1].date as string}
        fill="rgba(255, 0, 0, 0.4)"
      />
    );
  }

  return areas;
};
