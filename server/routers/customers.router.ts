/**
 * Customers Router
 * Handles customer listing, details, approval, and pricelist management
 */

import { z } from "zod";
import { protectedProcedure, adminProcedure, publicProcedure, router } from "../_core/trpc";
import { createCustomerWithQuote, createCustomerWithFilesOnly } from "../createCustomerWithQuote";
import {
  getCustomers,
  getCustomerById,
  approveCustomer,
  rejectCustomer,
  updateCustomer,
  getCustomerPricelists,
  assignPricelistToCustomer,
  removePricelistFromCustomer,
  setCustomerDefaultPricelist,
  getCustomerStats,
} from "../db";

// Schema for file attachments
const attachmentSchema = z.object({
  fileName: z.string(),
  fileUrl: z.string(),
  s3Key: z.string(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
});

export const customersRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['pending_approval', 'active', 'rejected', 'deactivated']).optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view customers");
      }
      return await getCustomers({
        role: 'customer',
        status: input?.status,
        search: input?.search,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view customer details");
      }
      return await getCustomerById(input.id);
    }),

  stats: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view customer stats");
      }
      return await getCustomerStats();
    }),

  approve: adminProcedure
    .input(z.object({ customerId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await approveCustomer(input.customerId, ctx.user.id);
    }),

  reject: adminProcedure
    .input(z.object({
      customerId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await rejectCustomer(input.customerId, ctx.user.id, input.reason);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      companyName: z.string().optional(),
      address: z.string().optional(),
      billingEmail: z.string().email().optional().or(z.literal('')),
      status: z.enum(['pending_approval', 'active', 'rejected', 'deactivated']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can update customers");
      }
      return await updateCustomer(input);
    }),

  getPricelists: protectedProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view customer pricelists");
      }
      return await getCustomerPricelists(input.customerId);
    }),

  assignPricelist: adminProcedure
    .input(z.object({
      customerId: z.number(),
      pricelistId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return await assignPricelistToCustomer(input.customerId, input.pricelistId);
    }),

  removePricelist: adminProcedure
    .input(z.object({
      customerId: z.number(),
      pricelistId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return await removePricelistFromCustomer(input.customerId, input.pricelistId);
    }),

  setDefaultPricelist: adminProcedure
    .input(z.object({
      customerId: z.number(),
      pricelistId: z.number().nullable(),
    }))
    .mutation(async ({ input }) => {
      return await setCustomerDefaultPricelist(input.customerId, input.pricelistId);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(1),
      companyName: z.string().optional(),
      address: z.string().optional(),
      billingEmail: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can create customers");
      }
      const { createCustomer } = await import("../db/customers");
      return await createCustomer(input);
    }),

  // Create customer with quote (with products)
  createWithQuote: publicProcedure
    .input(z.object({
      customerInfo: z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(1),
        companyName: z.string().optional(),
        address: z.string().optional(),
      }),
      quoteItems: z.array(z.object({
        sizeQuantityId: z.number(),
        quantity: z.number().int().positive(),
      })).min(1),
      notes: z.string().optional(),
      attachments: z.array(attachmentSchema).optional(),
    }))
    .mutation(async ({ input }) => {
      return await createCustomerWithQuote(input);
    }),

  // Create quote with files only (no products selected)
  createQuoteWithFilesOnly: publicProcedure
    .input(z.object({
      customerInfo: z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(1),
        companyName: z.string().optional(),
        address: z.string().optional(),
      }),
      description: z.string().min(1, "נדרש תיאור הפרויקט"),
      attachments: z.array(attachmentSchema).min(1, "נדרש להעלות לפחות קובץ אחד"),
    }))
    .mutation(async ({ input }) => {
      return await createCustomerWithFilesOnly(input);
    }),
});
