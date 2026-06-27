import type { MutationCtx } from "../_generated/server";

export async function generateInvoiceNumber(ctx: MutationCtx): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TV-${year}`;

  const existing = await ctx.db
    .query("invoiceCounters")
    .withIndex("by_year", (q) => q.eq("year", year))
    .unique();

  let counter = 1;
  if (existing) {
    counter = existing.counter + 1;
    await ctx.db.patch(existing._id, { counter });
  } else {
    await ctx.db.insert("invoiceCounters", { year, counter: 1 });
  }

  return `${prefix}-${String(counter).padStart(5, "0")}`;
}
