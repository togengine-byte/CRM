/**
 * Quotes Router
 * Handles quote creation, updates, status changes, and supplier assignment
 */

import { z } from "zod";
import { sql } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getDb,
  getQuotes,
  getQuoteById,
  getQuoteHistory,
  createQuoteRequest,
  updateQuote,
  reviseQuote,
  updateQuoteStatus,
  rejectQuote,
  rateDeal,
  assignSupplierToQuoteItem,
} from "../db";

export const quotesRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      customerId: z.number().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getQuotes(input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getQuoteById(input.id);
    }),

  history: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getQuoteHistory(input.id);
    }),

  request: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        sizeQuantityId: z.number(),
        quantity: z.number(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      // SECURITY FIX: Only customers, admins, and employees can create quote requests
      // Suppliers and couriers should not be able to create quotes
      if (ctx.user.role !== 'customer' && ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only customers can request quotes. Suppliers and couriers are not authorized.");
      }
      return await createQuoteRequest({
        customerId: ctx.user.id,
        items: input.items || [],
      });
    }),

  update: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      items: z.array(z.object({
        sizeQuantityId: z.number(),
        quantity: z.number(),
        priceAtTimeOfQuote: z.number(),
        isUpsell: z.boolean().optional(),
        supplierId: z.number().optional(),
        supplierCost: z.number().optional(),
        deliveryDays: z.number().optional(),
      })).optional(),
      finalValue: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can update quotes");
      }
      return await updateQuote({
        quoteId: input.quoteId,
        employeeId: ctx.user.id,
        items: input.items,
        finalValue: input.finalValue,
      });
    }),

  revise: protectedProcedure
    .input(z.object({ quoteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can revise quotes");
      }
      return await reviseQuote({
        quoteId: input.quoteId,
        employeeId: ctx.user.id,
      });
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      status: z.enum(['draft', 'sent', 'approved', 'rejected', 'superseded', 'in_production', 'ready']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can update quote status");
      }
      return await updateQuoteStatus(input.quoteId, input.status, ctx.user.id);
    }),

  reject: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      reason: z.string().min(1, "Rejection reason is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can reject quotes");
      }
      return await rejectQuote(input.quoteId, input.reason, ctx.user.id);
    }),

  rate: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      rating: z.number().min(1).max(10),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can rate deals");
      }
      return await rateDeal(input.quoteId, input.rating, ctx.user.id);
    }),

  assignSupplier: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      supplierId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can assign suppliers");
      }
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get quote items
      const quoteItemsResult = await db.execute(sql`
        SELECT id, "sizeQuantityId", quantity FROM quote_items WHERE "quoteId" = ${input.quoteId}
      `);
      
      if (!quoteItemsResult.rows || quoteItemsResult.rows.length === 0) {
        throw new Error("No items found in quote");
      }
      
      // Get supplier price for the product
      const firstItem = quoteItemsResult.rows[0] as { id: number; sizeQuantityId: number; quantity: number };
      const supplierPrice = await db.execute(sql`
        SELECT "pricePerUnit", "deliveryDays" FROM supplier_prices 
        WHERE "supplierId" = ${input.supplierId} AND "sizeQuantityId" = ${firstItem.sizeQuantityId}
        LIMIT 1
      `);
      
      const pricePerUnit = (supplierPrice.rows?.[0] as { pricePerUnit?: number })?.pricePerUnit || 100;
      const deliveryDays = (supplierPrice.rows?.[0] as { deliveryDays?: number })?.deliveryDays || 3;
      
      // Assign supplier to all quote items
      for (const item of quoteItemsResult.rows) {
        const typedItem = item as { id: number; sizeQuantityId: number; quantity: number };
        await assignSupplierToQuoteItem(
          typedItem.id,
          input.supplierId,
          Number(pricePerUnit),
          Number(deliveryDays)
        );
      }
      
      // Update quote status to in_production
      await db.execute(sql`
        UPDATE quotes SET status = 'in_production', "updatedAt" = NOW() WHERE id = ${input.quoteId}
      `);
      
      return { success: true };
    }),
});
