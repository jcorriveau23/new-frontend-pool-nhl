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
  TableMeta,
  InitialTableState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React from "react";
import { useTranslations } from "next-intl";

declare module "@tanstack/table-core" {
  interface TableMeta<TData> {
    props: any | null; // eslint-disable-line
    getRowStyles: (row: Row<TData>) => string | null | undefined;
    onRowClick: (row: Row<TData>) => void;
    t: any | null; // eslint-disable-line
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  initialState: InitialTableState | undefined;
  meta: TableMeta<TData> | undefined;
  title: string | null;
  tableFooter: React.ReactElement<unknown> | null;
}

const getPinnedClassName = (
  isPinned: "left" | "right" | false,
  rowStyles: string
) => {
  if (isPinned === "left") {
    return `sticky left-0 bg-primary-foreground text-left ${rowStyles}`;
  } else if (isPinned === "right") {
    return `sticky right-0 bg-primary-foreground text-right ${rowStyles}`;
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
  tableFooter = null,
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
  const t = useTranslations();

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
                        header.column.getIsPinned(),
                        ""
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
              table.getRowModel().rows.map((row) => {
                const rowStyles = table.options.meta?.getRowStyles(row) || "";
                return (
                  <TableRow
                    key={row.id}
                    onClick={() => table.options.meta?.onRowClick(row)}
                    className={rowStyles}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={`${getPinnedClassName(
                          cell.column.getIsPinned(),
                          rowStyles
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
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t("NoData")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {tableFooter ? <TableFooter>{tableFooter}</TableFooter> : null}
        </Table>
      </div>
    </div>
  );
}
