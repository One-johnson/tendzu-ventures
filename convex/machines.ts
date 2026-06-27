import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canDelete, canWrite, requireAuth } from "./lib/auth";
import { createNotification } from "./lib/notifications";
import { getStockStatus } from "./lib/stock";

export const list = query({
  args: {
    token: v.optional(v.string()),
    search: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    stockStatus: v.optional(
      v.union(
        v.literal("available"),
        v.literal("low_stock"),
        v.literal("out_of_stock")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);

    let machines = await ctx.db.query("machines").collect();

    if (args.categoryId) {
      machines = machines.filter((m) => m.categoryId === args.categoryId);
    }

    if (args.search?.trim()) {
      const term = args.search.trim().toLowerCase();
      machines = machines.filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          m.sku.toLowerCase().includes(term) ||
          m.brand?.toLowerCase().includes(term) ||
          m.model?.toLowerCase().includes(term)
      );
    }

    const categories = await ctx.db.query("categories").collect();
    const categoryMap = new Map(categories.map((c) => [c._id, c]));

    const enriched = machines.map((machine) => {
      const status = getStockStatus(machine.quantity, machine.lowStockThreshold);
      return {
        ...machine,
        category: categoryMap.get(machine.categoryId) ?? null,
        stockStatus: status,
      };
    });

    if (args.stockStatus) {
      return enriched.filter((m) => m.stockStatus === args.stockStatus);
    }

    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getById = query({
  args: {
    token: v.optional(v.string()),
    id: v.id("machines"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const machine = await ctx.db.get(args.id);
    if (!machine) return null;

    const category = await ctx.db.get(machine.categoryId);
    return {
      ...machine,
      category,
      stockStatus: getStockStatus(machine.quantity, machine.lowStockThreshold),
    };
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    categoryId: v.id("categories"),
    description: v.optional(v.string()),
    sku: v.string(),
    costPrice: v.number(),
    sellingPrice: v.number(),
    quantity: v.number(),
    lowStockThreshold: v.number(),
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    if (!canWrite(user)) throw new Error("Permission denied.");

    const sku = args.sku.trim().toUpperCase();
    const existing = await ctx.db
      .query("machines")
      .withIndex("by_sku", (q) => q.eq("sku", sku))
      .unique();

    if (existing) throw new Error("A machine with this SKU already exists.");

    if (args.quantity < 0) throw new Error("Quantity cannot be negative.");
    if (args.costPrice < 0 || args.sellingPrice < 0) {
      throw new Error("Prices cannot be negative.");
    }

    const now = Date.now();
    const id = await ctx.db.insert("machines", {
      name: args.name.trim(),
      categoryId: args.categoryId,
      description: args.description?.trim(),
      sku,
      costPrice: args.costPrice,
      sellingPrice: args.sellingPrice,
      quantity: args.quantity,
      lowStockThreshold: args.lowStockThreshold,
      brand: args.brand?.trim(),
      model: args.model?.trim(),
      year: args.year,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const status = getStockStatus(args.quantity, args.lowStockThreshold);
    if (status === "low_stock") {
      await createNotification(ctx, {
        type: "low_stock",
        title: "Low Stock Alert",
        message: `${args.name.trim()} is at low stock (${args.quantity} units).`,
        userId: user._id,
      });
    } else if (status === "out_of_stock") {
      await createNotification(ctx, {
        type: "out_of_stock",
        title: "Out of Stock Alert",
        message: `${args.name.trim()} is out of stock.`,
        userId: user._id,
      });
    }

    return id;
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("machines"),
    name: v.string(),
    categoryId: v.id("categories"),
    description: v.optional(v.string()),
    sku: v.string(),
    costPrice: v.number(),
    sellingPrice: v.number(),
    lowStockThreshold: v.number(),
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    if (!canWrite(user)) throw new Error("Permission denied.");

    const machine = await ctx.db.get(args.id);
    if (!machine) throw new Error("Machine not found.");

    const sku = args.sku.trim().toUpperCase();
    const existing = await ctx.db
      .query("machines")
      .withIndex("by_sku", (q) => q.eq("sku", sku))
      .unique();

    if (existing && existing._id !== args.id) {
      throw new Error("A machine with this SKU already exists.");
    }

    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      categoryId: args.categoryId,
      description: args.description?.trim(),
      sku,
      costPrice: args.costPrice,
      sellingPrice: args.sellingPrice,
      lowStockThreshold: args.lowStockThreshold,
      brand: args.brand?.trim(),
      model: args.model?.trim(),
      year: args.year,
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    const updated = await ctx.db.get(args.id);
    if (!updated) return;

    const status = getStockStatus(updated.quantity, updated.lowStockThreshold);
    if (status === "low_stock") {
      await createNotification(ctx, {
        type: "low_stock",
        title: "Low Stock Alert",
        message: `${updated.name} is at low stock (${updated.quantity} units).`,
        userId: user._id,
      });
    } else if (status === "out_of_stock") {
      await createNotification(ctx, {
        type: "out_of_stock",
        title: "Out of Stock Alert",
        message: `${updated.name} is out of stock.`,
        userId: user._id,
      });
    }
  },
});

export const remove = mutation({
  args: {
    token: v.string(),
    id: v.id("machines"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    if (!canDelete(user)) throw new Error("Permission denied.");

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_machine", (q) => q.eq("machineId", args.id))
      .first();

    if (sales) {
      throw new Error(
        "Cannot delete machine with sales history. Deactivate it instead."
      );
    }

    await ctx.db.delete(args.id);
  },
});

export const stats = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const machines = await ctx.db.query("machines").collect();
    const categories = await ctx.db.query("categories").collect();

    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    for (const machine of machines) {
      const status = getStockStatus(machine.quantity, machine.lowStockThreshold);
      if (status === "available") inStock++;
      else if (status === "low_stock") lowStock++;
      else outOfStock++;
    }

    return {
      totalMachines: machines.length,
      totalCategories: categories.length,
      inStock,
      lowStock,
      outOfStock,
    };
  },
});
