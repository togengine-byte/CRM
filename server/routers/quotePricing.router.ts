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
