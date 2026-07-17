import type { StockStatus } from "@/types";

export function getStockStatusLabel(status: StockStatus): string {
  switch (status) {
    case "available":
      return "Available";
    case "low_stock":
      return "Low Stock";
    case "out_of_stock":
      return "Out of Stock";
  }
}

export function getStockStatusColor(status: StockStatus): string {
  switch (status) {
    case "available":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "low_stock":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "out_of_stock":
      return "bg-red-100 text-red-800 border-red-200";
  }
}

export function getNotificationIcon(type: string): string {
  switch (type) {
    case "sale":
      return "ShoppingCart";
    case "restock":
      return "Truck";
    case "low_stock":
      return "AlertTriangle";
    case "out_of_stock":
      return "PackageX";
    case "machine":
      return "Package";
    case "category":
      return "Tags";
    case "settings":
      return "Settings";
    default:
      return "Bell";
  }
}
