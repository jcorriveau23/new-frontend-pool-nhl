"use client";

import {
  Row,
  Column,
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
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

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
  // Set when `meta.onRowClick` actually does something, so the rows advertise
  // themselves as clickable.
  rowClickable?: boolean;
  // Footer values keyed by column id, so the totals row follows the same
  // column order as the body (including pinned columns).
  footerCells?: Record<string, React.ReactNode> | null;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  meta,
  initialState,
  title,
  tableFooter = null,
  footerCells = null,
  rowClickable = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(
    initialState?.sorting ?? [],
  );
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(
    initialState?.columnPinning ?? {
      left: [],
      right: [],
    },
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

  // `getVisibleLeafColumns()` keeps the declaration order, while the header
  // and the body rows render pinned columns first and last. The footer has to
  // follow that same visual order to stay aligned.
  const leftPinnedColumns = table.getLeftVisibleLeafColumns();
  const rightPinnedColumns = table.getRightVisibleLeafColumns();
  const leafColumns = [
    ...leftPinnedColumns,
    ...table.getCenterVisibleLeafColumns(),
    ...rightPinnedColumns,
  ];
  const rows = table.getRowModel().rows;
  const firstColumnId = leafColumns[0]?.id;
  const lastLeftPinnedId = leftPinnedColumns[leftPinnedColumns.length - 1]?.id;
  const firstRightPinnedId = rightPinnedColumns[0]?.id;

  // Pinned columns are stacked, so each one needs the total width of the
  // pinned columns before it as its sticky offset. Widths are measured on the
  // first body row since the columns are sized by their content.
  const measuredCells = React.useRef<Record<string, HTMLTableCellElement>>({});
  const [pinnedOffsets, setPinnedOffsets] = React.useState<
    Record<string, number>
  >({});

  const pinnedIds = [...leftPinnedColumns, ...rightPinnedColumns]
    .map((column) => column.id)
    .join(",");

  React.useEffect(() => {
    const computeOffsets = () => {
      const offsets: Record<string, number> = {};

      let left = 0;
      leftPinnedColumns.forEach((column) => {
        offsets[column.id] = left;
        left += measuredCells.current[column.id]?.offsetWidth ?? 0;
      });

      let right = 0;
      [...rightPinnedColumns].reverse().forEach((column) => {
        offsets[column.id] = right;
        right += measuredCells.current[column.id]?.offsetWidth ?? 0;
      });

      setPinnedOffsets((previous) => {
        const isSame = Object.keys(offsets).every(
          (id) => previous[id] === offsets[id],
        );
        return isSame &&
          Object.keys(previous).length === Object.keys(offsets).length
          ? previous
          : offsets;
      });
    };

    computeOffsets();

    const observer = new ResizeObserver(computeOffsets);
    Object.values(measuredCells.current).forEach((cell) =>
      observer.observe(cell),
    );
    return () => observer.disconnect();
    // `pinnedIds` is the joined id string of the two pinned-column arrays: it
    // is their stable identity. Depending on the arrays themselves would re-run
    // this on every render, since they are rebuilt each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedIds, data.length]);

  const getPinnedStyle = (column: Column<TData, unknown>) => {
    const isPinned = column.getIsPinned();
    if (isPinned === "left") {
      return { left: pinnedOffsets[column.id] ?? 0 };
    }
    if (isPinned === "right") {
      return { right: pinnedOffsets[column.id] ?? 0 };
    }
    return undefined;
  };

  // Sticky cells need an opaque background, otherwise the scrolled content
  // shows through them. `headerBackground` is used on the two header rows.
  const getPinnedClassName = (
    column: Column<TData, unknown>,
    headerBackground: boolean,
    rowStyles = "",
  ) => {
    const isPinned = column.getIsPinned();
    if (!isPinned) {
      return "";
    }

    // The sorted tint has to be blended into an opaque color here: a
    // translucent background would let the scrolled columns show through.
    const isSorted = Boolean(column.getIsSorted());
    const background = headerBackground
      ? isSorted
        ? "bg-[color-mix(in_oklab,var(--primary)_20%,var(--muted))]"
        : "bg-muted"
      : isSorted && !rowStyles
        ? "bg-[color-mix(in_oklab,var(--primary)_10%,var(--card))]"
        : "bg-card";

    // The row hover repaints the `<tr>`, which an opaque pinned cell hides, so
    // the cell has to follow it through the row's `group`. Same reason as the
    // sorted tint above: the translucent `bg-muted/50` of the row is blended
    // here instead. Rows carrying their own highlight bring their own
    // `group-hover:`, and `rowStyles` is applied after this so it wins.
    const hoverBackground = headerBackground
      ? ""
      : "group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))]";

    // A row highlight can carry a left accent border, meant for the leading
    // edge of the row. Only the first column draws it: the other pinned cells
    // take the highlight background but have to drop the stripe, otherwise it
    // reappears in the middle of the row and against the right pinned block.
    const accentReset = column.id === firstColumnId ? "" : "border-l-0";

    // `z-[1]` only has to beat the scrolling cells of the same row: anything
    // higher would also cover the sticky page header and the sticky action
    // bars, which sit above the table.
    if (isPinned === "left") {
      return cn(
        "sticky z-[1] text-left",
        background,
        hoverBackground,
        rowStyles,
        accentReset,
        column.id === lastLeftPinnedId && "border-r",
      );
    }
    return cn(
      "sticky z-[1] text-right",
      background,
      hoverBackground,
      rowStyles,
      accentReset,
      // The colour has to be restated: `rowStyles` may have tinted the left
      // border for the accent above, and only its width is reset here.
      column.id === firstRightPinnedId && "border-l border-l-border",
    );
  };

  // Only draw a vertical rule where a header group starts, so grouped tables
  // stay readable without turning every cell into a box.
  const startsColumnGroup = (column: Column<TData, unknown>) => {
    const firstLeafId = column.getLeafColumns()[0]?.id ?? column.id;
    if (firstLeafId === firstColumnId) {
      return false;
    }
    if (column.parent) {
      return column.parent.columns[0]?.id === column.id;
    }
    return column.columns.length > 0;
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {title ? (
        <div className="border-b px-2 py-2 text-xs font-semibold sm:px-4 sm:py-2.5 sm:text-sm">
          {title}
        </div>
      ) : null}
      {/* `border-separate` is what makes the pinned columns work: under the
          collapsed border model the borders belong to the table rather than to
          the cells, so they stay behind while a sticky cell scrolls away with
          its background only. The row borders below therefore live on the
          cells, since `<tr>` borders are not drawn in this model. */}
      <Table className="border-separate border-spacing-0">
        <TableHeader className="bg-muted">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const sortDirection = header.column.getIsSorted();

                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={getPinnedStyle(header.column)}
                    className={cn(
                      "h-7 whitespace-nowrap border-b px-1 text-[11px] font-medium sm:h-9 sm:px-3 sm:text-sm",
                      header.colSpan > 1 && "text-center",
                      sortDirection &&
                        "bg-primary/20 font-semibold text-foreground",
                      startsColumnGroup(header.column) && "border-l",
                      // Pinned cells keep their opaque background, so the
                      // sorted tint above only applies to scrollable columns.
                      getPinnedClassName(header.column, true),
                    )}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          "flex items-center gap-0.5",
                          header.colSpan > 1 && "justify-center",
                        )}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {sortDirection === "desc" ? (
                          <ArrowDown className="size-3 shrink-0 text-primary" />
                        ) : sortDirection === "asc" ? (
                          <ArrowUp className="size-3 shrink-0 text-primary" />
                        ) : null}
                      </div>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row, rowIndex) => {
              const rowStyles = table.options.meta?.getRowStyles(row) || "";
              const isLastRow = rowIndex === rows.length - 1;
              return (
                <TableRow
                  key={row.id}
                  onClick={() => table.options.meta?.onRowClick(row)}
                  // A clickable row has to be reachable without a mouse.
                  tabIndex={rowClickable ? 0 : undefined}
                  onKeyDown={
                    rowClickable
                      ? (event) => {
                          if (event.key !== "Enter" && event.key !== " ") {
                            return;
                          }
                          if (event.target !== event.currentTarget) {
                            return;
                          }
                          event.preventDefault();
                          table.options.meta?.onRowClick(row);
                        }
                      : undefined
                  }
                  // `group` lets the pinned cells follow the row on hover: they
                  // carry their own opaque background, so a plain `hover:` on
                  // the row alone would only repaint the scrolling cells.
                  className={cn(
                    "group",
                    rowClickable &&
                      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    rowStyles,
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      ref={
                        rowIndex === 0
                          ? (element) => {
                              if (element) {
                                measuredCells.current[cell.column.id] = element;
                              } else {
                                delete measuredCells.current[cell.column.id];
                              }
                            }
                          : undefined
                      }
                      style={getPinnedStyle(cell.column)}
                      className={cn(
                        "whitespace-nowrap px-1 py-0.5 text-[11px] tabular-nums sm:px-3 sm:py-2 sm:text-sm",
                        !isLastRow && "border-b",
                        startsColumnGroup(cell.column) && "border-l",
                        // The sorted column is tinted, unless the whole row
                        // already carries a highlight of its own.
                        !rowStyles &&
                          cell.column.getIsSorted() &&
                          "bg-primary/10 font-semibold",
                        getPinnedClassName(cell.column, false, rowStyles),
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={leafColumns.length}
                className="h-24 text-center text-muted-foreground"
              >
                {t("NoData")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {footerCells ? (
          <TableFooter className="bg-muted">
            <TableRow className="hover:bg-transparent">
              {leafColumns.map((column) => (
                <TableCell
                  key={column.id}
                  style={getPinnedStyle(column)}
                  className={cn(
                    "whitespace-nowrap border-t px-1 py-1 text-[11px] tabular-nums sm:px-3 sm:py-2 sm:text-sm",
                    startsColumnGroup(column) && "border-l",
                    column.getIsSorted() && "bg-primary/20 text-foreground",
                    getPinnedClassName(column, true),
                  )}
                >
                  {footerCells[column.id] ?? null}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        ) : tableFooter ? (
          // The caller builds these rows, so the separator has to be pushed
          // down onto their cells: `border-separate` ignores it on the
          // `<tfoot>` itself.
          <TableFooter className="[&>tr>td]:border-t">
            {tableFooter}
          </TableFooter>
        ) : null}
      </Table>
    </div>
  );
}
