/**
 * Courier Router
 * Handles courier job management, pickup, and delivery tracking
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getCourierReadyJobs,
  markJobPickedUp,
  markJobDelivered,
  getCourierStats,
} from "../db";

export const courierRouter = router({
  readyJobs: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      // Couriers and employees can view ready jobs
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee' && ctx.user.role !== 'courier') {
        throw new Error("Only couriers and employees can view ready jobs");
      }
      return await getCourierReadyJobs();
    }),

  markPickedUp: protectedProcedure
    .input(z.object({ quoteItemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee' && ctx.user.role !== 'courier') {
        throw new Error("Only couriers can mark jobs as picked up");
      }
      // quoteItemId is now actually the supplier_jobs id
      return await markJobPickedUp(input.quoteItemId, ctx.user.id);
    }),

  markDelivered: protectedProcedure
    .input(z.object({ quoteItemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee' && ctx.user.role !== 'courier') {
        throw new Error("Only couriers can mark jobs as delivered");
      }
      // quoteItemId is now actually the supplier_jobs id
      return await markJobDelivered(input.quoteItemId, ctx.user.id);
    }),

  stats: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee' && ctx.user.role !== 'courier') {
        throw new Error("Only couriers and employees can view courier stats");
      }
      const courierId = ctx.user.role === 'courier' ? ctx.user.id : undefined;
      return await getCourierStats(courierId);
    }),
});
