import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canWrite, requireAuth } from "./lib/auth";
import { createNotification } from "./lib/notifications";
import { getStockStatus } from "./lib/stock";

export const list = query({
  args: {
    token: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const limit = args.limit ?? 50;

    const records = await ctx.db
      .query("restocking")
      .withIndex("by_date")
      .order("desc")
      .take(limit);

    return records;
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    machineId: v.id("machines"),
    quantityAdded: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    if (!canWrite(user)) throw new Error("Permission denied.");

    if (args.quantityAdded <= 0) {
      throw new Error("Quantity added must be greater than zero.");
    }

    const machine = await ctx.db.get(args.machineId);
    if (!machine) throw new Error("Machine not found.");

    const previousQuantity = machine.quantity;
    const newQuantity = previousQuantity + args.quantityAdded;

    await ctx.db.patch(args.machineId, {
      quantity: newQuantity,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("restocking", {
      machineId: args.machineId,
      machineName: machine.name,
      quantityAdded: args.quantityAdded,
      previousQuantity,
      newQuantity,
      notes: args.notes?.trim(),
      userId: user._id,
      createdAt: Date.now(),
    });

    await createNotification(ctx, {
      type: "restock",
      title: "Stock Restocked",
      message: `${args.quantityAdded} units of ${machine.name} added. New stock: ${newQuantity}.`,
      userId: user._id,
    });

    const status = getStockStatus(newQuantity, machine.lowStockThreshold);
    if (status === "low_stock") {
      await createNotification(ctx, {
        type: "low_stock",
        title: "Low Stock Alert",
        message: `${machine.name} is still at low stock (${newQuantity} units).`,
        userId: user._id,
      });
    }

    return { previousQuantity, newQuantity };
  },
});

export const getByMachine = query({
  args: {
    token: v.optional(v.string()),
    machineId: v.id("machines"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    return await ctx.db
      .query("restocking")
      .withIndex("by_machine", (q) => q.eq("machineId", args.machineId))
      .order("desc")
      .collect();
  },
});
