"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { exportInvoicePDF } from "@/lib/export";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { getSaleProfit } from "@/lib/sales";
import { searchRoutes } from "@/lib/search-routes";
import type { SaleRecord } from "@/types";
import { ExternalLink, FileDown, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

interface SaleDetailSheetProps {
  sale: SaleRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function SaleDetailSheet({ sale, open, onOpenChange }: SaleDetailSheetProps) {
  const [downloading, setDownloading] = useState(false);

  if (!sale) return null;

  const profit = getSaleProfit(sale);

  const handleDownloadInvoice = async () => {
    setDownloading(true);
    try {
      await exportInvoicePDF(sale);
      toast.success("Invoice downloaded");
    } catch {
      toast.error("Failed to generate invoice PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:w-[75vw] sm:max-w-[75vw]"
      >
        <div className="shrink-0 border-b border-border px-4 py-5 pr-14 sm:px-6">
          <SheetHeader className="space-y-1.5 p-0">
            <SheetTitle className="text-left">{sale.invoiceNumber}</SheetTitle>
            <SheetDescription className="text-left">Sale transaction details</SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="rounded-lg border border-border bg-muted/30 px-4">
            <DetailRow label="Invoice" value={<span className="font-mono">{sale.invoiceNumber}</span>} />
            <DetailRow label="Machine" value={sale.machineName} />
            <DetailRow label="Quantity" value={sale.quantity} />
            <DetailRow label="Unit price" value={formatCurrency(sale.unitPrice)} />
            <DetailRow
              label="Total"
              value={<span className="text-base font-semibold">{formatCurrency(sale.totalAmount)}</span>}
            />
            <DetailRow
              label="Profit"
              value={
                <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(profit)}
                </span>
              }
            />
            <DetailRow label="Salesperson" value={sale.salesperson} />
            <DetailRow label="Sale date" value={formatDateOnly(sale.saleDate)} />
            <DetailRow label="Recorded" value={formatDateOnly(sale.createdAt)} />
          </div>

          <Button variant="link" className="mt-2 h-auto p-0 text-muted-foreground" asChild>
            <Link href={searchRoutes.machine(sale.machineId)}>
              Open machine in inventory
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="shrink-0 border-t border-border bg-card px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={handleDownloadInvoice} disabled={downloading}>
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              Download invoice
            </Button>
            <Button asChild>
              <Link href={searchRoutes.machine(sale.machineId)}>
                <Package className="mr-2 h-4 w-4" />
                View machine
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
