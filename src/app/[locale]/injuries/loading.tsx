import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

// The report waits on the injury file plus the NHL rosters it is matched
// against, so the shell is a handful of team cards.
export default function InjuriesLoading() {
  return (
    <div className="w-full">
      <Skeleton className="mb-2 h-8 w-64" />
      <Skeleton className="mb-6 h-4 w-80" />

      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, card) => (
          <div key={card} className="rounded-xl border p-6">
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-5 w-44" />
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, row) => (
                <Skeleton key={row} className="h-9 w-full rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
