import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";

type SortDirection = "asc" | "desc" | null;

interface SortableHeaderCellProps {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
}

export default function SortHeaderCell({
  label,
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
}: SortableHeaderCellProps) {
  const handleSort = () => {
    onSort(sortKey);
  };

  return (
    <th className="p-0 m-0">
      <Button
        variant="ghost"
        onClick={handleSort}
        className="flex items-center space-x-1 font-semibold text-left p-1"
      >
        <span>{label}</span>
        {currentSortKey === sortKey ? (
          sortDirection === "asc" ? (
            <ArrowUp className="size-4" />
          ) : (
            <ArrowDown className="size-4" />
          )
        ) : null}
      </Button>
    </th>
  );
}
