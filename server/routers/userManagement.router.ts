/**
 * User Management Router
 * Handles signup requests, user approval, and user status management
 */

import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  getCustomerSignupRequests,
  getCustomerSignupRequestById,
  approveCustomerSignupRequest,
  rejectCustomerSignupRequest,
  getPendingUsers,
  getSuppliersList,
  getCouriersList,
  approveUser,
  rejectUser,
  deactivateUser,
  reactivateUser,
} from "../db";

export const userManagementRouter = router({
  // Customer Signup Requests
  signupRequests: router({
    list: adminProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await getCustomerSignupRequests(input?.status);
      }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getCustomerSignupRequestById(input.id);
      }),

    approve: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await approveCustomerSignupRequest(input.id, ctx.user.id);
      }),

    reject: adminProcedure
      .input(z.object({ id: z.number(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        return await rejectCustomerSignupRequest(input.id, ctx.user.id, input.notes);
      }),
  }),

  // Pending Users (Suppliers/Couriers)
  pendingUsers: adminProcedure
    .input(z.object({ role: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return await getPendingUsers(input?.role);
    }),

  // Suppliers List
  suppliers: adminProcedure
    .query(async () => {
      return await getSuppliersList();
    }),

  // Couriers List
  couriers: adminProcedure
    .query(async () => {
      return await getCouriersList();
    }),

  // User Actions
  approve: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await approveUser(input.userId, ctx.user.id);
    }),

  reject: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await rejectUser(input.userId, ctx.user.id);
    }),

  deactivate: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await deactivateUser(input.userId, ctx.user.id);
    }),

  reactivate: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await reactivateUser(input.userId, ctx.user.id);
    }),
});
