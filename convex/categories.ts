import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canWrite, requireAuth } from "./lib/auth";

export const list = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    return await ctx.db.query("categories").order("asc").collect();
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    if (!canWrite(user)) throw new Error("Permission denied.");

    const name = args.name.trim();
    const slug = name.toLowerCase().replace(/\s+/g, "-");

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existing) throw new Error("Category already exists.");

    return await ctx.db.insert("categories", {
      name,
      slug,
      description: args.description?.trim(),
      createdAt: Date.now(),
    });
  },
});
