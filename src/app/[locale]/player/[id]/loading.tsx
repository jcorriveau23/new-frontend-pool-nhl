import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

// The player landing endpoint is fetched on the server, so the page is blank
// until it answers.
export default function PlayerLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 pb-2">
        <Skeleton className="h-8 w-56" />
      </div>

      {/* Headshot, team logo and the biography rows */}
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-[60px] w-[60px]" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full max-w-md rounded-md" />
        ))}
      </div>

      {/* Season and playoff stat tables */}
      {["season", "playoff"].map((section) => (
        <div key={section} className="w-full">
          <Skeleton className="mb-2 h-10 w-44" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
