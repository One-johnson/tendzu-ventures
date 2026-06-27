import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

export const list = query({
  args: {
    token: v.optional(v.string()),
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const limit = args.limit ?? 20;

    let notifications = await ctx.db
      .query("notifications")
      .withIndex("by_date")
      .order("desc")
      .take(limit * 2);

    if (args.unreadOnly) {
      notifications = notifications.filter((n) => !n.isRead);
    }

    return notifications.slice(0, limit);
  },
});

export const unreadCount = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_read", (q) => q.eq("isRead", false))
      .collect();
    return notifications.length;
  },
});

export const markAsRead = mutation({
  args: {
    token: v.string(),
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    await ctx.db.patch(args.id, { isRead: true });
  },
});

export const markAllAsRead = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_read", (q) => q.eq("isRead", false))
      .collect();

    for (const notification of notifications) {
      await ctx.db.patch(notification._id, { isRead: true });
    }
  },
});
