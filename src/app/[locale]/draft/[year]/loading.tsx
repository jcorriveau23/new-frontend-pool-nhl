import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the draft page: title, the round summary header, then the accordion
// with the first round expanded.
export default function DraftLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 pb-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-28" />
      </div>

      {/* Year selector and pick counters */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-40 rounded-md" />
        <Skeleton className="h-12 w-24 rounded-lg" />
        <Skeleton className="h-12 w-24 rounded-lg" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {/* Collapsed round headers, then the first round's table */}
        <div className="flex flex-col gap-3 px-4 py-4">
          <Skeleton className="h-6 w-56" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-t px-4 py-4">
            <Skeleton className="h-6 w-56" />
          </div>
        ))}
      </div>
    </div>
  );
}
