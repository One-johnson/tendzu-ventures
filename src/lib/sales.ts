import type { SaleRecord } from "@/types";

export function getSaleProfit(sale: SaleRecord): number {
  if (sale.totalProfit !== undefined) return sale.totalProfit;
  if (sale.unitCostPrice !== undefined) {
    return (sale.unitPrice - sale.unitCostPrice) * sale.quantity;
  }
  return 0;
}
