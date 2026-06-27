import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";
import { getStockStatus } from "./lib/stock";

export const getOverview = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);

    const machines = await ctx.db.query("machines").collect();
    const categories = await ctx.db.query("categories").collect();
    const sales = await ctx.db.query("sales").order("desc").take(10);
    const restocking = await ctx.db
      .query("restocking")
      .withIndex("by_date")
      .order("desc")
      .take(10);

    return {
      machineCount: machines.length,
      categoryCount: categories.length,
      recentSales: sales,
      recentRestocking: restocking,
    };
  },
});

export const getChartData = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);

    const machines = await ctx.db.query("machines").collect();
    const sales = await ctx.db.query("sales").collect();

    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    for (const machine of machines) {
      const status = getStockStatus(machine.quantity, machine.lowStockThreshold);
      if (status === "available") inStock++;
      else if (status === "low_stock") lowStock++;
      else outOfStock++;
    }

    const stockBreakdown = [
      { name: "Available", value: inStock, fill: "var(--chart-2)" },
      { name: "Low Stock", value: lowStock, fill: "var(--chart-4)" },
      { name: "Out of Stock", value: outOfStock, fill: "var(--chart-5)" },
    ].filter((item) => item.value > 0);

    const now = new Date();
    const dailyRevenue: { date: string; revenue: number; units: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      let revenue = 0;
      let units = 0;
      for (const sale of sales) {
        if (sale.saleDate >= dayStart && sale.saleDate < dayEnd) {
          revenue += sale.totalAmount;
          units += sale.quantity;
        }
      }

      dailyRevenue.push({
        date: d.toLocaleDateString("en-GH", { weekday: "short", month: "short", day: "numeric" }),
        revenue,
        units,
      });
    }

    const revenueComparison = [
      { period: "Today", revenue: dailyRevenue[6]?.revenue ?? 0 },
      { period: "Yesterday", revenue: dailyRevenue[5]?.revenue ?? 0 },
      {
        period: "This Week",
        revenue: dailyRevenue.reduce((sum, d) => sum + d.revenue, 0),
      },
    ];

    return { stockBreakdown, dailyRevenue, revenueComparison };
  },
});
