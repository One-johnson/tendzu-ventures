"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { ColumnDef } from "@tanstack/react-table";
import { api } from "@convex/_generated/api";
import { useSessionToken } from "@/components/providers/auth-provider";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/shared/page-loader";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import {
  MobileCard,
  MobileCardField,
  getCellValue,
} from "@/components/data-table/mobile-card-list";
import {
  RevenueTrendChart,
  StockBreakdownChart,
  TopSellingChart,
} from "@/components/charts/dashboard-charts";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { FadeIn, MotionCard, staggerContainer } from "@/components/motion/page-wrapper";
import { motion } from "framer-motion";
import type {
  MachineStats,
  RevenueStats,
  RestockingRecord,
  SaleRecord,
  TopSellingRecord,
} from "@/types";
import {
  Package,
  Layers,
  CheckCircle,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  XCircle,
} from "lucide-react";

export default function DashboardPage() {
  const token = useSessionToken();

  const machineStats = useQuery(api.machines.stats, token ? { token } : "skip") as MachineStats | undefined;
  const revenueStats = useQuery(api.sales.revenueStats, token ? { token } : "skip") as RevenueStats | undefined;
  const topSelling = useQuery(api.sales.topSelling, token ? { token, limit: 5 } : "skip") as TopSellingRecord[] | undefined;
  const overview = useQuery(api.dashboard.getOverview, token ? { token } : "skip") as
    | { recentSales: SaleRecord[]; recentRestocking: RestockingRecord[] }
    | undefined;
  const chartData = useQuery(api.dashboard.getChartData, token ? { token } : "skip") as
    | {
        stockBreakdown: { name: string; value: number; fill: string }[];
        dailyRevenue: { date: string; revenue: number; units: number }[];
        revenueComparison: { period: string; revenue: number }[];
      }
    | undefined;

  const loading = !machineStats || !revenueStats || !overview || !chartData;

  const recentSales = overview?.recentSales ?? [];
  const recentRestocking = overview?.recentRestocking ?? [];
  const topSellingData = topSelling ?? [];

  const salesColumns = useMemo<ColumnDef<SaleRecord>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.invoiceNumber}</span>
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
        accessorKey: "totalAmount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Amount" className="ml-auto" />
        ),
        cell: ({ row }) => (
          <span className="font-semibold">{formatCurrency(row.original.totalAmount)}</span>
        ),
      },
    ],
    []
  );

  const restockColumns = useMemo<ColumnDef<RestockingRecord>[]>(
    () => [
      {
        accessorKey: "machineName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Machine" />,
      },
      {
        accessorKey: "quantityAdded",
        header: "Added",
        cell: ({ row }) => (
          <Badge variant="success">+{row.original.quantityAdded}</Badge>
        ),
      },
      {
        accessorKey: "newQuantity",
        header: ({ column }) => <DataTableColumnHeader column={column} title="New Stock" />,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    []
  );

  const topSellingColumns = useMemo<ColumnDef<TopSellingRecord & { rank: number }>[]>(
    () => [
      {
        accessorKey: "rank",
        header: "Rank",
        cell: ({ row }) => (
          <Badge variant={row.original.rank === 1 ? "default" : "secondary"}>
            #{row.original.rank}
          </Badge>
        ),
      },
      {
        accessorKey: "machineName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Machine" />,
        cell: ({ row }) => <span className="font-medium">{row.original.machineName}</span>,
      },
      {
        accessorKey: "totalQuantity",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Units Sold" />,
      },
      {
        accessorKey: "totalRevenue",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Revenue" />,
        cell: ({ row }) => formatCurrency(row.original.totalRevenue),
      },
    ],
    []
  );

  const topSellingWithRank = topSellingData.map((item, i) => ({ ...item, rank: i + 1 }));

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 sm:space-y-8">
      <FadeIn>
        <div>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">Business Overview</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Real-time snapshot of your inventory and sales performance
          </p>
        </div>
      </FadeIn>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4"
      >
        <StatCard index={0} title="Total Machines" value={formatNumber(machineStats.totalMachines)} icon={Package} />
        <StatCard index={1} title="Categories" value={formatNumber(machineStats.totalCategories)} icon={Layers} />
        <StatCard index={2} title="In Stock" value={formatNumber(machineStats.inStock)} icon={CheckCircle} variant="success" />
        <StatCard index={3} title="Low Stock Alerts" value={formatNumber(machineStats.lowStock)} icon={AlertTriangle} variant="warning" />
        <StatCard index={4} title="Out of Stock" value={formatNumber(machineStats.outOfStock)} icon={XCircle} variant="danger" />
        <StatCard index={5} title="Today's Sales" value={formatNumber(revenueStats.todaySales)} description={`Revenue: ${formatCurrency(revenueStats.todayRevenue)}`} icon={ShoppingCart} />
        <StatCard index={6} title="Weekly Sales" value={formatNumber(revenueStats.weeklySales)} description={`Revenue: ${formatCurrency(revenueStats.weeklyRevenue)}`} icon={TrendingUp} />
        <StatCard index={7} title="Monthly Revenue" value={formatCurrency(revenueStats.monthlyRevenue)} description={`${formatNumber(revenueStats.monthlySales)} units sold`} icon={DollarSign} variant="success" />
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <MotionCard>
          <RevenueTrendChart data={chartData.dailyRevenue} />
        </MotionCard>
        <MotionCard>
          <StockBreakdownChart data={chartData.stockBreakdown} />
        </MotionCard>
      </div>

      <MotionCard>
        <TopSellingChart data={topSellingData} />
      </MotionCard>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <DataTable
              columns={salesColumns}
              data={recentSales}
              pageSize={5}
              hideToolbar
              emptyMessage="No sales yet"
              mobileCard={(row) => (
                <MobileCard>
                  <MobileCardField label="Invoice" value={getCellValue(row, "invoiceNumber")} />
                  <MobileCardField label="Machine" value={getCellValue(row, "machineName")} />
                  <MobileCardField label="Qty" value={getCellValue(row, "quantity")} />
                  <MobileCardField label="Amount" value={getCellValue(row, "totalAmount")} />
                </MobileCard>
              )}
            />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Recent Restocking</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <DataTable
              columns={restockColumns}
              data={recentRestocking}
              pageSize={5}
              hideToolbar
              emptyMessage="No restocking yet"
              mobileCard={(row) => (
                <MobileCard>
                  <MobileCardField label="Machine" value={getCellValue(row, "machineName")} />
                  <MobileCardField label="Added" value={getCellValue(row, "quantityAdded")} />
                  <MobileCardField label="New Stock" value={getCellValue(row, "newQuantity")} />
                  <MobileCardField label="Date" value={getCellValue(row, "createdAt")} />
                </MobileCard>
              )}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Top Selling Machines</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <DataTable
            columns={topSellingColumns}
            data={topSellingWithRank}
            pageSize={5}
            hideToolbar
            emptyMessage="No sales data yet"
            mobileCard={(row) => (
              <MobileCard>
                <MobileCardField label="Rank" value={getCellValue(row, "rank")} />
                <MobileCardField label="Machine" value={getCellValue(row, "machineName")} />
                <MobileCardField label="Units" value={getCellValue(row, "totalQuantity")} />
                <MobileCardField label="Revenue" value={getCellValue(row, "totalRevenue")} />
              </MobileCard>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
