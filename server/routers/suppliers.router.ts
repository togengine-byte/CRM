/**
 * Suppliers Router
 * Handles supplier management, prices, recommendations, and job assignments
 */

import { z } from "zod";
import { sql } from "drizzle-orm";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getTopSupplierRecommendations, getEnhancedSupplierRecommendations } from '../supplierRecommendations';
import { getRecommendationsByCategory, createSupplierJobsForCategory } from '../supplierRecommendationsByCategory';
import {
  getDb,
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  getSupplierPrices,
  upsertSupplierPrice,
  deleteSupplierPrice,
  getSupplierOpenJobs,
  getSupplierRecommendations,
  getSupplierStats,
  assignSupplierToQuoteItem,
  getSupplierJobsHistory,
  updateSupplierJobData,
  getSupplierScoreDetails,
} from "../db";

export const suppliersRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['pending_approval', 'active', 'rejected', 'deactivated']).optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view suppliers");
      }
      return await getSuppliers(input);
    }),

  stats: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view supplier stats");
      }
      return await getSupplierStats();
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view supplier details");
      }
      return await getSupplierById(input.id);
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email"),
      phone: z.string().optional(),
      companyName: z.string().optional(),
      address: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await createSupplier(input);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      companyName: z.string().optional(),
      address: z.string().optional(),
      status: z.enum(['pending_approval', 'active', 'rejected', 'deactivated']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can update suppliers");
      }
      return await updateSupplier(input);
    }),

  prices: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view supplier prices");
      }
      return await getSupplierPrices(input.supplierId);
    }),

  updatePrice: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
      sizeQuantityId: z.number(),
      price: z.number().positive("Price must be positive"),
      deliveryDays: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can update supplier prices");
      }
      return await upsertSupplierPrice(input);
    }),

  deletePrice: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
      sizeQuantityId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can delete supplier prices");
      }
      return await deleteSupplierPrice(input.supplierId, input.sizeQuantityId);
    }),

  openJobs: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      // Suppliers can view their own jobs, employees can view all
      if (ctx.user.role === 'supplier' && ctx.user.id !== input.supplierId) {
        throw new Error("Suppliers can only view their own jobs");
      }
      return await getSupplierOpenJobs(input.supplierId);
    }),

  recommendations: protectedProcedure
    .input(z.object({
      sizeQuantityId: z.number(),
      quantity: z.number().int().positive(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view supplier recommendations");
      }
      return await getSupplierRecommendations(input.sizeQuantityId, input.quantity);
    }),

  // Enhanced recommendations based on supplier_jobs history (reliability, speed, rating)
  enhancedRecommendations: protectedProcedure
    .input(z.object({
      productId: z.number().optional(),
      limit: z.number().int().positive().default(3),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view supplier recommendations");
      }
      return await getTopSupplierRecommendations(input.productId, input.limit);
    }),

  // Get all supplier recommendations with full scoring
  allRecommendations: protectedProcedure
    .input(z.object({
      productId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view supplier recommendations");
      }
      return await getEnhancedSupplierRecommendations(input.productId);
    }),

  assignToQuoteItem: protectedProcedure
    .input(z.object({
      quoteItemId: z.number(),
      supplierId: z.number(),
      supplierCost: z.number().positive(),
      deliveryDays: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can assign suppliers");
      }
      return await assignSupplierToQuoteItem(
        input.quoteItemId,
        input.supplierId,
        input.supplierCost,
        input.deliveryDays
      );
    }),

  // Get supplier recommendations grouped by category for a quote
  recommendationsByCategory: protectedProcedure
    .input(z.object({
      quoteItems: z.array(z.object({
        quoteItemId: z.number(),
        sizeQuantityId: z.number(),
        quantity: z.number(),
        productName: z.string().optional(),
      })),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view supplier recommendations");
      }
      return await getRecommendationsByCategory(input.quoteItems);
    }),

  // Assign supplier to category items and create jobs
  assignToCategory: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      supplierId: z.number(),
      items: z.array(z.object({
        quoteItemId: z.number(),
        sizeQuantityId: z.number(),
        pricePerUnit: z.number(),
        deliveryDays: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can assign suppliers");
      }
      return await createSupplierJobsForCategory(
        input.quoteId,
        input.supplierId,
        input.items
      );
    }),

  // Get supplier jobs history (for data view)
  jobsHistory: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view supplier job history");
      }
      return await getSupplierJobsHistory(input.supplierId);
    }),

  // Update supplier job data (admin only)
  updateJobData: adminProcedure
    .input(z.object({
      jobId: z.number(),
      supplierRating: z.number().min(1).max(5).optional(),
      courierConfirmedReady: z.boolean().optional(),
      promisedDeliveryDays: z.number().int().positive().optional(),
      supplierReadyAt: z.string().datetime().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      const { jobId, supplierReadyAt, ...data } = input;
      return await updateSupplierJobData(
        jobId,
        {
          ...data,
          supplierReadyAt: supplierReadyAt ? new Date(supplierReadyAt) : (supplierReadyAt === null ? null : undefined),
        },
        ctx.user.id
      );
    }),

  // Get supplier score details
  scoreDetails: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view supplier scores");
      }
      return await getSupplierScoreDetails(input.supplierId);
    }),

  // Cancel all supplier jobs for a quote (before suppliers accept)
  cancelJobsByQuote: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("רק עובדים יכולים לבטל ספק");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all active jobs for this quote
      const jobsResult = await db.execute(sql`
        SELECT id, "isAccepted", "isCancelled"
        FROM supplier_jobs 
        WHERE "quoteId" = ${input.quoteId} AND "isCancelled" = false
      `);

      if (!jobsResult.rows || jobsResult.rows.length === 0) {
        throw new Error("לא נמצאו עבודות פעילות להצעה זו");
      }

      // Check if any supplier has accepted
      const acceptedJobs = (jobsResult.rows as Array<{ isAccepted: boolean }>).filter(j => j.isAccepted);
      if (acceptedJobs.length > 0) {
        throw new Error("לא ניתן לבטל ספק לאחר שהוא אישר את העבודה");
      }

      // Cancel all jobs
      await db.execute(sql`
        UPDATE supplier_jobs
        SET "isCancelled" = true,
            "cancelledAt" = NOW(),
            "cancelledReason" = ${input.reason || 'בוטל על ידי המשרד'},
            status = 'cancelled',
            "updatedAt" = NOW()
        WHERE "quoteId" = ${input.quoteId} AND "isCancelled" = false
      `);

      // Remove suppliers from quote items
      await db.execute(sql`
        UPDATE quote_items
        SET "supplierId" = NULL,
            "supplierCost" = NULL,
            "deliveryDays" = NULL
        WHERE "quoteId" = ${input.quoteId}
      `);

      // Revert quote to approved status
      await db.execute(sql`
        UPDATE quotes
        SET status = 'approved',
            "updatedAt" = NOW()
        WHERE id = ${input.quoteId}
      `);

      // Log the cancellation
      await db.execute(sql`
        INSERT INTO activity_log ("userId", "actionType", details, "createdAt")
        VALUES (${ctx.user.id}, 'SUPPLIER_CANCELLED', ${JSON.stringify({
          quoteId: input.quoteId,
          reason: input.reason || 'בוטל על ידי המשרד'
        })}, NOW())
      `);

      return { 
        success: true, 
        message: "ספק בוטל בהצלחה - ההצעה חזרה לממתין לספק"
      };
    }),

  // Cancel supplier job (before supplier accepts)
  cancelJob: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("רק עובדים יכולים לבטל ספק");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get job details
      const jobResult = await db.execute(sql`
        SELECT id, "quoteId", "quoteItemId", "supplierId", status, "isAccepted", "isCancelled"
        FROM supplier_jobs WHERE id = ${input.jobId}
      `);

      if (!jobResult.rows || jobResult.rows.length === 0) {
        throw new Error("עבודה לא נמצאה");
      }

      const job = jobResult.rows[0] as {
        id: number;
        quoteId: number;
        quoteItemId: number;
        supplierId: number;
        status: string;
        isAccepted: boolean;
        isCancelled: boolean;
      };

      // Can only cancel if supplier hasn't accepted yet
      if (job.isAccepted) {
        throw new Error("לא ניתן לבטל ספק לאחר שהוא אישר את העבודה");
      }

      if (job.isCancelled) {
        throw new Error("עבודה זו כבר בוטלה");
      }

      // Cancel the job
      await db.execute(sql`
        UPDATE supplier_jobs
        SET "isCancelled" = true,
            "cancelledAt" = NOW(),
            "cancelledReason" = ${input.reason || 'בוטל על ידי המשרד'},
            status = 'cancelled',
            "updatedAt" = NOW()
        WHERE id = ${input.jobId}
      `);

      // Remove supplier from quote item
      await db.execute(sql`
        UPDATE quote_items
        SET "supplierId" = NULL,
            "supplierCost" = NULL,
            "deliveryDays" = NULL
        WHERE id = ${job.quoteItemId}
      `);

      // Check if all items in quote have no supplier - if so, revert quote status
      const unassignedResult = await db.execute(sql`
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN "supplierId" IS NULL THEN 1 END) as unassigned
        FROM quote_items
        WHERE "quoteId" = ${job.quoteId}
      `);

      const counts = unassignedResult.rows[0] as { total: string; unassigned: string };
      const allUnassigned = parseInt(counts.total) === parseInt(counts.unassigned);

      if (allUnassigned) {
        // Revert quote to approved status (waiting for supplier assignment)
        await db.execute(sql`
          UPDATE quotes
          SET status = 'approved',
              "updatedAt" = NOW()
          WHERE id = ${job.quoteId}
        `);
      }

      // Log the cancellation
      await db.execute(sql`
        INSERT INTO activity_log ("userId", "actionType", details, "createdAt")
        VALUES (${ctx.user.id}, 'SUPPLIER_CANCELLED', ${JSON.stringify({
          jobId: input.jobId,
          quoteId: job.quoteId,
          supplierId: job.supplierId,
          reason: input.reason || 'בוטל על ידי המשרד'
        })}, NOW())
      `);

      return { 
        success: true, 
        message: "ספק בוטל בהצלחה",
        quoteReverted: allUnassigned
      };
    }),
});
