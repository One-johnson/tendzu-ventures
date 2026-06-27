"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useSessionToken } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/shared/page-loader";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDateOnly, fromInputDate, toInputDate } from "@/lib/format";
import { getStockStatusLabel } from "@/lib/stock";
import { exportToPDF, exportToExcel } from "@/lib/export";
import type { SaleRecord, StockStatus } from "@/types";
import { FileDown, FileSpreadsheet, FileBarChart } from "lucide-react";
import { RevenueComparisonChart } from "@/components/charts/dashboard-charts";
import { FadeIn } from "@/components/motion/page-wrapper";

interface InventoryReportRow {
  name: string;
  sku: string;
  category: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  stockValue: number;
  retailValue: number;
  status: StockStatus;
}

interface StockAlertRow {
  name: string;
  sku: string;
  category: string;
  quantity: number;
  threshold?: number;
  sellingPrice: number;
  lastUpdated?: number;
}

interface BestSellingRow {
  machineName: string;
  totalQuantity: number;
  totalRevenue: number;
  transactions: number;
}

interface RevenueSummary {
  daily: { revenue: number; units: number; transactions: number };
  weekly: { revenue: number; units: number; transactions: number };
  monthly: { revenue: number; units: number; transactions: number };
  allTime: { revenue: number; units: number; transactions: number };
}

