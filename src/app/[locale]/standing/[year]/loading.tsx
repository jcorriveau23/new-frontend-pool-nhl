import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

// The standing is fetched on the server, so switching season or landing on the
// page waits on the NHL API with nothing on screen otherwise.
export default function StandingLoading() {
  return (
    <div>
      {/* Page title and "as of" subtitle */}
      <div className="flex flex-col gap-1 pb-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Grouping tabs and season selector */}
      <div className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-80 rounded-md" />
        <Skeleton className="h-9 w-56 rounded-md" />
      </div>

      {/* Standing table */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-full rounded-md" />
        {Array.from({ length: 16 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
