import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type AuthCtx = QueryCtx | MutationCtx;

export async function getUserFromToken(
  ctx: AuthCtx,
  token: string | null | undefined
): Promise<Doc<"users"> | null> {
  if (!token) return null;

  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();

  if (!session || session.expiresAt < Date.now()) {
    return null;
  }

  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive) return null;

  return user;
}

export async function requireAuth(
  ctx: AuthCtx,
  token: string | null | undefined
): Promise<Doc<"users">> {
  const user = await getUserFromToken(ctx, token);
  if (!user) {
    throw new ConvexError("Unauthorized. Please sign in again.");
  }
  return user;
}

export function requireAdmin(user: Doc<"users">) {
  if (user.role !== "admin") {
    throw new ConvexError("Admin access required.");
  }
}

/** @deprecated All authenticated users are admins. Kept for call-site clarity. */
export function canWrite(_user: Doc<"users">) {
  return true;
}

/** @deprecated All authenticated users are admins. Kept for call-site clarity. */
export function canDelete(_user: Doc<"users">) {
  return true;
}
