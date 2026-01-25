import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { supplierPrices, productSizes, sizeQuantities, baseProducts } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Supplier Portal Router
 * Endpoints for suppliers to manage their prices by size+quantity combinations
 * Only suppliers can access their own data
 */

export const supplierPortalRouter = router({
  // ==================== DASHBOARD ====================
  dashboard: protectedProcedure
    .input(z.object({ supplierId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      // Admin and employees can also view supplier portal for testing/development
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get supplier's price listings
      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";
      const targetSupplierId = isAdminOrEmployee && input?.supplierId ? input.supplierId : ctx.user.id;
      const prices = await db.select().from(supplierPrices).where(eq(supplierPrices.supplierId, targetSupplierId));

      if (prices.length === 0) {
        return {
          totalProducts: 0,
          activeListings: 0,
          priceRange: { min: 0, max: 0 },
          lastUpdated: null,
        };
      }

      const priceValues = prices.map((p) => Number(p.pricePerUnit));
      const min = priceValues.length > 0 ? Math.min(...priceValues) : 0;
      const max = priceValues.length > 0 ? Math.max(...priceValues) : 0;
      const lastUpdated = prices.length > 0 ? prices[0].updatedAt : null;

      return {
        totalProducts: prices.length,
        activeListings: prices.length,
        priceRange: { min, max },
        lastUpdated,
      };
    }),

  // ==================== PRICES LIST ====================
  prices: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(20),
        search: z.string().optional(),
        supplierId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const offset = (input.page - 1) * input.limit;
      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";
      const targetSupplierId = isAdminOrEmployee && input.supplierId ? input.supplierId : ctx.user.id;

      // Get all prices with size+quantity info for target supplier
      const allPrices = await db
        .select({
          id: supplierPrices.id,
          price: supplierPrices.pricePerUnit,
          deliveryDays: supplierPrices.deliveryDays,
          updatedAt: supplierPrices.updatedAt,
          sizeQuantityId: supplierPrices.sizeQuantityId,
          quantity: sizeQuantities.quantity,
          sizeName: productSizes.name,
          dimensions: productSizes.dimensions,
          productName: baseProducts.name,
          productId: baseProducts.id,
        })
        .from(supplierPrices)
        .innerJoin(
          sizeQuantities,
          eq(supplierPrices.sizeQuantityId, sizeQuantities.id)
        )
        .innerJoin(
          productSizes,
          eq(sizeQuantities.sizeId, productSizes.id)
        )
        .innerJoin(
          baseProducts,
          eq(productSizes.productId, baseProducts.id)
        )
        .where(eq(supplierPrices.supplierId, targetSupplierId))
        .orderBy(desc(supplierPrices.updatedAt));

      // Filter by search if provided
      let filteredPrices = allPrices;
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        filteredPrices = allPrices.filter(
          (p) =>
            p.productName?.toLowerCase().includes(searchLower) ||
            p.sizeName?.toLowerCase().includes(searchLower)
        );
      }

      const total = filteredPrices.length;
      const prices = filteredPrices.slice(offset, offset + input.limit);

      return {
        data: prices,
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  // ==================== GET AVAILABLE SIZE QUANTITIES ====================
  availableSizeQuantities: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        supplierId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";
      const targetSupplierId = isAdminOrEmployee && input.supplierId ? input.supplierId : ctx.user.id;

      // Get all size quantities with product info
      const allSizeQuantities = await db
        .select({
          id: sizeQuantities.id,
          quantity: sizeQuantities.quantity,
          price: sizeQuantities.price,
          sizeName: productSizes.name,
          dimensions: productSizes.dimensions,
          sizeId: productSizes.id,
          productName: baseProducts.name,
          productId: baseProducts.id,
        })
        .from(sizeQuantities)
        .innerJoin(
          productSizes,
          eq(sizeQuantities.sizeId, productSizes.id)
        )
        .innerJoin(
          baseProducts,
          eq(productSizes.productId, baseProducts.id)
        )
        .where(eq(sizeQuantities.isActive, true));

      // Filter by search if provided
      let result = allSizeQuantities;
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        result = allSizeQuantities.filter((sq) =>
          sq.productName?.toLowerCase().includes(searchLower) ||
          sq.sizeName?.toLowerCase().includes(searchLower)
        );
      }

      // Get target supplier's existing prices
      const existingPrices = await db.select({ sizeQuantityId: supplierPrices.sizeQuantityId }).from(supplierPrices).where(eq(supplierPrices.supplierId, targetSupplierId));

      const existingSizeQuantityIds = new Set(
        existingPrices.map((p) => p.sizeQuantityId)
      );

      // Add hasPrice flag
      const finalResult = result.map((sq) => ({
        ...sq,
        hasPrice: existingSizeQuantityIds.has(sq.id),
      }));

      return finalResult;
    }),

  // ==================== CREATE PRICE ====================
  createPrice: protectedProcedure
    .input(
      z.object({
        sizeQuantityId: z.number(),
        price: z.number().positive("Price must be positive"),
        deliveryDays: z.number().int().positive("Delivery days must be positive"),
        supplierId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";
      const targetSupplierId = isAdminOrEmployee && input.supplierId ? input.supplierId : ctx.user.id;

      // Check if price already exists
      const existing = await db
        .select()
        .from(supplierPrices)
        .where(
          and(
            eq(supplierPrices.supplierId, targetSupplierId),
            eq(supplierPrices.sizeQuantityId, input.sizeQuantityId)
          )
        );

      if (existing.length > 0) {
        throw new Error("Price already exists for this size+quantity");
      }

      // Insert new price
      await db.insert(supplierPrices).values({
        supplierId: targetSupplierId,
        sizeQuantityId: input.sizeQuantityId,
        pricePerUnit: input.price.toString(),
        deliveryDays: input.deliveryDays,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true, id: input.sizeQuantityId };
    }),

  // ==================== UPDATE PRICE ====================
  updatePrice: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        price: z.number().positive("Price must be positive").optional(),
        deliveryDays: z.number().int().positive("Delivery days must be positive").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";

      // Verify ownership (admin can update any price)
      const price = await db
        .select()
        .from(supplierPrices)
        .where(eq(supplierPrices.id, input.id));

      if (price.length === 0) {
        throw new Error("Price not found");
      }

      if (!isAdminOrEmployee && price[0].supplierId !== ctx.user.id) {
        throw new Error("You can only update your own prices");
      }

      // Update price - TYPE SAFETY FIX: Using proper type instead of 'any'
      const updateData: { updatedAt: Date; pricePerUnit?: string; deliveryDays?: number } = { 
        updatedAt: new Date() 
      };
      if (input.price !== undefined) updateData.pricePerUnit = input.price.toString();
      if (input.deliveryDays !== undefined) updateData.deliveryDays = input.deliveryDays;

      await db
        .update(supplierPrices)
        .set(updateData)
        .where(eq(supplierPrices.id, input.id));

      return { success: true };
    }),

  // ==================== DELETE PRICE ====================
  deletePrice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";

      // Verify ownership (admin can delete any price)
      const price = await db
        .select()
        .from(supplierPrices)
        .where(eq(supplierPrices.id, input.id));

      if (price.length === 0) {
        throw new Error("Price not found");
      }

      if (!isAdminOrEmployee && price[0].supplierId !== ctx.user.id) {
        throw new Error("You can only delete your own prices");
      }

      // Delete price
      await db
        .delete(supplierPrices)
        .where(eq(supplierPrices.id, input.id));

      return { success: true };
    }),
});
