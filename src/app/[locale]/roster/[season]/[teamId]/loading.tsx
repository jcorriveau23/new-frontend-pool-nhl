import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Two accordions of season stats, both fetched from the NHL API on the server.
export default function RosterLoading() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Skeleton className="size-[60px] rounded-full" />

      {/* Team and season selectors */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Skeleton className="h-9 w-52 rounded-md" />
        <Skeleton className="h-9 w-52 rounded-md" />
      </div>

      {["skaters", "goalies"].map((section) => (
        <div key={section} className="w-full">
          <Skeleton className="mb-2 h-10 w-40" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
