import { ConvexError } from "convex/values";
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
    const limit = args.limit ?? 50;

    let notifications = await ctx.db
      .query("notifications")
      .withIndex("by_date")
      .order("desc")
      .collect();

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
    const notification = await ctx.db.get(args.id);
    if (!notification) throw new ConvexError("Notification not found.");
    await ctx.db.patch(args.id, { isRead: true });
  },
});

export const markAsUnread = mutation({
  args: {
    token: v.string(),
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const notification = await ctx.db.get(args.id);
    if (!notification) throw new ConvexError("Notification not found.");
    await ctx.db.patch(args.id, { isRead: false });
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

export const bulkMarkAsRead = mutation({
  args: {
    token: v.string(),
    ids: v.array(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    for (const id of args.ids) {
      const notification = await ctx.db.get(id);
      if (notification) await ctx.db.patch(id, { isRead: true });
    }
  },
});

export const bulkMarkAsUnread = mutation({
  args: {
    token: v.string(),
    ids: v.array(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    for (const id of args.ids) {
      const notification = await ctx.db.get(id);
      if (notification) await ctx.db.patch(id, { isRead: false });
    }
  },
});

export const remove = mutation({
  args: {
    token: v.string(),
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const notification = await ctx.db.get(args.id);
    if (!notification) throw new ConvexError("Notification not found.");
    await ctx.db.delete(args.id);
  },
});

export const bulkRemove = mutation({
  args: {
    token: v.string(),
    ids: v.array(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    for (const id of args.ids) {
      const notification = await ctx.db.get(id);
      if (notification) await ctx.db.delete(id);
    }
  },
});

export const removeAll = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const notifications = await ctx.db.query("notifications").collect();
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }
  },
});
