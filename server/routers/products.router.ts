/**
 * Products Router
 * Handles products, sizes, quantities, addons, and price calculations
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  getDb,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductCategories,
  getProductWithDetails,
  getProductsWithDetails,
  createProductSize,
  updateProductSize,
  deleteProductSize,
  createProductQuantity,
  updateProductQuantity,
  deleteProductQuantity,
  createProductAddon,
  updateProductAddon,
  deleteProductAddon,
  calculateProductPrice,
} from "../db";

export const productsRouter = router({
  list: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      categoryId: z.number().optional(),
      isActive: z.boolean().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getProducts(input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getProductById(input.id);
    }),

  categories: protectedProcedure
    .query(async () => {
      return await getProductCategories();
    }),

  getCategories: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { categories } = await import('../../drizzle/schema');
      return await db.select().from(categories).orderBy(categories.displayOrder);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "שם המוצר נדרש"),
      description: z.string().optional(),
      category: z.string().optional(),
      categoryId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can create products");
      }
      return await createProduct(input);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      categoryId: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can update products");
      }
      return await updateProduct(input);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can delete products");
      }
      return await deleteProduct(input.id);
    }),

  // DEPRECATED - variants replaced by sizes/quantities
  createVariant: protectedProcedure
    .input(z.object({
      baseProductId: z.number(),
      sku: z.string().min(1, "מק\"ט נדרש"),
      name: z.string().min(1, "שם הוריאנט נדרש"),
      price: z.number().optional(),
      pricingType: z.string().optional(),
      attributes: z.record(z.string(), z.unknown()).optional(),
      validationProfileId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Variants are deprecated - use sizes and quantities");
      }
      throw new Error("Variants are deprecated - use sizes and quantities");
    }),

  // DEPRECATED - variants replaced by sizes/quantities
  updateVariant: protectedProcedure
    .input(z.object({
      id: z.number(),
      sku: z.string().optional(),
      name: z.string().optional(),
      price: z.number().optional(),
      pricingType: z.string().optional(),
      attributes: z.record(z.string(), z.unknown()).optional(),
      validationProfileId: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async () => {
      throw new Error("Variants are deprecated - use sizes and quantities");
    }),

  deleteVariant: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async () => {
      throw new Error("Variants are deprecated - use sizes and quantities");
    }),

  // ===== SIZE QUANTITIES =====
  getSizeQuantities: publicProcedure
    .input(z.object({ sizeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { sizeQuantities } = await import('../../drizzle/schema');
      const { eq, asc, and } = await import('drizzle-orm');
      return await db.select().from(sizeQuantities)
        .where(and(
          eq(sizeQuantities.sizeId, input.sizeId),
          eq(sizeQuantities.isActive, true)
        ))
        .orderBy(asc(sizeQuantities.displayOrder));
    }),

  createSizeQuantity: protectedProcedure
    .input(z.object({
      sizeId: z.number(),
      quantity: z.number(),
      price: z.number(),
      displayOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { sizeQuantities } = await import('../../drizzle/schema');
      const result = await db.insert(sizeQuantities).values({
        sizeId: input.sizeId,
        quantity: input.quantity,
        price: input.price.toString(),
        displayOrder: input.displayOrder || 0,
      }).returning();
      return result[0];
    }),

  updateSizeQuantity: protectedProcedure
    .input(z.object({
      id: z.number(),
      quantity: z.number().optional(),
      price: z.number().optional(),
      displayOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { sizeQuantities } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const updateData: Record<string, unknown> = {};
      if (input.quantity !== undefined) updateData.quantity = input.quantity;
      if (input.price !== undefined) updateData.price = input.price.toString();
      if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      const result = await db.update(sizeQuantities)
        .set(updateData)
        .where(eq(sizeQuantities.id, input.id))
        .returning();
      return result[0];
    }),

  deleteSizeQuantity: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { sizeQuantities } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      // Soft delete - set isActive to false
      await db.update(sizeQuantities)
        .set({ isActive: false })
        .where(eq(sizeQuantities.id, input.id));
      return { success: true };
    }),

  // ===== SIZES =====
  getSizes: publicProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { productSizes } = await import('../../drizzle/schema');
      const { eq, asc, and } = await import('drizzle-orm');
      return await db.select().from(productSizes)
        .where(and(
          eq(productSizes.productId, input.productId),
          eq(productSizes.isActive, true)
        ))
        .orderBy(asc(productSizes.displayOrder));
    }),

  createSize: protectedProcedure
    .input(z.object({
      productId: z.number(),
      name: z.string().min(1),
      dimensions: z.string().optional(),
      basePrice: z.number(),
      graphicDesignPrice: z.number().optional(),
      displayOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await createProductSize(input);
    }),

  updateSize: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      dimensions: z.string().optional(),
      basePrice: z.number().optional(),
      graphicDesignPrice: z.number().optional(),
      displayOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await updateProductSize(input);
    }),

  deleteSize: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await deleteProductSize(input.id);
    }),

  // ===== QUANTITIES =====
  getQuantities: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { sizeQuantities, productSizes } = await import('../../drizzle/schema');
      const { eq, asc, inArray } = await import('drizzle-orm');
      // Get sizes for this product first
      const sizes = await db.select().from(productSizes).where(eq(productSizes.productId, input.productId));
      if (sizes.length === 0) return [];
      const sizeIds = sizes.map(s => s.id);
      return await db.select().from(sizeQuantities)
        .where(inArray(sizeQuantities.sizeId, sizeIds))
        .orderBy(asc(sizeQuantities.displayOrder));
    }),

  createQuantity: protectedProcedure
    .input(z.object({
      productId: z.number(),
      quantity: z.number(),
      priceMultiplier: z.number(),
      displayOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await createProductQuantity(input);
    }),

  updateQuantity: protectedProcedure
    .input(z.object({
      id: z.number(),
      quantity: z.number().optional(),
      priceMultiplier: z.number().optional(),
      displayOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await updateProductQuantity(input);
    }),

  deleteQuantity: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await deleteProductQuantity(input.id);
    }),

  // ===== ADDONS =====
  getAddons: publicProcedure
    .input(z.object({ productId: z.number().optional(), categoryId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { productAddons } = await import('../../drizzle/schema');
      const { eq, or, isNull, asc } = await import('drizzle-orm');
      if (input.productId) {
        return await db.select().from(productAddons)
          .where(or(eq(productAddons.productId, input.productId), isNull(productAddons.productId)))
          .orderBy(asc(productAddons.name));
      }
      return await db.select().from(productAddons).orderBy(asc(productAddons.name));
    }),

  createAddon: protectedProcedure
    .input(z.object({
      productId: z.number().optional(),
      categoryId: z.number().optional(),
      name: z.string().min(1),
      description: z.string().optional(),
      priceType: z.enum(['fixed', 'percentage', 'per_unit']),
      price: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await createProductAddon(input);
    }),

  updateAddon: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      priceType: z.enum(['fixed', 'percentage', 'per_unit']).optional(),
      price: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await updateProductAddon(input);
    }),

  deleteAddon: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await deleteProductAddon(input.id);
    }),

  // ===== PRICE CALCULATION =====
  calculatePrice: protectedProcedure
    .input(z.object({
      productId: z.number(),
      sizeId: z.number(),
      quantityId: z.number().optional(),
      customQuantity: z.number().optional(),
      addonIds: z.array(z.number()).optional(),
    }))
    .query(async ({ input }) => {
      return await calculateProductPrice(input);
    }),

  // ===== GET WITH DETAILS =====
  getWithDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getProductWithDetails(input.id);
    }),

  listWithDetails: protectedProcedure
    .input(z.object({ categoryId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return await getProductsWithDetails(input?.categoryId);
    }),

  // ===== GET SIZE QUANTITY BY ID =====
  getSizeQuantityById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const { sizeQuantities, productSizes, baseProducts } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      
      const result = await db.select({
        id: sizeQuantities.id,
        sizeId: sizeQuantities.sizeId,
        quantity: sizeQuantities.quantity,
        price: sizeQuantities.price,
        sizeName: productSizes.name,
        dimensions: productSizes.dimensions,
        productId: productSizes.productId,
        productName: baseProducts.name,
      })
        .from(sizeQuantities)
        .innerJoin(productSizes, eq(sizeQuantities.sizeId, productSizes.id))
        .innerJoin(baseProducts, eq(productSizes.productId, baseProducts.id))
        .where(eq(sizeQuantities.id, input.id))
        .limit(1);

      if (!result[0]) return null;
      
      return {
        ...result[0],
        quantityLabel: `${result[0].quantity} יח'`,
      };
    }),
});
