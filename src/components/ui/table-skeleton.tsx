import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  showTitle?: boolean;
  // What is being loaded. A skeleton is purely visual, so without this a
  // screen reader is told nothing at all while the table is in flight.
  label?: string;
}

export function TableSkeleton({
  rows = 6,
  showTitle = true,
  label,
}: TableSkeletonProps) {
  return (
    <div
      className="flex w-full flex-col gap-3 py-2"
      role={label ? "status" : undefined}
      aria-label={label}
    >
      {showTitle ? <Skeleton className="h-6 w-48" /> : null}
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
