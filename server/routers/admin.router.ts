/**
 * Admin Router
 * Handles admin-only operations like customer approval and developer logs
 */

import { z } from "zod";
import { desc } from "drizzle-orm";
import { developerLogs } from "../../drizzle/schema";
import { adminProcedure, router } from "../_core/trpc";
import {
  getDb,
  approveCustomer,
  approveCustomerSignupRequest,
  getPendingCustomers,
} from "../db";

export const adminRouter = router({
  approveCustomer: adminProcedure
    .input(z.object({ customerId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await approveCustomer(input.customerId, ctx.user.id);
    }),

  // Approve customer from signup request (landing page)
  approveSignupRequest: adminProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await approveCustomerSignupRequest(input.requestId, ctx.user.id);
    }),

  pendingCustomers: adminProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return await getPendingCustomers(input?.limit || 20);
    }),
    
  getLogs: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select()
      .from(developerLogs)
      .orderBy(desc(developerLogs.createdAt))
      .limit(100);
  }),
});
