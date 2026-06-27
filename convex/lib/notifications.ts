import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

type NotificationType = Doc<"notifications">["type"];

export async function createNotification(
  ctx: MutationCtx,
  args: {
    type: NotificationType;
    title: string;
    message: string;
    userId?: Doc<"users">["_id"];
    metadata?: string;
  }
) {
  await ctx.db.insert("notifications", {
    type: args.type,
    title: args.title,
    message: args.message,
    userId: args.userId,
    isRead: false,
    metadata: args.metadata,
    createdAt: Date.now(),
  });
}
