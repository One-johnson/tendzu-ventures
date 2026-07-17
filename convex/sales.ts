import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canWrite, requireAuth } from "./lib/auth";
import { generateInvoiceNumber } from "./lib/invoice";
import { createNotification } from "./lib/notifications";
import { getStockStatus } from "./lib/stock";

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

type PeriodSummary = {
  revenue: number;
  profit: number;
  units: number;
  transactions: number;
};

function summarizeSales(
  sales: Array<{
    quantity: number;
    totalAmount: number;
    unitPrice: number;
    unitCostPrice?: number;
    totalProfit?: number;
  }>
): PeriodSummary {
  return sales.reduce(
    (acc, sale) => {
      acc.revenue += sale.totalAmount;
      acc.profit += getSaleProfit(sale);
      acc.units += sale.quantity;
      acc.transactions += 1;
      return acc;
    },
    { revenue: 0, profit: 0, units: 0, transactions: 0 }
  );
}

export const list = query({
  args: {
    token: v.optional(v.string()),
    search: v.optional(v.string()),
    period: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("monthly"),
        v.literal("custom"),
        v.literal("all")
      )
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);

    let sales = await ctx.db.query("sales").order("desc").collect();

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

    if (args.search?.trim()) {
      const term = args.search.trim().toLowerCase();
      sales = sales.filter(
        (s) =>
          s.invoiceNumber.toLowerCase().includes(term) ||
          s.machineName.toLowerCase().includes(term) ||
          s.salesperson.toLowerCase().includes(term)
      );
    }

    const limit = args.limit ?? 100;
    return sales.slice(0, limit);
  },
});

export const getById = query({
  args: {
    token: v.optional(v.string()),
    id: v.id("sales"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const sale = await ctx.db.get(args.id);
    if (!sale) return null;
    return sale;
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    machineId: v.id("machines"),
    quantity: v.number(),
    salesperson: v.string(),
    saleDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    if (!canWrite(user)) throw new Error("Permission denied.");

    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than zero.");
    }

    const machine = await ctx.db.get(args.machineId);
    if (!machine) throw new Error("Machine not found.");
    if (!machine.isActive) throw new Error("This machine is not available for sale.");

    if (machine.quantity < args.quantity) {
      throw new Error(
        `Insufficient stock. Only ${machine.quantity} unit(s) available.`
      );
    }

    const unitPrice = machine.sellingPrice;
    const unitCostPrice = machine.costPrice;
    const totalAmount = unitPrice * args.quantity;
    const totalProfit = (unitPrice - unitCostPrice) * args.quantity;
    const invoiceNumber = await generateInvoiceNumber(ctx);
    const saleDate = args.saleDate ?? Date.now();
    const newQuantity = machine.quantity - args.quantity;

    await ctx.db.patch(args.machineId, {
      quantity: newQuantity,
      updatedAt: Date.now(),
    });

    const saleId = await ctx.db.insert("sales", {
      invoiceNumber,
      machineId: args.machineId,
      machineName: machine.name,
      quantity: args.quantity,
      unitPrice,
      unitCostPrice,
      totalAmount,
      totalProfit,
      salesperson: args.salesperson.trim(),
      userId: user._id,
      saleDate,
      createdAt: Date.now(),
    });

    await createNotification(ctx, {
      type: "sale",
      title: "Sale Recorded",
      message: `Invoice ${invoiceNumber}: ${args.quantity} x ${machine.name} sold for GHS ${totalAmount.toLocaleString()} (Profit: GHS ${totalProfit.toLocaleString()}).`,
      userId: user._id,
      metadata: JSON.stringify({ saleId, invoiceNumber }),
    });

    const status = getStockStatus(newQuantity, machine.lowStockThreshold);
    if (status === "low_stock") {
      await createNotification(ctx, {
        type: "low_stock",
        title: "Low Stock Alert",
        message: `${machine.name} is at low stock (${newQuantity} units).`,
        userId: user._id,
      });
    } else if (status === "out_of_stock") {
      await createNotification(ctx, {
        type: "out_of_stock",
        title: "Out of Stock Alert",
        message: `${machine.name} is now out of stock.`,
        userId: user._id,
      });
    }

    return { saleId, invoiceNumber, totalAmount, totalProfit, newQuantity };
  },
});

