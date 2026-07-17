import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { canDelete, canWrite, requireAuth } from "./lib/auth";
import { createNotification } from "./lib/notifications";
import { getStockStatus } from "./lib/stock";

const bulkMachineInput = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  partNumber: v.optional(v.string()),
  costPrice: v.number(),
  sellingPrice: v.number(),
  quantity: v.number(),
  brand: v.optional(v.string()),
  model: v.optional(v.string()),
  year: v.optional(v.number()),
});

async function insertMachine(
  ctx: MutationCtx,
  user: Doc<"users">,
  args: {
    name: string;
    categoryId: Id<"categories">;
    description?: string;
    partNumber?: string;
    costPrice: number;
    sellingPrice: number;
    quantity: number;
    lowStockThreshold: number;
    brand?: string;
    model?: string;
    year?: number;
  },
  options?: { notifyCreate?: boolean }
) {
  const now = Date.now();
  const partNumber = args.partNumber?.trim() || undefined;
  const name = args.name.trim();

  const id = await ctx.db.insert("machines", {
    name,
    categoryId: args.categoryId,
    description: args.description?.trim(),
    partNumber,
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

  if (options?.notifyCreate !== false) {
    await createNotification(ctx, {
      type: "machine",
      title: "Machine added",
      message: `${name} was added to inventory.`,
      userId: user._id,
    });
  }

  const status = getStockStatus(args.quantity, args.lowStockThreshold);
  if (status === "low_stock") {
    await createNotification(ctx, {
      type: "low_stock",
      title: "Low Stock Alert",
      message: `${name} is at low stock (${args.quantity} units).`,
      userId: user._id,
    });
  } else if (status === "out_of_stock") {
    await createNotification(ctx, {
      type: "out_of_stock",
      title: "Out of Stock Alert",
      message: `${name} is out of stock.`,
      userId: user._id,
    });
  }

  return { id, name, partNumber };
}

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
          m.partNumber?.toLowerCase().includes(term) ||
          m.customId?.includes(term) ||
          m.sku?.toLowerCase().includes(term) ||
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
    partNumber: v.optional(v.string()),
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

    if (args.quantity < 0) throw new Error("Quantity cannot be negative.");
    if (args.costPrice < 0 || args.sellingPrice < 0) {
      throw new Error("Prices cannot be negative.");
    }

    return await insertMachine(ctx, user, {
      name: args.name,
      categoryId: args.categoryId,
      description: args.description,
      partNumber: args.partNumber,
      costPrice: args.costPrice,
      sellingPrice: args.sellingPrice,
      quantity: args.quantity,
      lowStockThreshold: args.lowStockThreshold,
      brand: args.brand,
      model: args.model,
      year: args.year,
    });
  },
});

export const bulkCreate = mutation({
  args: {
    token: v.string(),
    categoryId: v.id("categories"),
    lowStockThreshold: v.number(),
    machines: v.array(bulkMachineInput),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    if (!canWrite(user)) throw new Error("Permission denied.");

    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Category not found.");

    if (args.machines.length === 0) {
      throw new Error("Add at least one machine.");
    }

    if (args.machines.length > 25) {
      throw new Error("You can add up to 25 machines at once.");
    }

    if (args.lowStockThreshold < 0) {
      throw new Error("Low stock threshold cannot be negative.");
    }

    const created = [];

    for (const machine of args.machines) {
      const name = machine.name.trim();
      if (!name) throw new Error("Every machine must have a name.");

      if (machine.quantity < 0) throw new Error("Quantity cannot be negative.");
      if (machine.costPrice < 0 || machine.sellingPrice < 0) {
        throw new Error("Prices cannot be negative.");
      }

      const result = await insertMachine(
        ctx,
        user,
        {
          name,
          categoryId: args.categoryId,
          description: machine.description,
          partNumber: machine.partNumber,
          costPrice: machine.costPrice,
          sellingPrice: machine.sellingPrice,
          quantity: machine.quantity,
          lowStockThreshold: args.lowStockThreshold,
          brand: machine.brand,
          model: machine.model,
          year: machine.year,
        },
        { notifyCreate: false }
      );

      created.push(result);
    }

    await createNotification(ctx, {
      type: "machine",
      title: "Machines added",
      message: `${created.length} machine${created.length === 1 ? "" : "s"} added via bulk add.`,
      userId: user._id,
    });

    return { created, count: created.length };
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("machines"),
    name: v.string(),
    categoryId: v.id("categories"),
    description: v.optional(v.string()),
    partNumber: v.optional(v.string()),
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

    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      categoryId: args.categoryId,
      description: args.description?.trim(),
      partNumber: args.partNumber?.trim() || undefined,
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

    await createNotification(ctx, {
      type: "machine",
      title: "Machine updated",
      message: `${updated.name} details were updated.`,
      userId: user._id,
    });

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

    const machine = await ctx.db.get(args.id);
    const machineName = machine?.name ?? "Machine";

    await ctx.db.delete(args.id);

    await createNotification(ctx, {
      type: "machine",
      title: "Machine deleted",
      message: `${machineName} was removed from inventory.`,
      userId: user._id,
    });
  },
});

export const bulkRemove = mutation({
  args: {
    token: v.string(),
    ids: v.array(v.id("machines")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    if (!canDelete(user)) throw new Error("Permission denied.");

    let deleted = 0;
    let skipped = 0;

    for (const id of args.ids) {
      const sales = await ctx.db
        .query("sales")
        .withIndex("by_machine", (q) => q.eq("machineId", id))
        .first();

      if (sales) {
        skipped++;
        continue;
      }

      const machine = await ctx.db.get(id);
      if (!machine) {
        skipped++;
        continue;
      }

      await ctx.db.delete(id);
      deleted++;
    }

    if (deleted === 0 && args.ids.length > 0) {
      throw new Error(
        "No machines deleted. Machines with sales history must be deactivated instead."
      );
    }

    return { deleted, skipped };
  },
});

export const bulkSetActive = mutation({
  args: {
    token: v.string(),
    ids: v.array(v.id("machines")),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    if (!canWrite(user)) throw new Error("Permission denied.");

    const now = Date.now();
    let updated = 0;

    for (const id of args.ids) {
      const machine = await ctx.db.get(id);
      if (!machine) continue;
      await ctx.db.patch(id, { isActive: args.isActive, updatedAt: now });
      updated++;
    }

    return { updated };
  },
});

export const bulkUpdateCategory = mutation({
  args: {
    token: v.string(),
    ids: v.array(v.id("machines")),
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    if (!canWrite(user)) throw new Error("Permission denied.");

    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Category not found.");

    const now = Date.now();
    let updated = 0;

    for (const id of args.ids) {
      const machine = await ctx.db.get(id);
      if (!machine) continue;
      await ctx.db.patch(id, { categoryId: args.categoryId, updatedAt: now });
      updated++;
    }

    return { updated };
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
