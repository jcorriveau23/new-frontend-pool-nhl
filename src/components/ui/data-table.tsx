"use client";

import {
  Row,
  ColumnDef,
  SortingState,
  ColumnPinningState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React from "react";

declare module "@tanstack/table-core" {
  interface TableMeta<TData extends unknown> {
    props: any | null;
    getRowStyles: (row: Row<TData>) => string;
    onRowClick: (row: Row<TData>) => void;
    t: any | null;
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  initialState: any | null;
  meta: any | null;
  title: string | null;
}

const getPinnedClassName = (isPinned: "left" | "right" | false) => {
  if (isPinned === "left") {
    return "sticky left-0 bg-primary-foreground text-left";
  } else if (isPinned === "right") {
    return "sticky right-0 bg-primary-foreground text-right";
  }
  return "";
};

const getSortedColumnClassName = (isSorted: "asc" | "desc" | false) => {
  if (isSorted === false) {
    return "";
  } else {
    return "bg-selection";
  }
};

export function DataTable<TData, TValue>({
  columns,
  data,
  meta,
  initialState,
  title,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(
    initialState?.sorting ?? []
  );
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(
    initialState?.columnPinning ?? {
      left: [],
      right: [],
    }
  );

  const table = useReactTable({
    data,
    columns,
    enableColumnPinning: true,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    onColumnPinningChange: setColumnPinning,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnPinning,
    },
    meta: meta,
    initialState: initialState,
  });

  return (
    <div>
      {/*Table*/}
      <div className="rounded-md border">
        <Table>
          {title ? <TableCaption>{title}</TableCaption> : null}
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={`border-2 ${getPinnedClassName(
                        header.column.getIsPinned()
                      )}`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => table.options.meta?.onRowClick(row)}
                  className={table.options.meta?.getRowStyles(row)}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`${getPinnedClassName(
                        cell.column.getIsPinned()
                      )} ${getSortedColumnClassName(
                        cell.column.getIsSorted()
                      )}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