export const overviewStats = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const sales = await ctx.db.query("sales").collect();
    const now = Date.now();

    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const todaySales = sales.filter((s) => s.saleDate >= dayStart);
    const weeklySales = sales.filter((s) => s.saleDate >= weekStart);
    const monthlySales = sales.filter((s) => s.saleDate >= monthStart);

    return {
      today: summarizeSales(todaySales),
      weekly: summarizeSales(weeklySales),
      monthly: summarizeSales(monthlySales),
    };
  },
});

export const chartData = query({
  args: {
    token: v.optional(v.string()),
    period: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const sales = await ctx.db.query("sales").collect();
    const now = new Date();

    if (args.period === "daily") {
      const points: { label: string; revenue: number; profit: number; units: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const dayStart = d.getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;

        const daySales = sales.filter((s) => s.saleDate >= dayStart && s.saleDate < dayEnd);
        const summary = summarizeSales(daySales);
        points.push({
          label: d.toLocaleDateString("en-GH", { weekday: "short", month: "short", day: "numeric" }),
          revenue: summary.revenue,
          profit: summary.profit,
          units: summary.units,
        });
      }
      return points;
    }

    if (args.period === "weekly") {
      const points: { label: string; revenue: number; profit: number; units: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        weekEnd.setHours(23, 59, 59, 999);
        const weekStartDate = new Date(weekEnd);
        weekStartDate.setDate(weekStartDate.getDate() - 6);
        weekStartDate.setHours(0, 0, 0, 0);

        const weekStartMs = weekStartDate.getTime();
        const weekEndMs = weekEnd.getTime();
        const weekSales = sales.filter((s) => s.saleDate >= weekStartMs && s.saleDate <= weekEndMs);
        const summary = summarizeSales(weekSales);
        points.push({
          label: weekStartDate.toLocaleDateString("en-GH", { month: "short", day: "numeric" }),
          revenue: summary.revenue,
          profit: summary.profit,
          units: summary.units,
        });
      }
      return points;
    }

    const points: { label: string; revenue: number; profit: number; units: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      d.setHours(0, 0, 0, 0);
      const monthStartMs = d.getTime();
      const monthEndMs = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

      const monthSales = sales.filter((s) => s.saleDate >= monthStartMs && s.saleDate <= monthEndMs);
      const summary = summarizeSales(monthSales);
      points.push({
        label: d.toLocaleDateString("en-GH", { month: "short", year: "2-digit" }),
        revenue: summary.revenue,
        profit: summary.profit,
        units: summary.units,
      });
    }
    return points;
  },
});

export const revenueStats = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const sales = await ctx.db.query("sales").collect();
    const now = Date.now();

    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    let todaySales = 0;
    let todayRevenue = 0;
    let todayProfit = 0;
    let weeklySales = 0;
    let weeklyRevenue = 0;
    let weeklyProfit = 0;
    let monthlySales = 0;
    let monthlyRevenue = 0;
    let monthlyProfit = 0;

    for (const sale of sales) {
      const profit = getSaleProfit(sale);
      if (sale.saleDate >= dayStart) {
        todaySales += sale.quantity;
        todayRevenue += sale.totalAmount;
        todayProfit += profit;
      }
      if (sale.saleDate >= weekStart) {
        weeklySales += sale.quantity;
        weeklyRevenue += sale.totalAmount;
        weeklyProfit += profit;
      }
      if (sale.saleDate >= monthStart) {
        monthlySales += sale.quantity;
        monthlyRevenue += sale.totalAmount;
        monthlyProfit += profit;
      }
    }

    return {
      todaySales,
      todayRevenue,
      todayProfit,
      weeklySales,
      weeklyRevenue,
      weeklyProfit,
      monthlySales,
      monthlyRevenue,
      monthlyProfit,
    };
  },
});

export const getByMachine = query({
  args: {
    token: v.optional(v.string()),
    machineId: v.id("machines"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("sales")
      .withIndex("by_machine", (q) => q.eq("machineId", args.machineId))
      .order("desc")
      .take(limit);
  },
});

export const topSelling = query({
  args: {
    token: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const sales = await ctx.db.query("sales").collect();
    const limit = args.limit ?? 5;

    const map = new Map<
      string,
      { machineId: string; machineName: string; totalQuantity: number; totalRevenue: number }
    >();

    for (const sale of sales) {
      const key = sale.machineId;
      const existing = map.get(key);
      if (existing) {
        existing.totalQuantity += sale.quantity;
        existing.totalRevenue += sale.totalAmount;
      } else {
        map.set(key, {
          machineId: sale.machineId,
          machineName: sale.machineName,
          totalQuantity: sale.quantity,
          totalRevenue: sale.totalAmount,
        });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit);
  },
});
