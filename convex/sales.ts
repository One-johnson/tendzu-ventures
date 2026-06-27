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
    const totalAmount = unitPrice * args.quantity;
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
      totalAmount,
      salesperson: args.salesperson.trim(),
      userId: user._id,
      saleDate,
      createdAt: Date.now(),
    });

    await createNotification(ctx, {
      type: "sale",
      title: "Sale Recorded",
      message: `Invoice ${invoiceNumber}: ${args.quantity} x ${machine.name} sold for GHS ${totalAmount.toLocaleString()}.`,
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

    return { saleId, invoiceNumber, totalAmount, newQuantity };
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
    let weeklySales = 0;
    let weeklyRevenue = 0;
    let monthlySales = 0;
    let monthlyRevenue = 0;

    for (const sale of sales) {
      if (sale.saleDate >= dayStart) {
        todaySales += sale.quantity;
        todayRevenue += sale.totalAmount;
      }
      if (sale.saleDate >= weekStart) {
        weeklySales += sale.quantity;
        weeklyRevenue += sale.totalAmount;
      }
      if (sale.saleDate >= monthStart) {
        monthlySales += sale.quantity;
        monthlyRevenue += sale.totalAmount;
      }
    }

    return {
      todaySales,
      todayRevenue,
      weeklySales,
      weeklyRevenue,
      monthlySales,
      monthlyRevenue,
    };
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

export const getById = query({
  args: {
    token: v.optional(v.string()),
    id: v.id("sales"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    return await ctx.db.get(args.id);
  },
});
