import type { MutationCtx } from "../_generated/server";

export async function generateUniqueCustomId(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const customId = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const existing = await ctx.db
      .query("machines")
      .withIndex("by_customId", (q) => q.eq("customId", customId))
      .unique();

    if (!existing) {
      return customId;
    }
  }

  throw new Error("Could not generate a unique machine ID. Please try again.");
}
