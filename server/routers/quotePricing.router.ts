/**
 * Quote Pricing Router
 * Handles quote pricing, auto-population, and customer price calculations
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  autoPopulateQuotePricing,
  updateQuoteItemPricing,
  recalculateQuoteTotals,
  changeQuotePricelist,
  sendQuoteToCustomer,
} from "../db";

export const quotePricingRouter = router({
  // Auto-populate quote with recommended suppliers and prices
  autoPopulate: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      pricelistId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can price quotes");
      }
      return await autoPopulateQuotePricing(input.quoteId, input.pricelistId);
    }),

  // Update single item pricing
  updateItem: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      supplierId: z.number().optional(),
      supplierCost: z.number().min(0).optional(),
      customerPrice: z.number().min(0).optional(),
      isManualPrice: z.boolean().optional(),
      deliveryDays: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can update quote pricing");
      }
      return await updateQuoteItemPricing(input);
    }),

  // Change quote pricelist
  changePricelist: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      pricelistId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can change quote pricelist");
      }
      return await changeQuotePricelist(input.quoteId, input.pricelistId);
    }),

  // Select supplier and update prices (draft mode - no job creation)
  selectSupplierForPricing: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      supplierId: z.number(),
      items: z.array(z.object({
        quoteItemId: z.number(),
        sizeQuantityId: z.number(),
        pricePerUnit: z.number(),
        deliveryDays: z.number(),
      })),
      markupPercentage: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can select suppliers");
      }
      // Import the function
      const { selectSupplierForPricing } = await import("../db/pricelists");
      return await selectSupplierForPricing(input.quoteId, input.supplierId, input.items, input.markupPercentage);
    }),

  // Recalculate quote totals
  recalculate: protectedProcedure
    .input(z.object({ quoteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can recalculate quotes");
      }
      return await recalculateQuoteTotals(input.quoteId);
    }),

  // Get default pricelist
  getDefaultPricelist: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      const { getDefaultPricelist } = await import("../db/pricelists");
      return await getDefaultPricelist();
    }),

  // Send quote to customer
  sendToCustomer: protectedProcedure
    .input(z.object({ quoteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can send quotes to customers");
      }
      return await sendQuoteToCustomer(input.quoteId, ctx.user.id);
    }),
});
