import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

export const global = query({
  args: {
    token: v.optional(v.string()),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);

    const term = args.query.trim();
    const limit = args.limit ?? 5;

    if (!term) {
      return { machines: [], categories: [], sales: [] };
    }

    const lower = term.toLowerCase();

    const categories = await ctx.db.query("categories").collect();
    const categoryMap = new Map(categories.map((c) => [c._id, c.name]));

    const matchedCategories = categories
      .filter(
        (category) =>
          category.name.toLowerCase().includes(lower) ||
          category.slug.includes(lower) ||
          category.description?.toLowerCase().includes(lower)
      )
      .slice(0, limit)
      .map((category) => ({
        _id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description,
      }));

    let machines = await ctx.db
      .query("machines")
      .withSearchIndex("search_machines", (q) => q.search("name", term))
      .take(limit);

    const machineIds = new Set(machines.map((m) => m._id));
    const allMachines = await ctx.db.query("machines").collect();

    for (const machine of allMachines) {
      if (machines.length >= limit) break;
      if (machineIds.has(machine._id)) continue;

      const matches =
        machine.customId?.includes(term) ||
        machine.sku.toLowerCase().includes(lower) ||
        machine.brand?.toLowerCase().includes(lower) ||
        machine.model?.toLowerCase().includes(lower);

      if (matches) {
        machines.push(machine);
        machineIds.add(machine._id);
      }
    }

    const matchedMachines = machines.slice(0, limit).map((machine) => ({
      _id: machine._id,
      name: machine.name,
      customId: machine.customId,
      sku: machine.sku,
      categoryName: categoryMap.get(machine.categoryId) ?? null,
    }));

    const sales = await ctx.db.query("sales").order("desc").take(200);
    const matchedSales = sales
      .filter(
        (sale) =>
          sale.invoiceNumber.toLowerCase().includes(lower) ||
          sale.machineName.toLowerCase().includes(lower) ||
          sale.salesperson.toLowerCase().includes(lower)
      )
      .slice(0, limit)
      .map((sale) => ({
        _id: sale._id,
        invoiceNumber: sale.invoiceNumber,
        machineId: sale.machineId,
        machineName: sale.machineName,
        totalAmount: sale.totalAmount,
        saleDate: sale.saleDate,
      }));

    return {
      machines: matchedMachines,
      categories: matchedCategories,
      sales: matchedSales,
    };
  },
});
