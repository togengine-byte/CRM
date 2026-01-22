import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { supplierPrices, productVariants, baseProducts } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Supplier Portal Router
 * Endpoints for suppliers to manage their prices, delivery times, and notes
 * Only suppliers can access their own data
 */

export const supplierPortalRouter = router({
  // ==================== DASHBOARD ====================
  dashboard: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get supplier's price listings
      const prices = await db
        .select()
        .from(supplierPrices)
        .where(eq(supplierPrices.supplierId, ctx.user.id));

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
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const offset = (input.page - 1) * input.limit;

      // Get all prices first
      const allPrices = await db
        .select({
          id: supplierPrices.id,
          price: supplierPrices.pricePerUnit,
          deliveryDays: supplierPrices.deliveryDays,
          minimumQuantity: supplierPrices.minQuantity,
          updatedAt: supplierPrices.updatedAt,
          variantId: supplierPrices.productVariantId,
          variantSku: productVariants.sku,
          attributes: productVariants.attributes,
          productName: baseProducts.name,
        })
        .from(supplierPrices)
        .innerJoin(
          productVariants,
          eq(supplierPrices.productVariantId, productVariants.id)
        )
        .innerJoin(
          baseProducts,
          eq(productVariants.baseProductId, baseProducts.id)
        )
        .where(eq(supplierPrices.supplierId, ctx.user.id))
        .orderBy(desc(supplierPrices.updatedAt));

      // Filter by search if provided
      let filteredPrices = allPrices;
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        filteredPrices = allPrices.filter(
          (p) =>
            p.productName?.toLowerCase().includes(searchLower) ||
            p.variantSku?.toLowerCase().includes(searchLower)
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

  // ==================== GET AVAILABLE VARIANTS ====================
  availableVariants: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all variants
      const allVariants = await db
        .select({
          id: productVariants.id,
          sku: productVariants.sku,
          attributes: productVariants.attributes,
          baseProductName: baseProducts.name,
          baseProductId: baseProducts.id,
        })
        .from(productVariants)
        .innerJoin(
          baseProducts,
          eq(productVariants.baseProductId, baseProducts.id)
        );

      // Filter by search if provided
      let variants = allVariants;
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        variants = allVariants.filter((v) =>
          v.baseProductName?.toLowerCase().includes(searchLower)
        );
      }

      // Get supplier's existing prices
      const existingPrices = await db
        .select({ variantId: supplierPrices.productVariantId })
        .from(supplierPrices)
        .where(eq(supplierPrices.supplierId, ctx.user.id));

      const existingVariantIds = new Set(
        existingPrices.map((p) => p.variantId)
      );

      // Add hasPrice flag
      const result = variants.map((v) => ({
        ...v,
        hasPrice: existingVariantIds.has(v.id),
      }));

      return result;
    }),

  // ==================== CREATE PRICE ====================
  createPrice: protectedProcedure
    .input(
      z.object({
        productVariantId: z.number(),
        price: z.number().positive("Price must be positive"),
        deliveryDays: z.number().int().positive("Delivery days must be positive"),
        minimumQuantity: z.number().int().positive("Minimum quantity must be positive"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if price already exists
      const existing = await db
        .select()
        .from(supplierPrices)
        .where(
          and(
            eq(supplierPrices.supplierId, ctx.user.id),
            eq(supplierPrices.productVariantId, input.productVariantId)
          )
        );

      if (existing.length > 0) {
        throw new Error("Price already exists for this variant");
      }

      // Insert new price
      await db.insert(supplierPrices).values({
        supplierId: ctx.user.id,
        productVariantId: input.productVariantId,
        pricePerUnit: input.price.toString(),
        deliveryDays: input.deliveryDays,
        minQuantity: input.minimumQuantity,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true, id: input.productVariantId };
    }),

  // ==================== UPDATE PRICE ====================
  updatePrice: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        price: z.number().positive("Price must be positive").optional(),
        deliveryDays: z.number().int().positive("Delivery days must be positive").optional(),
        minimumQuantity: z.number().int().positive("Minimum quantity must be positive").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const price = await db
        .select()
        .from(supplierPrices)
        .where(eq(supplierPrices.id, input.id));

      if (price.length === 0) {
        throw new Error("Price not found");
      }

      if (price[0].supplierId !== ctx.user.id) {
        throw new Error("You can only update your own prices");
      }

      // Update price
      const updateData: any = { updatedAt: new Date() };
      if (input.price !== undefined) updateData.pricePerUnit = input.price.toString();
      if (input.deliveryDays !== undefined) updateData.deliveryDays = input.deliveryDays;
      if (input.minimumQuantity !== undefined) updateData.minQuantity = input.minimumQuantity;

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
      if (ctx.user.role !== "supplier") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const price = await db
        .select()
        .from(supplierPrices)
        .where(eq(supplierPrices.id, input.id));

      if (price.length === 0) {
        throw new Error("Price not found");
      }

      if (price[0].supplierId !== ctx.user.id) {
        throw new Error("You can only delete your own prices");
      }

      // Delete price
      await db
        .delete(supplierPrices)
        .where(eq(supplierPrices.id, input.id));

      return { success: true };
    }),
});
