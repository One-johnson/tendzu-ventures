import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import bcrypt from "bcryptjs";
import type { Doc } from "./_generated/dataModel";
import { getUserFromToken, requireAuth } from "./lib/auth";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function toSessionUser(user: Doc<"users">) {
  return {
    _id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    showCredentialPrompt:
      !user.credentialsCustomized && !user.credentialPromptDismissed,
  };
}

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!user || !user.isActive) {
      throw new ConvexError("Invalid email or password.");
    }

    const valid = bcrypt.compareSync(args.password, user.passwordHash);
    if (!valid) {
      throw new ConvexError("Invalid email or password.");
    }

    const token = generateToken();
    const expiresAt = Date.now() + SESSION_DURATION_MS;

    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt,
      createdAt: Date.now(),
    });

    return {
      token,
      expiresAt,
      user: toSessionUser(user),
    };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

export const getSession = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) return null;

    return toSessionUser(user);
  },
});

export const changePassword = mutation({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    const valid = bcrypt.compareSync(args.currentPassword, user.passwordHash);
    if (!valid) {
      throw new ConvexError("Current password is incorrect.");
    }

    if (args.newPassword.length < 8) {
      throw new ConvexError("New password must be at least 8 characters.");
    }

    const passwordHash = bcrypt.hashSync(args.newPassword, 12);
    await ctx.db.patch(user._id, {
      passwordHash,
      credentialsCustomized: true,
    });

    return { success: true };
  },
});

export const changeEmail = mutation({
  args: {
    token: v.string(),
    newEmail: v.string(),
    currentPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    const valid = bcrypt.compareSync(args.currentPassword, user.passwordHash);
    if (!valid) {
      throw new ConvexError("Current password is incorrect.");
    }

    const email = args.newEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      throw new ConvexError("Enter a valid email address.");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing && existing._id !== user._id) {
      throw new ConvexError("That email is already in use.");
    }

    await ctx.db.patch(user._id, {
      email,
      credentialsCustomized: true,
    });

    return { success: true, email };
  },
});

export const dismissCredentialPrompt = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    await ctx.db.patch(user._id, {
      credentialPromptDismissed: true,
    });

    return { success: true };
  },
});
