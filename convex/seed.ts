import { mutation } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

export const seedDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "admin@tendzuventures.com"))
      .unique();

    if (existingAdmin) {
      return { message: "Database already seeded.", adminEmail: "admin@tendzuventures.com" };
    }

    const passwordHash = bcrypt.hashSync("Admin@123", 12);
    await ctx.db.insert("users", {
      email: "admin@tendzuventures.com",
      passwordHash,
      name: "System Administrator",
      role: "admin",
      isActive: true,
      credentialsCustomized: false,
      credentialPromptDismissed: false,
      createdAt: Date.now(),
    });

    const existingThreshold = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "default_low_stock_threshold"))
      .collect();

    if (existingThreshold.length === 0) {
      await ctx.db.insert("settings", {
        key: "default_low_stock_threshold",
        value: "5",
        updatedAt: Date.now(),
      });
    }

    return {
      message: "Database seeded successfully.",
      adminEmail: "admin@tendzuventures.com",
      defaultPassword: "Admin@123",
    };
  },
});

export const clearCatalogData = mutation({
  args: {},
  handler: async (ctx) => {
    const sales = await ctx.db.query("sales").collect();
    for (const sale of sales) await ctx.db.delete(sale._id);

    const restocking = await ctx.db.query("restocking").collect();
    for (const entry of restocking) await ctx.db.delete(entry._id);

    const machines = await ctx.db.query("machines").collect();
    for (const machine of machines) await ctx.db.delete(machine._id);

    const categories = await ctx.db.query("categories").collect();
    for (const category of categories) await ctx.db.delete(category._id);

    const notifications = await ctx.db.query("notifications").collect();
    let clearedNotifications = 0;
    for (const notification of notifications) {
      if (
        notification.type === "sale" ||
        notification.type === "restock" ||
        notification.type === "low_stock" ||
        notification.type === "out_of_stock"
      ) {
        await ctx.db.delete(notification._id);
        clearedNotifications++;
      }
    }

    return {
      message: "Catalog data cleared.",
      deleted: {
        sales: sales.length,
        restocking: restocking.length,
        machines: machines.length,
        categories: categories.length,
        notifications: clearedNotifications,
      },
    };
  },
});

export const migrateToAdminOnly = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let updated = 0;
    for (const user of users) {
      if (user.role !== "admin") {
        await ctx.db.patch(user._id, { role: "admin" });
        updated++;
      }
    }
    return { message: "All users set to admin role.", updated };
  },
});

export const backfillSaleProfit = mutation({
  args: {},
  handler: async (ctx) => {
    const sales = await ctx.db.query("sales").collect();
    let updated = 0;
    for (const sale of sales) {
      if (sale.totalProfit !== undefined && sale.unitCostPrice !== undefined) continue;
      const machine = await ctx.db.get(sale.machineId);
      if (!machine) continue;
      const unitCostPrice = sale.unitCostPrice ?? machine.costPrice;
      const totalProfit =
        sale.totalProfit ?? (sale.unitPrice - unitCostPrice) * sale.quantity;
      await ctx.db.patch(sale._id, { unitCostPrice, totalProfit });
      updated++;
    }
    return { message: "Sale profit fields backfilled.", updated };
  },
});

/** Upsert a user by email. Used when copying auth from dev to prod. */
export const importUser = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    role: v.literal("admin"),
    isActive: v.boolean(),
    credentialsCustomized: v.optional(v.boolean()),
    credentialPromptDismissed: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    const userFields = {
      passwordHash: args.passwordHash,
      name: args.name,
      role: args.role,
      isActive: args.isActive,
      credentialsCustomized: args.credentialsCustomized ?? false,
      credentialPromptDismissed: args.credentialPromptDismissed ?? false,
    };

    if (existing) {
      await ctx.db.patch(existing._id, userFields);
      return { action: "updated" as const, email, userId: existing._id };
    }

    const userId = await ctx.db.insert("users", {
      email,
      ...userFields,
      createdAt: args.createdAt ?? Date.now(),
    });

    return { action: "inserted" as const, email, userId };
  },
});
