import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAdmin, requireAuth } from "./lib/auth";
import { createNotification } from "./lib/notifications";

async function getSettingByKey(ctx: QueryCtx | MutationCtx, key: string) {
  const settings = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .collect();

  if (settings.length === 0) return null;

  return settings.sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export const get = query({
  args: {
    token: v.optional(v.string()),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const setting = await getSettingByKey(ctx, args.key);
    return setting?.value ?? null;
  },
});

export const getDefaultLowStockThreshold = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const setting = await getSettingByKey(ctx, "default_low_stock_threshold");
    return setting ? Number(setting.value) : 5;
  },
});

export const set = mutation({
  args: {
    token: v.string(),
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .collect();

    const now = Date.now();

    if (settings.length === 0) {
      await ctx.db.insert("settings", {
        key: args.key,
        value: args.value,
        updatedAt: now,
      });
    } else {
      const [keep, ...duplicates] = settings.sort((a, b) => b.updatedAt - a.updatedAt);
      await ctx.db.patch(keep._id, {
        value: args.value,
        updatedAt: now,
      });

      for (const duplicate of duplicates) {
        await ctx.db.delete(duplicate._id);
      }
    }

    await createNotification(ctx, {
      type: "settings",
      title: "Settings updated",
      message:
        args.key === "default_low_stock_threshold"
          ? `Default low stock threshold set to ${args.value}.`
          : `${args.key} was updated.`,
      userId: user._id,
    });
  },
});

/** One-time cleanup for duplicate settings keys created by repeated seeds/writes. */
export const dedupeSettings = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("settings").collect();
    const byKey = new Map<string, typeof all>();

    for (const setting of all) {
      const group = byKey.get(setting.key) ?? [];
      group.push(setting);
      byKey.set(setting.key, group);
    }

    let deleted = 0;

    for (const group of byKey.values()) {
      if (group.length <= 1) continue;
      const [, ...duplicates] = group.sort((a, b) => b.updatedAt - a.updatedAt);
      for (const duplicate of duplicates) {
        await ctx.db.delete(duplicate._id);
        deleted++;
      }
    }

    return { deleted, keys: byKey.size };
  },
});
