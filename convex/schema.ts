import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const userRole = v.literal("admin");

export const notificationType = v.union(
  v.literal("sale"),
  v.literal("restock"),
  v.literal("low_stock"),
  v.literal("out_of_stock"),
  v.literal("machine"),
  v.literal("category"),
  v.literal("settings")
);

export default defineSchema({
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    role: userRole,
    isActive: v.boolean(),
    credentialsCustomized: v.optional(v.boolean()),
    credentialPromptDismissed: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_name", ["name"]),

  machines: defineTable({
    customId: v.optional(v.string()),
    name: v.string(),
    categoryId: v.id("categories"),
    description: v.optional(v.string()),
    sku: v.optional(v.string()),
    partNumber: v.optional(v.string()),
    costPrice: v.number(),
    sellingPrice: v.number(),
    quantity: v.number(),
    lowStockThreshold: v.number(),
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["categoryId"])
    .index("by_customId", ["customId"])
    .index("by_sku", ["sku"])
    .index("by_partNumber", ["partNumber"])
    .index("by_quantity", ["quantity"])
    .searchIndex("search_machines", {
      searchField: "name",
      filterFields: ["categoryId", "isActive"],
    }),

  restocking: defineTable({
    machineId: v.id("machines"),
    machineName: v.string(),
    quantityAdded: v.number(),
    previousQuantity: v.number(),
    newQuantity: v.number(),
    notes: v.optional(v.string()),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_machine", ["machineId"])
    .index("by_date", ["createdAt"]),

  sales: defineTable({
    invoiceNumber: v.string(),
    machineId: v.id("machines"),
    machineName: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    unitCostPrice: v.optional(v.number()),
    totalAmount: v.number(),
    totalProfit: v.optional(v.number()),
    salesperson: v.string(),
    userId: v.id("users"),
    saleDate: v.number(),
    createdAt: v.number(),
  })
    .index("by_invoice", ["invoiceNumber"])
    .index("by_date", ["saleDate"])
    .index("by_machine", ["machineId"])
    .index("by_created", ["createdAt"]),

  notifications: defineTable({
    type: notificationType,
    title: v.string(),
    message: v.string(),
    userId: v.optional(v.id("users")),
    isRead: v.boolean(),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_read", ["isRead"])
    .index("by_date", ["createdAt"]),

  settings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  invoiceCounters: defineTable({
    year: v.number(),
    counter: v.number(),
  }).index("by_year", ["year"]),
});
