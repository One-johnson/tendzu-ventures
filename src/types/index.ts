export type StockStatus = "available" | "low_stock" | "out_of_stock";

export type UserRole = "admin";

export interface SessionUser {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  showCredentialPrompt?: boolean;
}

export interface SaleRecord {
  _id: string;
  invoiceNumber: string;
  machineId: string;
  machineName: string;
  quantity: number;
  unitPrice: number;
  unitCostPrice?: number;
  totalAmount: number;
  totalProfit?: number;
  salesperson: string;
  saleDate: number;
  createdAt: number;
}

export interface RestockingRecord {
  _id: string;
  machineId: string;
  machineName: string;
  quantityAdded: number;
  previousQuantity: number;
  newQuantity: number;
  notes?: string;
  createdAt: number;
}

export interface TopSellingRecord {
  machineId: string;
  machineName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface MachineStats {
  totalMachines: number;
  totalCategories: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

export interface RevenueStats {
  todaySales: number;
  todayRevenue: number;
  todayProfit: number;
  weeklySales: number;
  weeklyRevenue: number;
  weeklyProfit: number;
  monthlySales: number;
  monthlyRevenue: number;
  monthlyProfit: number;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: number;
  machineCount?: number;
}

export interface NotificationRecord {
  _id: string;
  type: "sale" | "restock" | "low_stock" | "out_of_stock";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: number;
}

export interface MachineWithMeta {
  _id: string;
  customId?: string;
  name: string;
  categoryId: string;
  description?: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  lowStockThreshold: number;
  brand?: string;
  model?: string;
  year?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  stockStatus: StockStatus;
  category: { _id: string; name: string; slug: string } | null;
}
