export type StockStatus = "available" | "low_stock" | "out_of_stock";

export function getStockStatus(
  quantity: number,
  lowStockThreshold: number
): StockStatus {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= lowStockThreshold) return "low_stock";
  return "available";
}

export function formatStockStatus(status: StockStatus): string {
  switch (status) {
    case "available":
      return "Available";
    case "low_stock":
      return "Low Stock";
    case "out_of_stock":
      return "Out of Stock";
  }
}
