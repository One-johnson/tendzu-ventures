"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ColumnDef } from "@tanstack/react-table";
import { api } from "@convex/_generated/api";
import { useSessionToken } from "@/components/providers/auth-provider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageLoader } from "@/components/shared/page-loader";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import {
  MobileCard,
  MobileCardField,
  getCellValue,
} from "@/components/data-table/mobile-card-list";
import { FadeIn } from "@/components/motion/page-wrapper";
import { formatCurrency, formatDateOnly, fromInputDate, toInputDate } from "@/lib/format";
import type { SaleRecord } from "@/types";
import { History } from "lucide-react";

export default function SalesHistoryPage() {
  const token = useSessionToken();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<"all" | "daily" | "weekly" | "monthly" | "custom">("all");
  const [startDate, setStartDate] = useState(toInputDate(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(toInputDate(Date.now()));

  const sales = useQuery(
    api.sales.list,
    token
      ? {
          token,
          search: search || undefined,
          period: period === "all" ? undefined : period,
          startDate: period === "custom" ? fromInputDate(startDate) : undefined,
          endDate: period === "custom" ? fromInputDate(endDate) : undefined,
          limit: 200,
        }
      : "skip"
  ) as SaleRecord[] | undefined;

  const columns = useMemo<ColumnDef<SaleRecord>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium">{row.original.invoiceNumber}</span>
        ),
      },
      {
        accessorKey: "machineName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Machine" />,
      },
      {
        accessorKey: "quantity",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Qty" />,
      },
      {
        accessorKey: "unitPrice",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Unit Price" />,
        cell: ({ row }) => formatCurrency(row.original.unitPrice),
      },
      {
        accessorKey: "totalAmount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
        cell: ({ row }) => (
          <span className="font-semibold">{formatCurrency(row.original.totalAmount)}</span>
        ),
      },
      {
        accessorKey: "salesperson",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Salesperson" />,
      },
      {
        accessorKey: "saleDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateOnly(row.original.saleDate)}
          </span>
        ),
      },
    ],
    []
  );

  const totalRevenue = sales?.reduce((sum, s) => sum + s.totalAmount, 0) ?? 0;
  const totalUnits = sales?.reduce((sum, s) => sum + s.quantity, 0) ?? 0;

  if (!sales) return <PageLoader />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <FadeIn>
        <div>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">Sales History</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            {sales.length} transactions · {totalUnits} units · {formatCurrency(totalRevenue)} total
          </p>
        </div>
      </FadeIn>

      <div className="flex flex-col gap-3 lg:flex-row">
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="h-10 w-full touch-manipulation lg:w-44">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="daily">Today</SelectItem>
            <SelectItem value="weekly">This Week</SelectItem>
            <SelectItem value="monthly">This Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
        {period === "custom" && (
          <>
            <Input type="date" className="h-10 w-full touch-manipulation lg:w-40" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input type="date" className="h-10 w-full touch-manipulation lg:w-40" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </>
        )}
      </div>

      {sales.length === 0 ? (
        <EmptyState
          title="No sales found"
          description="Try adjusting your filters or record a new sale."
          icon={<History className="h-8 w-8" />}
        />
      ) : (
        <DataTable
          columns={columns}
          data={sales}
          searchPlaceholder="Search invoice, machine, salesperson..."
          pageSize={10}
          emptyMessage="No sales found"
          mobileCard={(row) => (
            <MobileCard>
              <MobileCardField label="Invoice" value={row.original.invoiceNumber} />
              <MobileCardField label="Machine" value={row.original.machineName} />
              <MobileCardField label="Qty" value={row.original.quantity} />
              <MobileCardField label="Total" value={formatCurrency(row.original.totalAmount)} />
              <MobileCardField label="Salesperson" value={row.original.salesperson} />
              <MobileCardField label="Date" value={getCellValue(row, "saleDate")} />
            </MobileCard>
          )}
          toolbarChildren={
            <Input
              placeholder="Server search..."
              className="hidden h-10 w-full touch-manipulation sm:max-w-[180px] lg:block"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          }
        />
      )}
    </div>
  );
}
