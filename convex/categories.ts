import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canDelete, canWrite, requireAuth } from "./lib/auth";
import { createNotification } from "./lib/notifications";

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

export const list = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const categories = await ctx.db.query("categories").order("asc").collect();
    const machines = await ctx.db.query("machines").collect();

    const counts = new Map<string, number>();
    for (const machine of machines) {
      counts.set(machine.categoryId, (counts.get(machine.categoryId) ?? 0) + 1);
    }

    return categories.map((category) => ({
      ...category,
      machineCount: counts.get(category._id) ?? 0,
    }));
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
    if (!canWrite(user)) throw new ConvexError("Permission denied.");

    const name = args.name.trim();
    if (!name) throw new ConvexError("Category name is required.");

    const slug = slugify(name);

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existing) throw new ConvexError("A category with this name already exists.");

    const id = await ctx.db.insert("categories", {
      name,
      slug,
      description: args.description?.trim() || undefined,
      createdAt: Date.now(),
    });

    await createNotification(ctx, {
      type: "category",
      title: "Category created",
      message: `${name} was added to categories.`,
      userId: user._id,
    });

    return id;
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("categories"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    if (!canWrite(user)) throw new ConvexError("Permission denied.");

    const category = await ctx.db.get(args.id);
    if (!category) throw new ConvexError("Category not found.");

    const name = args.name.trim();
    if (!name) throw new ConvexError("Category name is required.");

    const slug = slugify(name);

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existing && existing._id !== args.id) {
      throw new ConvexError("A category with this name already exists.");
    }

    await ctx.db.patch(args.id, {
      name,
      slug,
      description: args.description?.trim() || undefined,
    });

    await createNotification(ctx, {
      type: "category",
      title: "Category updated",
      message: `${name} was updated.`,
      userId: user._id,
    });
  },
});

export const remove = mutation({
  args: {
    token: v.string(),
    id: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    if (!canDelete(user)) throw new ConvexError("Permission denied.");

    const category = await ctx.db.get(args.id);
    if (!category) throw new ConvexError("Category not found.");

    const inUse = await ctx.db
      .query("machines")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .first();

    if (inUse) {
      throw new ConvexError(
        "This category has machines assigned. Reassign or remove them first."
      );
    }

    await ctx.db.delete(args.id);

    await createNotification(ctx, {
      type: "category",
      title: "Category deleted",
      message: `${category.name} was removed.`,
      userId: user._id,
    });
  },
});

export const bulkRemove = mutation({
  args: {
    token: v.string(),
    ids: v.array(v.id("categories")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    if (!canDelete(user)) throw new ConvexError("Permission denied.");

    let deleted = 0;
    let skipped = 0;

    for (const id of args.ids) {
      const category = await ctx.db.get(id);
      if (!category) {
        skipped++;
        continue;
      }

      const inUse = await ctx.db
        .query("machines")
        .withIndex("by_category", (q) => q.eq("categoryId", id))
        .first();

      if (inUse) {
        skipped++;
        continue;
      }

      await ctx.db.delete(id);
      deleted++;
    }

    if (deleted === 0 && args.ids.length > 0) {
      throw new ConvexError(
        "No categories deleted. Remove assigned machines first or pick categories without machines."
      );
    }

    return { deleted, skipped };
  },
});
