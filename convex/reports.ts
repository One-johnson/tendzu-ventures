import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { getStockStatus } from "./lib/stock";

function getSaleProfit(sale: {
  quantity: number;
  unitPrice: number;
  unitCostPrice?: number;
  totalProfit?: number;
}): number {
  if (sale.totalProfit !== undefined) return sale.totalProfit;
  if (sale.unitCostPrice !== undefined) {
    return (sale.unitPrice - sale.unitCostPrice) * sale.quantity;
  }
  return 0;
}

function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek(timestamp: number): number {
  const d = new Date(timestamp);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfMonth(timestamp: number): number {
  const d = new Date(timestamp);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const inventoryReport = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const machines = await ctx.db.query("machines").collect();
    const categories = await ctx.db.query("categories").collect();
    const categoryMap = new Map(categories.map((c) => [c._id, c.name]));

    return machines.map((m) => ({
      customId: m.customId ?? "—",
      name: m.name,
      sku: m.sku,
      category: categoryMap.get(m.categoryId) ?? "Unknown",
      quantity: m.quantity,
      costPrice: m.costPrice,
      sellingPrice: m.sellingPrice,
      stockValue: m.quantity * m.costPrice,
      retailValue: m.quantity * m.sellingPrice,
      status: getStockStatus(m.quantity, m.lowStockThreshold),
    }));
  },
});

export const lowStockReport = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const machines = await ctx.db.query("machines").collect();
    const categories = await ctx.db.query("categories").collect();
    const categoryMap = new Map(categories.map((c) => [c._id, c.name]));

    return machines
      .filter((m) => getStockStatus(m.quantity, m.lowStockThreshold) === "low_stock")
      .map((m) => ({
        customId: m.customId ?? "—",
        name: m.name,
        sku: m.sku,
        category: categoryMap.get(m.categoryId) ?? "Unknown",
        quantity: m.quantity,
        threshold: m.lowStockThreshold,
        sellingPrice: m.sellingPrice,
      }));
  },
});

export const outOfStockReport = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const machines = await ctx.db.query("machines").collect();
    const categories = await ctx.db.query("categories").collect();
    const categoryMap = new Map(categories.map((c) => [c._id, c.name]));

    return machines
      .filter((m) => m.quantity <= 0)
      .map((m) => ({
        customId: m.customId ?? "—",
        name: m.name,
        sku: m.sku,
        category: categoryMap.get(m.categoryId) ?? "Unknown",
        sellingPrice: m.sellingPrice,
        lastUpdated: m.updatedAt,
      }));
  },
});

export const salesReport = query({
  args: {
    token: v.optional(v.string()),
    period: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("custom")
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    let sales = await ctx.db.query("sales").collect();
    const now = Date.now();

    if (args.period === "daily") {
      const start = startOfDay(now);
      sales = sales.filter((s) => s.saleDate >= start);
    } else if (args.period === "weekly") {
      const start = startOfWeek(now);
      sales = sales.filter((s) => s.saleDate >= start);
    } else if (args.period === "monthly") {
      const start = startOfMonth(now);
      sales = sales.filter((s) => s.saleDate >= start);
    } else if (args.period === "custom" && args.startDate && args.endDate) {
      sales = sales.filter(
        (s) => s.saleDate >= args.startDate! && s.saleDate <= args.endDate!
      );
    }

    const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = sales.reduce((sum, s) => sum + getSaleProfit(s), 0);
    const totalUnits = sales.reduce((sum, s) => sum + s.quantity, 0);

    return {
      sales: sales.sort((a, b) => b.saleDate - a.saleDate),
      summary: {
        totalSales: sales.length,
        totalUnits,
        totalRevenue,
        totalProfit,
        averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
      },
    };
  },
});

export const revenueSummary = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const sales = await ctx.db.query("sales").collect();
    const now = Date.now();

    const periods = {
      daily: startOfDay(now),
      weekly: startOfWeek(now),
      monthly: startOfMonth(now),
    };

    const summary = {
      daily: { revenue: 0, profit: 0, units: 0, transactions: 0 },
      weekly: { revenue: 0, profit: 0, units: 0, transactions: 0 },
      monthly: { revenue: 0, profit: 0, units: 0, transactions: 0 },
      allTime: { revenue: 0, profit: 0, units: 0, transactions: sales.length },
    };

    for (const sale of sales) {
      const profit = getSaleProfit(sale);
      summary.allTime.revenue += sale.totalAmount;
      summary.allTime.profit += profit;
      summary.allTime.units += sale.quantity;

      if (sale.saleDate >= periods.daily) {
        summary.daily.revenue += sale.totalAmount;
        summary.daily.profit += profit;
        summary.daily.units += sale.quantity;
        summary.daily.transactions++;
      }
      if (sale.saleDate >= periods.weekly) {
        summary.weekly.revenue += sale.totalAmount;
        summary.weekly.profit += profit;
        summary.weekly.units += sale.quantity;
        summary.weekly.transactions++;
      }
      if (sale.saleDate >= periods.monthly) {
        summary.monthly.revenue += sale.totalAmount;
        summary.monthly.profit += profit;
        summary.monthly.units += sale.quantity;
        summary.monthly.transactions++;
      }
    }

    return summary;
  },
});

export const bestSellingReport = query({
  args: {
    token: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const sales = await ctx.db.query("sales").collect();
    const limit = args.limit ?? 10;

    const map = new Map<
      string,
      { machineName: string; totalQuantity: number; totalRevenue: number; transactions: number }
    >();

    for (const sale of sales) {
      const key = sale.machineId;
      const existing = map.get(key);
      if (existing) {
        existing.totalQuantity += sale.quantity;
        existing.totalRevenue += sale.totalAmount;
        existing.transactions++;
      } else {
        map.set(key, {
          machineName: sale.machineName,
          totalQuantity: sale.quantity,
          totalRevenue: sale.totalAmount,
          transactions: 1,
        });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit);
  },
});