export default function ReportsPage() {
  const token = useSessionToken();
  const [salesPeriod, setSalesPeriod] = useState<"daily" | "weekly" | "monthly" | "custom">("monthly");
  const [startDate, setStartDate] = useState(toInputDate(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(toInputDate(Date.now()));

  const inventory = useQuery(api.reports.inventoryReport, token ? { token } : "skip") as InventoryReportRow[] | undefined;
  const lowStock = useQuery(api.reports.lowStockReport, token ? { token } : "skip") as StockAlertRow[] | undefined;
  const outOfStock = useQuery(api.reports.outOfStockReport, token ? { token } : "skip") as StockAlertRow[] | undefined;
  const salesReport = useQuery(
    api.reports.salesReport,
    token
      ? {
          token,
          period: salesPeriod,
          startDate: salesPeriod === "custom" ? fromInputDate(startDate) : undefined,
          endDate: salesPeriod === "custom" ? fromInputDate(endDate) : undefined,
        }
      : "skip"
  ) as
    | {
        sales: SaleRecord[];
        summary: {
          totalSales: number;
          totalUnits: number;
          totalRevenue: number;
          averageOrderValue: number;
        };
      }
    | undefined;
  const revenueSummary = useQuery(api.reports.revenueSummary, token ? { token } : "skip") as RevenueSummary | undefined;
  const bestSelling = useQuery(api.reports.bestSellingReport, token ? { token, limit: 10 } : "skip") as BestSellingRow[] | undefined;

  const chartData = useQuery(api.dashboard.getChartData, token ? { token } : "skip") as
    | { revenueComparison: { period: string; revenue: number }[] }
    | undefined;

  if (!inventory || !lowStock || !outOfStock || !salesReport || !revenueSummary || !bestSelling || !chartData) {
    return <PageLoader />;
  }

  const handleExport = (
    type: "pdf" | "excel",
    title: string,
    columns: { header: string; key: string }[],
    rows: Array<object>,
    filename: string
  ) => {
    if (type === "pdf") {
      exportToPDF(title, columns, rows, filename);
    } else {
      exportToExcel(title, columns, rows, filename);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <FadeIn>
        <div>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">Business Reports</h2>
          <p className="text-sm text-muted-foreground sm:text-base">Generate and export inventory and sales reports</p>
        </div>
      </FadeIn>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold sm:text-2xl">{formatCurrency(revenueSummary.daily.revenue)}</p>
            <p className="text-xs text-muted-foreground">
              {revenueSummary.daily.transactions} transactions
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Weekly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold sm:text-2xl">{formatCurrency(revenueSummary.weekly.revenue)}</p>
            <p className="text-xs text-muted-foreground">
              {revenueSummary.weekly.transactions} transactions
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold sm:text-2xl">{formatCurrency(revenueSummary.monthly.revenue)}</p>
            <p className="text-xs text-muted-foreground">
              {revenueSummary.monthly.transactions} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <RevenueComparisonChart data={chartData.revenueComparison} />

      <Tabs defaultValue="inventory">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          <TabsTrigger value="out-of-stock">Out of Stock</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="best-selling">Best Selling</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExport(
                  "pdf",
                  "Inventory Report",
                  [
                    { header: "Name", key: "name" },
                    { header: "SKU", key: "sku" },
                    { header: "Category", key: "category" },
                    { header: "Qty", key: "quantity" },
                    { header: "Cost", key: "costPrice" },
                    { header: "Price", key: "sellingPrice" },
                    { header: "Status", key: "status" },
                  ],
                  inventory.map((r) => ({
                    ...r,
                    costPrice: formatCurrency(r.costPrice),
                    sellingPrice: formatCurrency(r.sellingPrice),
                    status: getStockStatusLabel(r.status),
                  })),
                  "inventory-report"
                )
              }
            >
              <FileDown className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExport(
                  "excel",
                  "Inventory",
                  [
                    { header: "Name", key: "name" },
                    { header: "SKU", key: "sku" },
                    { header: "Category", key: "category" },
                    { header: "Quantity", key: "quantity" },
                    { header: "Cost Price", key: "costPrice" },
                    { header: "Selling Price", key: "sellingPrice" },
                    { header: "Status", key: "status" },
                  ],
                  inventory.map((r) => ({
                    ...r,
                    status: getStockStatusLabel(r.status),
                  })),
                  "inventory-report"
                )
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
          </div>
          <ReportTable
            headers={["Name", "SKU", "Category", "Qty", "Cost", "Price", "Status"]}
            rows={inventory.map((r) => [
              r.name,
              r.sku,
              r.category,
              r.quantity,
              formatCurrency(r.costPrice),
              formatCurrency(r.sellingPrice),
              getStockStatusLabel(r.status),
            ])}
            emptyMessage="No inventory data"
          />
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExport(
                  "pdf",
                  "Low Stock Report",
                  [
                    { header: "Name", key: "name" },
                    { header: "SKU", key: "sku" },
                    { header: "Qty", key: "quantity" },
                    { header: "Threshold", key: "threshold" },
                  ],
                  lowStock,
                  "low-stock-report"
                )
              }
            >
              <FileDown className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>
          <ReportTable
            headers={["Name", "SKU", "Category", "Qty", "Threshold", "Price"]}
            rows={lowStock.map((r) => [
              r.name,
              r.sku,
              r.category,
              r.quantity,
              r.threshold ?? "—",
              formatCurrency(r.sellingPrice),
            ])}
            emptyMessage="No low stock items — all good!"
          />
        </TabsContent>

        <TabsContent value="out-of-stock" className="space-y-4">
          <ReportTable
            headers={["Name", "SKU", "Category", "Price", "Last Updated"]}
            rows={outOfStock.map((r) => [
              r.name,
              r.sku,
              r.category,
              formatCurrency(r.sellingPrice),
              formatDateOnly(r.lastUpdated ?? 0),
            ])}
            emptyMessage="No out-of-stock items"
          />
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["daily", "weekly", "monthly", "custom"] as const).map((p) => (
              <Button
                key={p}
                variant={salesPeriod === p ? "default" : "outline"}
                size="sm"
                onClick={() => setSalesPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
            {salesPeriod === "custom" && (
              <>
                <Input type="date" className="w-40" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input type="date" className="w-40" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </>
            )}
          </div>
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-4">
              <div>
                <p className="text-sm text-slate-500">Transactions</p>
                <p className="text-xl font-bold">{salesReport.summary.totalSales}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Units Sold</p>
                <p className="text-xl font-bold">{salesReport.summary.totalUnits}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Revenue</p>
                <p className="text-xl font-bold">
                  {formatCurrency(salesReport.summary.totalRevenue)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Avg. Order Value</p>
                <p className="text-xl font-bold">
                  {formatCurrency(salesReport.summary.averageOrderValue)}
                </p>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExport(
                  "excel",
                  "Sales Report",
                  [
                    { header: "Invoice", key: "invoiceNumber" },
                    { header: "Machine", key: "machineName" },
                    { header: "Qty", key: "quantity" },
                    { header: "Total", key: "totalAmount" },
                    { header: "Salesperson", key: "salesperson" },
                  ],
                  salesReport.sales.map((s) => ({
                    invoiceNumber: s.invoiceNumber,
                    machineName: s.machineName,
                    quantity: s.quantity,
                    totalAmount: formatCurrency(s.totalAmount),
                    salesperson: s.salesperson,
                  })),
                  "sales-report"
                )
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
            </Button>
          </div>
          <ReportTable
            headers={["Invoice", "Machine", "Qty", "Total", "Salesperson", "Date"]}
            rows={salesReport.sales.map((s) => [
              s.invoiceNumber,
              s.machineName,
              s.quantity,
              formatCurrency(s.totalAmount),
              s.salesperson,
              formatDateOnly(s.saleDate),
            ])}
            emptyMessage="No sales for selected period"
          />
        </TabsContent>

        <TabsContent value="best-selling" className="space-y-4">
          <ReportTable
            headers={["Machine", "Units Sold", "Revenue", "Transactions"]}
            rows={bestSelling.map((r) => [
              r.machineName,
              r.totalQuantity,
              formatCurrency(r.totalRevenue),
              r.transactions,
            ])}
            emptyMessage="No sales data yet"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: (string | number)[][];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        description="Data will appear here once available."
        icon={<FileBarChart className="h-8 w-8" />}
      />
    );
  }

  return (
    <div className="rounded-xl border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {row.map((cell, j) => (
                <TableCell key={j}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
