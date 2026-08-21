import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Shown while the pool list of a season is fetched, the page is rendered with
// no store cache so switching season always waits on the backend.
export default function PoolsLoading() {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Page title and pool count */}
        <div className="flex flex-col gap-1 pb-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      <div className="w-full space-y-4">
        {/* Search field and season selector */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-9 w-full rounded-md sm:max-w-sm" />
          <Skeleton className="h-9 w-64 rounded-md" />
        </div>

        {/* Status tabs */}
        <Skeleton className="h-10 w-72 rounded-md" />

        {/* Pool cards */}
        <div className="grid gap-2 pt-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[58px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
