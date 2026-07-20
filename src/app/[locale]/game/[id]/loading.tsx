import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function GameLoading() {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Page title */}
      <div className="w-full pb-6 text-left">
        <Skeleton className="h-8 w-64" />
      </div>

      {/* Tabs list */}
      <Skeleton className="mb-4 h-10 w-56 rounded-md" />

      {/* Score / matchup header */}
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="size-16 rounded-full" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-14" />
          </div>
          <Skeleton className="h-16 w-32 rounded-lg" />
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="size-16 rounded-full" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>

        {/* Game info card */}
        <div className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-40" />
          ))}
        </div>

        {/* Content rows */}
        <div className="flex flex-col gap-3 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
