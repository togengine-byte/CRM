/**
 * Settings Router
 * Handles system settings like supplier weights and email preferences
 */

import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import {
  getSupplierWeights,
  updateSupplierWeights,
  getEmailOnStatusChangeSetting,
  setEmailOnStatusChangeSetting,
  type EmailOnStatusChange,
} from "../db";

export const settingsRouter = router({
  supplierWeights: router({
    get: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await getSupplierWeights();
      }),

    update: adminProcedure
      .input(z.object({
        price: z.number().min(0).max(100),
        rating: z.number().min(0).max(100),
        deliveryTime: z.number().min(0).max(100),
        reliability: z.number().min(0).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await updateSupplierWeights(input, ctx.user.id);
      }),
  }),

  emailOnStatusChange: router({
    get: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await getEmailOnStatusChangeSetting();
      }),

    update: adminProcedure
      .input(z.object({
        value: z.enum(['ask', 'auto', 'never']),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await setEmailOnStatusChangeSetting(input.value as EmailOnStatusChange, ctx.user.id);
      }),
  }),
});
