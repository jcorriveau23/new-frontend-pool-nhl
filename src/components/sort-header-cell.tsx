import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

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
        className="flex items-center space-x-1 font-semibold text-left p-2"
      >
        <span>{label}</span>
        {currentSortKey === sortKey ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 text-gray-400" />
        )}
      </Button>
    </th>
  );
}