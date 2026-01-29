/**
 * Analytics Router
 * Handles analytics, reports, and performance metrics
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAnalyticsSummary,
  getProductPerformance,
  getSupplierPerformance,
  getAllCustomersAnalytics,
  getRevenueReport,
} from "../db";

export const analyticsRouter = router({
  summary: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view analytics");
      }
      return await getAnalyticsSummary();
    }),

  productPerformance: protectedProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view product performance");
      }
      return await getProductPerformance(input?.startDate, input?.endDate);
    }),

  supplierPerformance: protectedProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view supplier performance");
      }
      return await getSupplierPerformance(input?.startDate, input?.endDate);
    }),

  customerAnalytics: protectedProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view customer analytics");
      }
      return await getAllCustomersAnalytics(input?.startDate, input?.endDate);
    }),

  revenueReport: protectedProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view revenue reports");
      }
      return await getRevenueReport(input?.startDate, input?.endDate);
    }),
});
