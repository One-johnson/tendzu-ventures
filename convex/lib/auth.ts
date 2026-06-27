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

export function requireRole(
  user: Doc<"users">,
  roles: Array<Doc<"users">["role"]>
) {
  if (!roles.includes(user.role)) {
    throw new ConvexError("You do not have permission to perform this action.");
  }
}

export function canWrite(user: Doc<"users">) {
  return user.role === "admin" || user.role === "manager";
}

export function canDelete(user: Doc<"users">) {
  return user.role === "admin";
}
