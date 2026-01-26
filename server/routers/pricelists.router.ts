/**
 * Pricelists Router
 * Handles pricelist management and customer pricelist assignments
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getPricelists,
  getPricelistById,
  createPricelist,
  updatePricelist,
  deletePricelist,
  getCustomerDefaultPricelist,
  setCustomerPricelist,
} from "../db";

export const pricelistsRouter = router({
  // Get all active pricelists
  list: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view pricelists");
      }
      return await getPricelists();
    }),

  // Get single pricelist by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view pricelists");
      }
      return await getPricelistById(input.id);
    }),

  // Create new pricelist (admin only)
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      markupPercentage: z.number().min(0).max(1000),
      isDefault: z.boolean().optional(),
      displayOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin') {
        throw new Error("Only admins can create pricelists");
      }
      return await createPricelist(input);
    }),

  // Update pricelist (admin only)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      markupPercentage: z.number().min(0).max(1000).optional(),
      isDefault: z.boolean().optional(),
      displayOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin') {
        throw new Error("Only admins can update pricelists");
      }
      return await updatePricelist(input);
    }),

  // Delete pricelist (admin only)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin') {
        throw new Error("Only admins can delete pricelists");
      }
      return await deletePricelist(input.id);
    }),

  // Get customer's default pricelist
  getCustomerDefault: protectedProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view customer pricelists");
      }
      return await getCustomerDefaultPricelist(input.customerId);
    }),

  // Set customer's pricelist
  setCustomer: protectedProcedure
    .input(z.object({
      customerId: z.number(),
      pricelistId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can set customer pricelists");
      }
      return await setCustomerPricelist(input.customerId, input.pricelistId);
    }),
});
