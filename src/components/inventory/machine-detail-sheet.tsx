"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSessionToken } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency, formatDate } from "@/lib/format";
import { getStockStatusLabel } from "@/lib/stock";
import { searchRoutes } from "@/lib/search-routes";
import type { MachineWithMeta, RestockingRecord, SaleRecord } from "@/types";
import { ExternalLink, Pencil, ShoppingCart, Truck } from "lucide-react";

interface MachineDetailSheetProps {
  machine: MachineWithMeta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (machine: MachineWithMeta) => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function MachineDetailSheet({
  machine,
  open,
  onOpenChange,
  onEdit,
}: MachineDetailSheetProps) {
  const token = useSessionToken();

  const recentSales = useQuery(
    api.sales.getByMachine,
    token && machine ? { token, machineId: machine._id as Id<"machines">, limit: 5 } : "skip"
  ) as SaleRecord[] | undefined;

  const recentRestocking = useQuery(
    api.restocking.getByMachine,
    token && machine ? { token, machineId: machine._id as Id<"machines"> } : "skip"
  ) as RestockingRecord[] | undefined;

  if (!machine) return null;

  const unitProfit = machine.sellingPrice - machine.costPrice;
  const sales = recentSales ?? [];
  const restocks = (recentRestocking ?? []).slice(0, 5);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:w-[75vw] sm:max-w-[75vw]"
      >
        <div className="shrink-0 border-b border-border px-4 py-5 pr-14 sm:px-6">
          <SheetHeader className="space-y-1.5 p-0">
            <SheetTitle className="text-left">{machine.name}</SheetTitle>
            <SheetDescription className="text-left">
              {machine.category?.name ?? "Uncategorized"}
              {machine.partNumber ? ` · ${machine.partNumber}` : ""}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="rounded-lg border border-border bg-muted/30 px-4">
            <DetailRow
              label="Part Number"
              value={<span className="font-mono">{machine.partNumber ?? "—"}</span>}
            />
            <DetailRow label="Category" value={machine.category?.name ?? "—"} />
            <DetailRow label="Stock" value={`${machine.quantity} units`} />
            <DetailRow
              label="Status"
              value={<Badge variant="secondary">{getStockStatusLabel(machine.stockStatus)}</Badge>}
            />
            <DetailRow label="Cost price" value={formatCurrency(machine.costPrice)} />
            <DetailRow label="Selling price" value={formatCurrency(machine.sellingPrice)} />
            <DetailRow
              label="Unit profit"
              value={
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(unitProfit)}
                </span>
              }
            />
            {machine.brand && <DetailRow label="Brand" value={machine.brand} />}
            {machine.model && <DetailRow label="Model" value={machine.model} />}
            {machine.year && <DetailRow label="Year" value={machine.year} />}
            {machine.description && <DetailRow label="Description" value={machine.description} />}
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <ShoppingCart className="h-4 w-4" />
                Recent sales
              </h3>
              {sales.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {sales.map((sale) => (
                    <li
                      key={sale._id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="font-mono text-xs">{sale.invoiceNumber}</span>
                      <span>{formatCurrency(sale.totalAmount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4" />
                Recent restocking
              </h3>
              {restocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No restocking records yet.</p>
              ) : (
                <ul className="space-y-2">
                  {restocks.map((entry) => (
                    <li
                      key={entry._id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span>+{entry.quantityAdded} units</span>
                      <span className="text-muted-foreground">{formatDate(entry.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {machine.category && (
            <Button variant="link" className="mt-2 h-auto p-0 text-muted-foreground" asChild>
              <Link href={searchRoutes.categoryMachines(machine.category._id)}>
                View category in inventory
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-card px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {onEdit && (
              <Button
                onClick={() => {
                  onEdit(machine);
                  onOpenChange(false);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit machine
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
