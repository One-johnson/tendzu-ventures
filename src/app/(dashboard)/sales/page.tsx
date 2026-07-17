"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { ColumnDef } from "@tanstack/react-table";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Category, MachineWithMeta, SaleRecord } from "@/types";
import { useAuth, useSessionToken } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { SalesTrendChart } from "@/components/charts/sales-trend-chart";
import { SaleDetailSheet } from "@/components/sales/sale-detail-sheet";
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
import { getSaleProfit } from "@/lib/sales";
import { useDeepLinkParam } from "@/hooks/use-deep-link-param";
import { useRowHighlight } from "@/hooks/use-row-highlight";
import { useStickyQueryResult } from "@/hooks/use-sticky-query-result";
import { DollarSign, History, Loader2, Plus, ShoppingCart, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function SalesPage() {
  const searchParams = useSearchParams();
  const token = useSessionToken();
  const { user } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("all");
  const [machineId, setMachineId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [salesperson, setSalesperson] = useState(user?.name ?? "");
  const [saleDate, setSaleDate] = useState(toInputDate(Date.now()));
  const [saving, setSaving] = useState(false);

  const [chartPeriod, setChartPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [historyPeriod, setHistoryPeriod] = useState<
    "all" | "daily" | "weekly" | "monthly" | "custom"
  >("all");
  const [historySearch, setHistorySearch] = useState("");
  const [startDate, setStartDate] = useState(toInputDate(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(toInputDate(Date.now()));
  const [detailSale, setDetailSale] = useState<SaleRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { targetId: saleTargetId, consumeParam: consumeSaleParam } = useDeepLinkParam("sale");
  const { highlightRowId, setHighlightRowId } = useRowHighlight();
  const deepLinkHandledRef = useRef<string | null>(null);

  const machines = useQuery(api.machines.list, token ? { token } : "skip") as
    | MachineWithMeta[]
    | undefined;
  const categories = useQuery(api.categories.list, token ? { token } : "skip") as
    | Category[]
    | undefined;
  const overviewStats = useQuery(api.sales.overviewStats, token ? { token } : "skip") as
    | {
        today: { revenue: number; profit: number; units: number; transactions: number };
        weekly: { revenue: number; profit: number; units: number; transactions: number };
        monthly: { revenue: number; profit: number; units: number; transactions: number };
      }
    | undefined;
  const chartData = useQuery(
    api.sales.chartData,
    token ? { token, period: chartPeriod } : "skip"
  ) as { label: string; revenue: number; profit: number; units: number }[] | undefined;
  const sales = useQuery(
    api.sales.list,
    token
      ? {
          token,
          search: historySearch || undefined,
          period: historyPeriod === "all" ? undefined : historyPeriod,
          startDate: historyPeriod === "custom" ? fromInputDate(startDate) : undefined,
          endDate: historyPeriod === "custom" ? fromInputDate(endDate) : undefined,
          limit: 200,
        }
      : "skip"
  ) as SaleRecord[] | undefined;

  const deepLinkSale = useQuery(
    api.sales.getById,
    token && saleTargetId ? { token, id: saleTargetId as Id<"sales"> } : "skip"
  ) as SaleRecord | null | undefined;

  const createSale = useMutation(api.sales.create);

  const {
    data: displayChartData,
    isRefreshing: chartRefreshing,
    isInitialLoading: chartInitialLoading,
  } = useStickyQueryResult(chartData);
  const {
    data: displaySales,
    isRefreshing: salesRefreshing,
    isInitialLoading: salesInitialLoading,
  } = useStickyQueryResult(sales);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !saleTargetId) setHistorySearch(q);
  }, [searchParams, saleTargetId]);

  useEffect(() => {
    if (!saleTargetId) return;
    if (deepLinkSale === undefined) return;
    if (deepLinkHandledRef.current === saleTargetId) return;

    deepLinkHandledRef.current = saleTargetId;

    if (!deepLinkSale) {
      toast.error("Sale not found");
      consumeSaleParam();
      return;
    }

    setHistoryPeriod("all");
    setHistorySearch(deepLinkSale.invoiceNumber);
    setDetailSale(deepLinkSale);
    setDetailOpen(true);
    setHighlightRowId(saleTargetId);
    consumeSaleParam();
  }, [saleTargetId, deepLinkSale, consumeSaleParam, setHighlightRowId]);

  const availableMachines = useMemo(
    () => machines?.filter((m) => m.isActive && m.quantity > 0) ?? [],
    [machines]
  );

  const filteredMachines = useMemo(() => {
    if (categoryId === "all") return availableMachines;
    return availableMachines.filter((machine) => machine.categoryId === categoryId);
  }, [availableMachines, categoryId]);

  const machineOptions = useMemo(
    () =>
      filteredMachines.map((machine) => ({
        value: machine._id,
        label: `${machine.name} — ${formatCurrency(machine.sellingPrice)} (${machine.quantity} available)`,
        keywords: [machine.name, machine.partNumber, machine.sku, machine.customId, machine.category?.name]
          .filter(Boolean)
          .join(" "),
      })),
    [filteredMachines]
  );

  const selectedMachine = machines?.find((m) => m._id === machineId);
  const quantityNum = Number(quantity || 0);
  const totalAmount = selectedMachine ? selectedMachine.sellingPrice * quantityNum : 0;
  const unitProfit = selectedMachine
    ? selectedMachine.sellingPrice - selectedMachine.costPrice
    : 0;
  const totalProfit = unitProfit * quantityNum;
  const exceedsStock = selectedMachine && quantityNum > selectedMachine.quantity;

  const resetForm = () => {
    setCategoryId("all");
    setMachineId("");
    setQuantity("1");
    setSalesperson(user?.name ?? "");
    setSaleDate(toInputDate(Date.now()));
  };

  const handleCategoryChange = (value: string) => {
    setCategoryId(value);
    if (!machineId) return;
    const machine = machines?.find((m) => m._id === machineId);
    if (machine && value !== "all" && machine.categoryId !== value) {
      setMachineId("");
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  const columns = useMemo<ColumnDef<SaleRecord>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice" />,
        cell: ({ row }) => (
          <button
            type="button"
            className="font-mono text-xs font-medium text-primary hover:underline"
            onClick={() => {
              setDetailSale(row.original);
              setDetailOpen(true);
            }}
          >
            {row.original.invoiceNumber}
          </button>
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Revenue" />,
        cell: ({ row }) => (
          <span className="font-semibold">{formatCurrency(row.original.totalAmount)}</span>
        ),
      },
      {
        id: "profit",
        accessorFn: (row) => getSaleProfit(row),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Profit" />,
        cell: ({ row }) => (
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {formatCurrency(getSaleProfit(row.original))}
          </span>
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

  const handleSubmit = async () => {
    if (!token || !machineId || !quantity || !salesperson) return;
    if (exceedsStock) {
      toast.error("Quantity exceeds available stock");
      return;
    }
    setSaving(true);
    try {
      const result = await createSale({
        token,
        machineId: machineId as Id<"machines">,
        quantity: Number(quantity),
        salesperson,
        saleDate: fromInputDate(saleDate),
      });
      setDialogOpen(false);
      resetForm();
      if (selectedMachine) {
        setDetailSale({
          _id: result.saleId,
          invoiceNumber: result.invoiceNumber,
          machineId,
          machineName: selectedMachine.name,
          quantity: quantityNum,
          unitPrice: selectedMachine.sellingPrice,
          unitCostPrice: selectedMachine.costPrice,
          totalAmount: result.totalAmount,
          totalProfit: result.totalProfit,
          salesperson,
          saleDate: fromInputDate(saleDate),
          createdAt: Date.now(),
        });
        setDetailOpen(true);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sale failed");
    } finally {
      setSaving(false);
    }
  };

  if (!machines || !categories || !overviewStats) {
    return <PageLoader />;
  }

  const totalRevenue = (displaySales ?? []).reduce((sum, s) => sum + s.totalAmount, 0);
  const totalProfitSum = (displaySales ?? []).reduce((sum, s) => sum + getSaleProfit(s), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <FadeIn>
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          data-tour="sales-form"
        >
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">Sales Management</h2>
            <p className="text-sm text-muted-foreground">
              Record sales, track revenue and profit, and review transaction history
            </p>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="w-full touch-manipulation sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Record Sale
          </Button>
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(overviewStats.today.revenue)}
          description={`${overviewStats.today.transactions} transactions · ${overviewStats.today.units} units`}
          icon={DollarSign}
          variant="default"
          index={0}
        />
        <StatCard
          title="Today's Profit"
          value={formatCurrency(overviewStats.today.profit)}
          description="Selling price minus cost price"
          icon={TrendingUp}
          variant="success"
          index={1}
        />
        <StatCard
          title="This Week"
          value={formatCurrency(overviewStats.weekly.revenue)}
          description={`Profit: ${formatCurrency(overviewStats.weekly.profit)}`}
          icon={ShoppingCart}
          variant="default"
          index={2}
        />
        <StatCard
          title="This Month"
          value={formatCurrency(overviewStats.monthly.revenue)}
          description={`Profit: ${formatCurrency(overviewStats.monthly.profit)}`}
          icon={DollarSign}
          variant="success"
          index={3}
        />
      </div>

      <SalesTrendChart
        data={displayChartData ?? []}
        period={chartPeriod}
        onPeriodChange={setChartPeriod}
        isLoading={chartInitialLoading || chartRefreshing}
      />

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Sales History</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {(displaySales ?? []).length} transactions · {formatCurrency(totalRevenue)} revenue ·{" "}
                {formatCurrency(totalProfitSum)} profit
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="touch-manipulation">
              <Link href="/reports">View reports</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row">
            <Select
              value={historyPeriod}
              onValueChange={(v) => setHistoryPeriod(v as typeof historyPeriod)}
            >
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
            {historyPeriod === "custom" && (
              <>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  className="h-10 w-full touch-manipulation lg:w-48"
                />
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  className="h-10 w-full touch-manipulation lg:w-48"
                />
              </>
            )}
          </div>

          {salesInitialLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
            </div>
          ) : displaySales && displaySales.length === 0 ? (
            <EmptyState
              title="No sales found"
              description="Record your first sale to begin tracking revenue and profit."
              icon={<History className="h-8 w-8" />}
            />
          ) : displaySales ? (
            <div className="relative" data-tour="sales-history-table">
              {salesRefreshing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60">
                  <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
                </div>
              )}
              <DataTable
                columns={columns}
                data={displaySales}
                searchPlaceholder="Search invoice, machine, salesperson..."
                pageSize={10}
                emptyMessage="No sales found"
                getRowId={(row) => row._id}
                highlightRowId={highlightRowId}
                mobileCard={(row) => (
                  <MobileCard
                    onClick={() => {
                      setDetailSale(row.original);
                      setDetailOpen(true);
                    }}
                  >
                    <MobileCardField label="Invoice" value={row.original.invoiceNumber} />
                    <MobileCardField label="Machine" value={row.original.machineName} />
                    <MobileCardField label="Revenue" value={formatCurrency(row.original.totalAmount)} />
                    <MobileCardField
                      label="Profit"
                      value={formatCurrency(getSaleProfit(row.original))}
                    />
                    <MobileCardField label="Date" value={getCellValue(row, "saleDate")} />
                  </MobileCard>
                )}
                toolbarChildren={
                  <Input
                    placeholder="Server search..."
                    className="hidden h-10 w-full touch-manipulation sm:max-w-[180px] lg:block"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                }
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record New Sale</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Category *</Label>
              <Select value={categoryId} onValueChange={handleCategoryChange}>
                <SelectTrigger className="h-10 touch-manipulation">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Select Machine *</Label>
              <Combobox
                options={machineOptions}
                value={machineId}
                onValueChange={setMachineId}
                placeholder={
                  filteredMachines.length === 0
                    ? "No machines available in this category"
                    : "Search and choose a machine"
                }
                searchPlaceholder="Search by name, part number..."
                emptyText="No machines match your search."
                disabled={filteredMachines.length === 0}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  className="h-10 touch-manipulation"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                {exceedsStock && (
                  <p className="text-xs text-red-500">
                    Exceeds available stock ({selectedMachine?.quantity})
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Sale Date *</Label>
                <DatePicker value={saleDate} onChange={setSaleDate} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Salesperson *</Label>
              <Input
                className="h-10 touch-manipulation"
                value={salesperson}
                onChange={(e) => setSalesperson(e.target.value)}
              />
            </div>
            {selectedMachine && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <div className="flex justify-between">
                  <span>Unit price</span>
                  <span>{formatCurrency(selectedMachine.sellingPrice)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Unit cost</span>
                  <span>{formatCurrency(selectedMachine.costPrice)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Unit profit</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(unitProfit)}
                  </span>
                </div>
                {quantityNum > 0 && (
                  <>
                    <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
                      <span>Total revenue</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="mt-1 flex justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                      <span>Total profit</span>
                      <span>{formatCurrency(totalProfit)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              className="w-full touch-manipulation sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                saving ||
                !machineId ||
                !quantity ||
                !salesperson ||
                quantityNum <= 0 ||
                exceedsStock
              }
              className="w-full touch-manipulation sm:w-auto"
            >
              {saving ? "Processing..." : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SaleDetailSheet sale={detailSale} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
