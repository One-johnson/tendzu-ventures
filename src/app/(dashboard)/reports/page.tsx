"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useSessionToken } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { getSaleProfit } from "@/lib/sales";
import type { SaleRecord, StockStatus } from "@/types";
import { FileDown, FileSpreadsheet, FileBarChart, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RevenueComparisonChart } from "@/components/charts/dashboard-charts";
import { FadeIn } from "@/components/motion/page-wrapper";
import { useStickyQueryResult } from "@/hooks/use-sticky-query-result";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface ExportColumn {
  header: string;
  key: string;
}

interface ExportAction {
  label: string;
  type: "pdf" | "excel";
  title: string;
  columns: ExportColumn[];
  rows: Array<object>;
  filename: string;
}

interface InventoryReportRow {
  partNumber: string;
  name: string;
  category: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  stockValue: number;
  retailValue: number;
  status: StockStatus;
}

interface StockAlertRow {
  partNumber: string;
  name: string;
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
  daily: { revenue: number; profit: number; units: number; transactions: number };
  weekly: { revenue: number; profit: number; units: number; transactions: number };
  monthly: { revenue: number; profit: number; units: number; transactions: number };
  allTime: { revenue: number; profit: number; units: number; transactions: number };
}

export default function ReportsPage() {
  const token = useSessionToken();
  const [salesPeriod, setSalesPeriod] = useState<"daily" | "weekly" | "monthly" | "custom">("monthly");
  const [activeTab, setActiveTab] = useState("inventory");
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
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
          totalProfit: number;
          averageOrderValue: number;
        };
      }
    | undefined;
  const revenueSummary = useQuery(api.reports.revenueSummary, token ? { token } : "skip") as RevenueSummary | undefined;
  const bestSelling = useQuery(api.reports.bestSellingReport, token ? { token, limit: 10 } : "skip") as BestSellingRow[] | undefined;

  const chartData = useQuery(api.dashboard.getChartData, token ? { token } : "skip") as
    | { revenueComparison: { period: string; revenue: number; profit?: number }[] }
    | undefined;

  const {
    data: displaySalesReport,
    isRefreshing: salesReportRefreshing,
    isInitialLoading: salesReportInitialLoading,
  } = useStickyQueryResult(salesReport);

  if (!inventory || !lowStock || !outOfStock || !revenueSummary || !bestSelling || !chartData) {
    return <PageLoader />;
  }

  const handleExport = async (
    type: "pdf" | "excel",
    title: string,
    columns: { header: string; key: string }[],
    rows: Array<object>,
    filename: string
  ) => {
    try {
      if (type === "pdf") {
        await exportToPDF(title, columns, rows, filename);
      } else {
        exportToExcel(title, columns, rows, filename);
      }
      toast.success(`${type === "pdf" ? "PDF" : "Excel"} export downloaded`);
      setExportSheetOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  const exportActionsForTab = (): ExportAction[] => {
    switch (activeTab) {
      case "inventory":
        return [
          {
            label: "Export Excel",
            type: "excel",
            title: "Inventory",
            columns: [
              { header: "Part Number", key: "partNumber" },
              { header: "Name", key: "name" },
              { header: "Category", key: "category" },
              { header: "Quantity", key: "quantity" },
              { header: "Cost Price", key: "costPrice" },
              { header: "Selling Price", key: "sellingPrice" },
              { header: "Status", key: "status" },
            ],
            rows: inventory.map((r) => ({
              ...r,
              status: getStockStatusLabel(r.status),
            })),
            filename: "inventory-report",
          },
        ];
      case "low-stock":
        return [];
      case "out-of-stock":
        return [
          {
            label: "Export PDF",
            type: "pdf",
            title: "Out of Stock Report",
            columns: [
              { header: "Part Number", key: "partNumber" },
              { header: "Name", key: "name" },
              { header: "Category", key: "category" },
              { header: "Price", key: "sellingPrice" },
            ],
            rows: outOfStock.map((r) => ({
              ...r,
              sellingPrice: formatCurrency(r.sellingPrice),
            })),
            filename: "out-of-stock-report",
          },
        ];
      case "sales":
        if (!displaySalesReport) return [];
        return [
          {
            label: "Export Excel",
            type: "excel",
            title: "Sales Report",
            columns: [
              { header: "Invoice", key: "invoiceNumber" },
              { header: "Machine", key: "machineName" },
              { header: "Qty", key: "quantity" },
              { header: "Total", key: "totalAmount" },
              { header: "Profit", key: "profit" },
              { header: "Salesperson", key: "salesperson" },
            ],
            rows: displaySalesReport.sales.map((s) => ({
              invoiceNumber: s.invoiceNumber,
              machineName: s.machineName,
              quantity: s.quantity,
              totalAmount: formatCurrency(s.totalAmount),
              profit: formatCurrency(getSaleProfit(s)),
              salesperson: s.salesperson,
            })),
            filename: "sales-report",
          },
          {
            label: "Export PDF",
            type: "pdf",
            title: "Sales Report",
            columns: [
              { header: "Invoice", key: "invoiceNumber" },
              { header: "Machine", key: "machineName" },
              { header: "Qty", key: "quantity" },
              { header: "Total", key: "totalAmount" },
              { header: "Profit", key: "profit" },
              { header: "Salesperson", key: "salesperson" },
            ],
            rows: displaySalesReport.sales.map((s) => ({
              invoiceNumber: s.invoiceNumber,
              machineName: s.machineName,
              quantity: s.quantity,
              totalAmount: formatCurrency(s.totalAmount),
              profit: formatCurrency(getSaleProfit(s)),
              salesperson: s.salesperson,
            })),
            filename: "sales-report",
          },
        ];
      case "best-selling":
        return [
          {
            label: "Export PDF",
            type: "pdf",
            title: "Best Selling Report",
            columns: [
              { header: "Machine", key: "machineName" },
              { header: "Units Sold", key: "totalQuantity" },
              { header: "Revenue", key: "totalRevenue" },
              { header: "Transactions", key: "transactions" },
            ],
            rows: bestSelling.map((r) => ({
              ...r,
              totalRevenue: formatCurrency(r.totalRevenue),
            })),
            filename: "best-selling-report",
          },
        ];
      default:
        return [];
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

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4" data-tour="reports-summary">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold sm:text-2xl">{formatCurrency(revenueSummary.daily.revenue)}</p>
            <p className="text-xs text-muted-foreground">
              {revenueSummary.daily.transactions} transactions · Profit:{" "}
              {formatCurrency(revenueSummary.daily.profit)}
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
              {revenueSummary.weekly.transactions} transactions · Profit:{" "}
              {formatCurrency(revenueSummary.weekly.profit)}
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
              {revenueSummary.monthly.transactions} transactions · Profit:{" "}
              {formatCurrency(revenueSummary.monthly.profit)}
            </p>
          </CardContent>
        </Card>
      </div>

      <RevenueComparisonChart data={chartData.revenueComparison} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="flex h-auto flex-wrap gap-1">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
            <TabsTrigger value="out-of-stock">Out of Stock</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="best-selling">Best Selling</TabsTrigger>
          </TabsList>

          <Button
            variant="outline"
            size="sm"
            className="w-full touch-manipulation sm:hidden"
            data-tour="reports-export"
            onClick={() => setExportSheetOpen(true)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        <TabsContent value="inventory" className="space-y-4">
          <div className="hidden gap-2 sm:flex" data-tour="reports-export">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExport(
                  "excel",
                  "Inventory",
                  [
                    { header: "Part Number", key: "partNumber" },
                    { header: "Name", key: "name" },
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
            headers={["Part Number", "Name", "Category", "Qty", "Cost", "Price", "Status"]}
            rows={inventory.map((r) => [
              r.partNumber,
              r.name,
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
          <ReportTable
            headers={["Part Number", "Name", "Category", "Qty", "Threshold", "Price"]}
            rows={lowStock.map((r) => [
              r.partNumber,
              r.name,
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
            headers={["Part Number", "Name", "Category", "Price", "Last Updated"]}
            rows={outOfStock.map((r) => [
              r.partNumber,
              r.name,
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
                <DatePicker value={startDate} onChange={setStartDate} className="w-48" />
                <DatePicker value={endDate} onChange={setEndDate} className="w-48" />
              </>
            )}
          </div>

          {salesReportInitialLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
            </div>
          ) : displaySalesReport ? (
            <div className="relative space-y-4">
              {salesReportRefreshing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60">
                  <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
                </div>
              )}
              <Card>
                <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <p className="text-sm text-muted-foreground">Transactions</p>
                    <p className="text-xl font-bold">{displaySalesReport.summary.totalSales}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Units Sold</p>
                    <p className="text-xl font-bold">{displaySalesReport.summary.totalUnits}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(displaySalesReport.summary.totalRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Profit</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(displaySalesReport.summary.totalProfit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Order Value</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(displaySalesReport.summary.averageOrderValue)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <div className="hidden gap-2 sm:flex">
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
                        { header: "Profit", key: "profit" },
                        { header: "Salesperson", key: "salesperson" },
                      ],
                      displaySalesReport.sales.map((s) => ({
                        invoiceNumber: s.invoiceNumber,
                        machineName: s.machineName,
                        quantity: s.quantity,
                        totalAmount: formatCurrency(s.totalAmount),
                        profit: formatCurrency(getSaleProfit(s)),
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
                headers={["Invoice", "Machine", "Qty", "Total", "Profit", "Salesperson", "Date"]}
                rows={displaySalesReport.sales.map((s) => [
                  s.invoiceNumber,
                  s.machineName,
                  s.quantity,
                  formatCurrency(s.totalAmount),
                  formatCurrency(getSaleProfit(s)),
                  s.salesperson,
                  formatDateOnly(s.saleDate),
                ])}
                emptyMessage="No sales for selected period"
              />
            </div>
          ) : null}
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

      <Sheet open={exportSheetOpen} onOpenChange={setExportSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Export Report</SheetTitle>
            <SheetDescription>
              Download the current report tab as PDF or Excel on your device.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 py-2">
            {exportActionsForTab().length === 0 ? (
              <p className="text-sm text-muted-foreground">No export options for this tab.</p>
            ) : (
              exportActionsForTab().map((action) => (
                <Button
                  key={`${action.type}-${action.label}`}
                  variant="outline"
                  className="h-11 w-full justify-start touch-manipulation"
                  onClick={() =>
                    handleExport(
                      action.type,
                      action.title,
                      action.columns,
                      action.rows,
                      action.filename
                    )
                  }
                >
                  {action.type === "pdf" ? (
                    <FileDown className="mr-2 h-4 w-4" />
                  ) : (
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                  )}
                  {action.label}
                </Button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
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
