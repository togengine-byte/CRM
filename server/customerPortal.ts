import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { quotes, quoteItems, quoteAttachments, sizeQuantities, productSizes, baseProducts, activityLog, supplierJobs } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Customer Portal Router
 * Endpoints for customers to view and manage their quotes
 * Customers can only access their own data (Anonymous Brokerage principle)
 */

export const customerPortalRouter = router({
  // ==================== STATS ====================
  stats: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      // Admin and employees can also view customer portal for testing/development
      if (ctx.user.role !== "customer" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only customers can access customer portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all quotes for this customer (or all quotes for admin/employee)
      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";
      const allQuotes = isAdminOrEmployee
        ? await db.select({ status: quotes.status }).from(quotes)
        : await db.select({ status: quotes.status }).from(quotes).where(eq(quotes.customerId, ctx.user.id));

      const total = allQuotes.length;
      const pending = allQuotes.filter(q => q.status === "sent").length;
      const approved = allQuotes.filter(q => q.status === "approved").length;
      const inProduction = allQuotes.filter(q => q.status === "in_production").length;
      const ready = allQuotes.filter(q => q.status === "ready").length;
      const rejected = allQuotes.filter(q => q.status === "rejected").length;

      return {
        total,
        pending,
        approved,
        inProduction,
        ready,
        rejected,
      };
    }),

  // ==================== MY QUOTES ====================
  myQuotes: protectedProcedure
    .input(
      z.object({
        status: z.enum(["draft", "sent", "approved", "rejected", "superseded", "in_production", "ready"]).optional(),
        search: z.string().optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "customer" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only customers can access customer portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";

      // Get quotes for this customer only (or all quotes for admin/employee)
      let allQuotes = isAdminOrEmployee
        ? await db
            .select({
              id: quotes.id,
              status: quotes.status,
              version: quotes.version,
              finalValue: quotes.finalValue,
              createdAt: quotes.createdAt,
              parentQuoteId: quotes.parentQuoteId,
            })
            .from(quotes)
            .orderBy(desc(quotes.createdAt))
        : await db
            .select({
              id: quotes.id,
              status: quotes.status,
              version: quotes.version,
              finalValue: quotes.finalValue,
              createdAt: quotes.createdAt,
              parentQuoteId: quotes.parentQuoteId,
            })
            .from(quotes)
            .where(eq(quotes.customerId, ctx.user.id))
            .orderBy(desc(quotes.createdAt));

      // Filter by status if provided
      if (input?.status) {
        allQuotes = allQuotes.filter(q => q.status === input.status);
      } else {
        // By default, hide superseded quotes (show only latest versions)
        allQuotes = allQuotes.filter(q => q.status !== "superseded");
      }

      // Filter by search (quote ID)
      if (input?.search) {
        const searchNum = parseInt(input.search);
        if (!isNaN(searchNum)) {
          allQuotes = allQuotes.filter(q => q.id === searchNum);
        }
      }

      return allQuotes;
    }),

  // ==================== GET QUOTE DETAILS ====================
  getQuoteDetails: protectedProcedure
    .input(z.object({ quoteId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "customer" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only customers can access customer portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";

      // Get quote - verify it belongs to this customer (or any quote for admin/employee)
      const quoteResult = isAdminOrEmployee
        ? await db.select().from(quotes).where(eq(quotes.id, input.quoteId))
        : await db.select().from(quotes).where(and(eq(quotes.id, input.quoteId), eq(quotes.customerId, ctx.user.id)));

      if (quoteResult.length === 0) {
        throw new Error("Quote not found");
      }

      const quote = quoteResult[0];

      // Get quote items with product info (but NOT supplier info - Anonymous Brokerage)
      const items = await db
        .select({
          id: quoteItems.id,
          sizeQuantityId: quoteItems.sizeQuantityId,
          quantity: quoteItems.quantity,
          priceAtTimeOfQuote: quoteItems.priceAtTimeOfQuote,
          isUpsell: quoteItems.isUpsell,
          productName: baseProducts.name,
          sizeName: productSizes.name,
          dimensions: productSizes.dimensions,
          sizeQuantity: sizeQuantities.quantity,
        })
        .from(quoteItems)
        .leftJoin(sizeQuantities, eq(quoteItems.sizeQuantityId, sizeQuantities.id))
        .leftJoin(productSizes, eq(sizeQuantities.sizeId, productSizes.id))
        .leftJoin(baseProducts, eq(productSizes.productId, baseProducts.id))
        .where(eq(quoteItems.quoteId, input.quoteId));

      // Get attachments
      const attachments = await db
        .select({
          id: quoteAttachments.id,
          fileName: quoteAttachments.fileName,
          fileUrl: quoteAttachments.fileUrl,
          uploadedAt: quoteAttachments.uploadedAt,
        })
        .from(quoteAttachments)
        .where(eq(quoteAttachments.quoteId, input.quoteId));

      return {
        ...quote,
        items,
        attachments,
      };
    }),

  // ==================== APPROVE QUOTE ====================
  approveQuote: protectedProcedure
    .input(z.object({ quoteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      
      // Allow both customers and admins to approve quotes
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "employee";
      const isCustomer = ctx.user.role === "customer";
      
      if (!isAdmin && !isCustomer) {
        throw new Error("Only customers or admins can approve quotes");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // For customers, verify quote belongs to them. For admins, just get the quote.
      const quoteResult = await db
        .select()
        .from(quotes)
        .where(
          isCustomer
            ? and(
                eq(quotes.id, input.quoteId),
                eq(quotes.customerId, ctx.user.id)
              )
            : eq(quotes.id, input.quoteId)
        );

      if (quoteResult.length === 0) {
        throw new Error("Quote not found");
      }

      const quote = quoteResult[0];

      if (quote.status !== "sent") {
        throw new Error("Only quotes with 'sent' status can be approved");
      }

      // Get quote items to check if suppliers are assigned
      const items = await db
        .select({
          id: quoteItems.id,
          sizeQuantityId: quoteItems.sizeQuantityId,
          quantity: quoteItems.quantity,
          supplierId: quoteItems.supplierId,
          supplierCost: quoteItems.supplierCost,
          deliveryDays: quoteItems.deliveryDays,
        })
        .from(quoteItems)
        .where(eq(quoteItems.quoteId, input.quoteId));

      // Check if all items have suppliers assigned AND autoProduction is enabled
      const allItemsHaveSuppliers = items.every(item => item.supplierId !== null);
      const shouldAutoProduction = quote.autoProduction && allItemsHaveSuppliers;

      if (shouldAutoProduction) {
        // All items have suppliers - move to in_production and create supplier jobs
        await db
          .update(quotes)
          .set({ 
            status: "in_production",
            updatedAt: new Date(),
          })
          .where(eq(quotes.id, input.quoteId));

        // Create supplier jobs for each item
        for (const item of items) {
          if (item.supplierId) {
            await db.insert(supplierJobs).values({
              quoteId: input.quoteId,
              quoteItemId: item.id,
              supplierId: item.supplierId,
              sizeQuantityId: item.sizeQuantityId,
              quantity: item.quantity,
              pricePerUnit: item.supplierCost?.toString() || "0",
              promisedDeliveryDays: item.deliveryDays || 3,
              status: "in_progress",
            });
          }
        }

        // Log activity
        await db.insert(activityLog).values({
          userId: ctx.user.id,
          actionType: "quote_approved_auto_production",
          entityType: "quote",
          entityId: input.quoteId,
          details: { 
            approvedBy: "customer", 
            customerId: ctx.user.id,
            autoMovedToProduction: true,
            supplierJobsCreated: items.length,
          },
          createdAt: new Date(),
        });

        return { success: true, status: "in_production", autoProduction: true };
      } else {
        // Some items don't have suppliers - mark as approved (pending supplier selection)
        await db
          .update(quotes)
          .set({ 
            status: "approved",
            updatedAt: new Date(),
          })
          .where(eq(quotes.id, input.quoteId));

        // Log activity
        await db.insert(activityLog).values({
          userId: ctx.user.id,
          actionType: "quote_approved_pending_supplier",
          entityType: "quote",
          entityId: input.quoteId,
          details: { 
            approvedBy: "customer", 
            customerId: ctx.user.id,
            pendingSupplierSelection: true,
            itemsWithoutSupplier: items.filter(i => !i.supplierId).length,
          },
          createdAt: new Date(),
        });

        return { success: true, status: "approved", pendingSupplierSelection: true };
      }
    }),

  // ==================== REJECT QUOTE ====================
  rejectQuote: protectedProcedure
    .input(z.object({ 
      quoteId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      
      // Allow both customers and admins to reject quotes
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "employee";
      const isCustomer = ctx.user.role === "customer";
      
      if (!isAdmin && !isCustomer) {
        throw new Error("Only customers or admins can reject quotes");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // For customers, verify quote belongs to them. For admins, just get the quote.
      const quoteResult = await db
        .select()
        .from(quotes)
        .where(
          isCustomer
            ? and(
                eq(quotes.id, input.quoteId),
                eq(quotes.customerId, ctx.user.id)
              )
            : eq(quotes.id, input.quoteId)
        );

      if (quoteResult.length === 0) {
        throw new Error("Quote not found");
      }

      const quote = quoteResult[0];

      if (quote.status !== "sent") {
        throw new Error("Only quotes with 'sent' status can be rejected");
      }

      // Update quote status
      await db
        .update(quotes)
        .set({ 
          status: "rejected",
          rejectionReason: input.reason || null,
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, input.quoteId));

      // Log activity
      await db.insert(activityLog).values({
        userId: ctx.user.id,
        actionType: "quote_rejected",
        entityType: "quote",
        entityId: input.quoteId,
        details: { 
          rejectedBy: "customer", 
          customerId: ctx.user.id,
          reason: input.reason || null,
        },
        createdAt: new Date(),
      });

      return { success: true };
    }),

  // ==================== GET QUOTE HISTORY ====================
  getQuoteHistory: protectedProcedure
    .input(z.object({ quoteId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "customer") {
        throw new Error("Only customers can access customer portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the quote first to verify ownership
      const quoteResult = await db
        .select()
        .from(quotes)
        .where(
          and(
            eq(quotes.id, input.quoteId),
            eq(quotes.customerId, ctx.user.id)
          )
        );

      if (quoteResult.length === 0) {
        throw new Error("Quote not found");
      }

      const quote = quoteResult[0];

      // Find the root quote (the one without a parent)
      let rootQuoteId = quote.id;
      if (quote.parentQuoteId) {
        // Find the root by traversing up
        let currentQuote = quote;
        while (currentQuote.parentQuoteId) {
          const parentResult = await db
            .select()
            .from(quotes)
            .where(eq(quotes.id, currentQuote.parentQuoteId));
          if (parentResult.length === 0) break;
          currentQuote = parentResult[0];
          rootQuoteId = currentQuote.id;
        }
      }

      // Get all versions of this quote chain
      const allVersions = await db
        .select({
          id: quotes.id,
          status: quotes.status,
          version: quotes.version,
          finalValue: quotes.finalValue,
          createdAt: quotes.createdAt,
        })
        .from(quotes)
        .where(
          and(
            eq(quotes.customerId, ctx.user.id),
            sql`(${quotes.id} = ${rootQuoteId} OR ${quotes.parentQuoteId} = ${rootQuoteId})`
          )
        )
        .orderBy(desc(quotes.version));

      return allVersions;
    }),
});
