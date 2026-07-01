"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { MobileCardList } from "./mobile-card-list";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  searchKey?: string;
  toolbarChildren?: React.ReactNode;
  mobileCard?: (row: Row<TData>, index: number) => React.ReactNode;
  emptyMessage?: string;
  pageSize?: number;
  enableRowSelection?: boolean;
  getRowId?: (row: TData) => string;
  onSelectedRowsChange?: (rows: TData[]) => void;
  highlightRowId?: string | null;
  className?: string;
  hideToolbar?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder,
  searchKey,
  toolbarChildren,
  mobileCard,
  emptyMessage = "No results found.",
  pageSize = 10,
  enableRowSelection = false,
  getRowId,
  onSelectedRowsChange,
  highlightRowId,
  className,
  hideToolbar = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const dataRef = useRef(data);
  const getRowIdRef = useRef(getRowId);
  const onSelectedRowsChangeRef = useRef(onSelectedRowsChange);
  const lastNotifiedSelectionRef = useRef("");

  dataRef.current = data;
  getRowIdRef.current = getRowId;
  onSelectedRowsChangeRef.current = onSelectedRowsChange;

  const resolveRowId = (row: TData) => {
    if (getRowIdRef.current) return getRowIdRef.current(row);
    const record = row as { _id?: string };
    return record._id ?? "";
  };

  const tableColumns = useMemo(() => {
    if (!enableRowSelection) return columns;

    const selectionColumn: ColumnDef<TData, TValue> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };

    return [selectionColumn, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    enableRowSelection,
    getRowId: getRowId ?? ((row, index) => {
      const record = row as { _id?: string };
      return record._id ?? String(index);
    }),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize } },
  });

  useEffect(() => {
    if (!onSelectedRowsChangeRef.current) return;

    const selectedKeys = Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .sort()
      .join("|");

    if (selectedKeys === lastNotifiedSelectionRef.current) return;
    lastNotifiedSelectionRef.current = selectedKeys;

    const selectedRows = dataRef.current.filter((item) => rowSelection[resolveRowId(item)]);
    onSelectedRowsChangeRef.current(selectedRows);
  }, [rowSelection]);

  useEffect(() => {
    if (!highlightRowId) return;

    const index = data.findIndex((item) => resolveRowId(item) === highlightRowId);
    if (index < 0) return;

    const pageIndex = Math.floor(index / pageSize);
    table.setPageIndex(pageIndex);

    const timer = window.setTimeout(() => {
      document
        .querySelector(`[data-row-id="${highlightRowId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [highlightRowId, data, pageSize, table]);

  const rows = table.getRowModel().rows;

  return (
    <div className={cn("space-y-4", className)}>
      {!hideToolbar && (
        <DataTableToolbar
          table={table}
          searchPlaceholder={searchPlaceholder}
          searchKey={searchKey}
        >
          {toolbarChildren}
        </DataTableToolbar>
      )}

      {mobileCard && (
        <MobileCardList
          rows={rows}
          renderCard={mobileCard}
          emptyMessage={emptyMessage}
          highlightRowId={highlightRowId}
          getRowId={(rowData) => resolveRowId(rowData)}
        />
      )}

      <div className={cn("rounded-xl border border-border bg-card", mobileCard && "hidden md:block")}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => {
                  const rowDomId = resolveRowId(row.original);
                  const isHighlighted = highlightRowId === rowDomId;

                  return (
                  <TableRow
                    key={row.id}
                    data-row-id={rowDomId}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      "transition-colors",
                      isHighlighted && "bg-yellow-500/10 ring-2 ring-inset ring-yellow-500/40"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={tableColumns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} />
      </div>

      {mobileCard && rows.length > 0 && (
        <div className="md:hidden">
          <DataTablePagination table={table} />
        </div>
      )}
    </div>
  );
}
