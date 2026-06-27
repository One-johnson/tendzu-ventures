import { mutation } from "./_generated/server";
import bcrypt from "bcryptjs";

const DEFAULT_CATEGORIES = [
  "Excavator",
  "Bulldozer",
  "Forklift",
  "Crane",
  "Loader",
  "Grader",
  "Roller",
  "Dump Truck",
  "Backhoe",
  "Compactor",
];

export const seedDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "admin@tendzuventures.com"))
      .unique();

    if (existingAdmin) {
      return { message: "Database already seeded.", adminEmail: "admin@tendzuventures.com" };
    }

    const passwordHash = await bcrypt.hash("Admin@123", 12);
    await ctx.db.insert("users", {
      email: "admin@tendzuventures.com",
      passwordHash,
      name: "System Administrator",
      role: "admin",
      isActive: true,
      createdAt: Date.now(),
    });

    const categoryIds: Record<string, string> = {};
    for (const name of DEFAULT_CATEGORIES) {
      const id = await ctx.db.insert("categories", {
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        createdAt: Date.now(),
      });
      categoryIds[name] = id;
    }

    await ctx.db.insert("settings", {
      key: "default_low_stock_threshold",
      value: "5",
      updatedAt: Date.now(),
    });

    const sampleMachines = [
      {
        name: "CAT 320 Excavator",
        category: "Excavator",
        sku: "EXC-CAT-320",
        costPrice: 850000,
        sellingPrice: 1200000,
        quantity: 3,
        brand: "Caterpillar",
        model: "320",
        year: 2022,
      },
      {
        name: "Komatsu D65 Bulldozer",
        category: "Bulldozer",
        sku: "BLD-KOM-D65",
        costPrice: 720000,
        sellingPrice: 980000,
        quantity: 2,
        brand: "Komatsu",
        model: "D65",
        year: 2021,
      },
      {
        name: "Toyota 8FG Forklift",
        category: "Forklift",
        sku: "FLK-TOY-8FG",
        costPrice: 95000,
        sellingPrice: 145000,
        quantity: 8,
        brand: "Toyota",
        model: "8FG25",
        year: 2023,
      },
      {
        name: "Liebherr LTM Crane",
        category: "Crane",
        sku: "CRN-LIE-LTM",
        costPrice: 1500000,
        sellingPrice: 2100000,
        quantity: 1,
        brand: "Liebherr",
        model: "LTM 1100",
        year: 2020,
      },
      {
        name: "Volvo L120 Loader",
        category: "Loader",
        sku: "LDR-VOL-L120",
        costPrice: 480000,
        sellingPrice: 650000,
        quantity: 4,
        brand: "Volvo",
        model: "L120H",
        year: 2022,
      },
      {
        name: "CAT 140M Grader",
        category: "Grader",
        sku: "GRD-CAT-140M",
        costPrice: 520000,
        sellingPrice: 710000,
        quantity: 2,
        brand: "Caterpillar",
        model: "140M",
        year: 2021,
      },
      {
        name: "Bomag BW213 Roller",
        category: "Roller",
        sku: "ROL-BOM-213",
        costPrice: 180000,
        sellingPrice: 265000,
        quantity: 5,
        brand: "Bomag",
        model: "BW213",
        year: 2023,
      },
    ];

    const now = Date.now();
    for (const machine of sampleMachines) {
      await ctx.db.insert("machines", {
        name: machine.name,
        categoryId: categoryIds[machine.category] as never,
        sku: machine.sku,
        costPrice: machine.costPrice,
        sellingPrice: machine.sellingPrice,
        quantity: machine.quantity,
        lowStockThreshold: 3,
        brand: machine.brand,
        model: machine.model,
        year: machine.year,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      message: "Database seeded successfully.",
      adminEmail: "admin@tendzuventures.com",
      defaultPassword: "Admin@123",
    };
  },
});
