import { Column } from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn("", className)}>
      <Button
        variant="ghost"
        size={null}
        className="h-6 px-1 data-popup-open:bg-accent sm:h-8 sm:px-2"
        onClick={() => column.toggleSorting()}
      >
        <span className="text-[11px] sm:text-sm">{title}</span>
      </Button>
    </div>
  );
}
