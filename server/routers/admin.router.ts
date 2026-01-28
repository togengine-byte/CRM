/**
 * Admin Router
 * Handles admin-only operations like customer approval and developer logs
 */

import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { developerLogs, users, quotes, quoteItems, quoteAttachments, supplierJobs, baseProducts, productSizes, sizeQuantities, productAddons, pricelists, pricelistItems, customerPricelists, validationProfiles, categories } from "../../drizzle/schema";
import { adminProcedure, router } from "../_core/trpc";
import {
  getDb,
  approveCustomer,
  approveCustomerSignupRequest,
  getPendingCustomers,
} from "../db";

// SECURITY FIX: Developer access code now read from environment variable
const DEVELOPER_ACCESS_CODE = process.env.DEVELOPER_ACCESS_CODE;
if (!DEVELOPER_ACCESS_CODE) {
  console.error("[SECURITY] DEVELOPER_ACCESS_CODE environment variable is not set!");
}

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

  // Verify developer access code
  verifyDeveloperCode: adminProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input }) => {
      return { valid: input.code === DEVELOPER_ACCESS_CODE };
    }),

  // Get data counts for each category
  getDataCounts: adminProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      if (input.code !== DEVELOPER_ACCESS_CODE) {
        throw new Error("Invalid developer access code");
      }
      const db = await getDb();
      if (!db) return null;

      const [quotesCount] = await db.select({ count: sql<number>`count(*)` }).from(quotes);
      const [jobsCount] = await db.select({ count: sql<number>`count(*)` }).from(supplierJobs);
      const [customersCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'customer'));
      const [suppliersCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'supplier'));
      const [productsCount] = await db.select({ count: sql<number>`count(*)` }).from(baseProducts);
      const [pricelistsCount] = await db.select({ count: sql<number>`count(*)` }).from(pricelists);
      const [logsCount] = await db.select({ count: sql<number>`count(*)` }).from(developerLogs);

      return {
        quotes: Number(quotesCount?.count || 0),
        jobs: Number(jobsCount?.count || 0),
        customers: Number(customersCount?.count || 0),
        suppliers: Number(suppliersCount?.count || 0),
        products: Number(productsCount?.count || 0),
        pricelists: Number(pricelistsCount?.count || 0),
        logs: Number(logsCount?.count || 0),
      };
    }),

  // Delete data by category
  deleteDataByCategory: adminProcedure
    .input(z.object({
      code: z.string(),
      category: z.enum(['quotes', 'jobs', 'customers', 'suppliers', 'products', 'pricelists', 'logs', 'all']),
    }))
    .mutation(async ({ input }) => {
      if (input.code !== DEVELOPER_ACCESS_CODE) {
        throw new Error("Invalid developer access code");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let deletedCount = 0;

      switch (input.category) {
        case 'quotes':
          // Delete quote attachments first
          await db.delete(quoteAttachments);
          // Delete quote items
          await db.delete(quoteItems);
          // Delete supplier jobs related to quotes
          await db.delete(supplierJobs);
          // Delete quotes
          const quotesResult = await db.delete(quotes);
          deletedCount = quotesResult.rowCount || 0;
          break;

        case 'jobs':
          const jobsResult = await db.delete(supplierJobs);
          deletedCount = jobsResult.rowCount || 0;
          break;

        case 'customers':
          // Delete customer pricelists first
          await db.delete(customerPricelists);
          const customersResult = await db.delete(users).where(eq(users.role, 'customer'));
          deletedCount = customersResult.rowCount || 0;
          break;

        case 'suppliers':
          const suppliersResult = await db.delete(users).where(eq(users.role, 'supplier'));
          deletedCount = suppliersResult.rowCount || 0;
          break;

        case 'products':
          // Delete pricelist items first
          await db.delete(pricelistItems);
          // Delete size quantities
          await db.delete(sizeQuantities);
          // Delete product sizes
          await db.delete(productSizes);
          // Delete product addons
          await db.delete(productAddons);
          // Delete base products
          const productsResult = await db.delete(baseProducts);
          deletedCount = productsResult.rowCount || 0;
          break;

        case 'pricelists':
          // Delete pricelist items first
          await db.delete(pricelistItems);
          // Delete customer pricelists
          await db.delete(customerPricelists);
          // Delete pricelists
          const pricelistsResult = await db.delete(pricelists);
          deletedCount = pricelistsResult.rowCount || 0;
          break;

        case 'logs':
          const logsResult = await db.delete(developerLogs);
          deletedCount = logsResult.rowCount || 0;
          break;

        case 'all':
          // Delete in correct order to respect foreign keys
          await db.delete(quoteAttachments);
          await db.delete(quoteItems);
          await db.delete(supplierJobs);
          await db.delete(quotes);
          await db.delete(pricelistItems);
          await db.delete(customerPricelists);
          await db.delete(pricelists);
          await db.delete(sizeQuantities);
          await db.delete(productSizes);
          await db.delete(productAddons);
          await db.delete(baseProducts);
          await db.delete(developerLogs);
          // Don't delete admin users
          await db.delete(users).where(sql`${users.role} != 'admin'`);
          deletedCount = -1; // Indicates all data deleted
          break;
      }

      return { success: true, deletedCount, category: input.category };
    }),
});
