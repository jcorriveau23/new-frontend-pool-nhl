import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SortDirection = "asc" | "desc" | null;

interface SortableHeaderCellProps {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
  align?: "left" | "right";
  className?: string;
}

export default function SortHeaderCell({
  label,
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
  align = "left",
  className,
}: SortableHeaderCellProps) {
  const isActive = currentSortKey === sortKey;

  return (
    <TableHead
      className={cn("p-0", className)}
      aria-sort={
        isActive
          ? sortDirection === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        // The button fills the cell so the whole header is a hit target, which
        // matters on touch where these columns are only a few characters wide.
        className={cn(
          "group flex h-9 w-full items-center gap-0.5 whitespace-nowrap px-1 font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-10 sm:gap-1 sm:px-2",
          align === "right" && "justify-end",
          isActive && "text-foreground"
        )}
      >
        <span>{label}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="size-3 shrink-0 sm:size-3.5" />
          ) : (
            <ArrowDown className="size-3 shrink-0 sm:size-3.5" />
          )
        ) : (
          // Hint that the column is sortable without adding permanent noise.
          // Dropped on touch, where there is no hover to reveal it and every
          // pixel of column width counts.
          <ChevronsUpDown className="hidden size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-50 sm:block" />
        )}
      </button>
    </TableHead>
  );
}
