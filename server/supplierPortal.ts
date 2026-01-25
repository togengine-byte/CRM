import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { supplierPrices, productSizes, sizeQuantities, baseProducts, supplierJobs, quoteAttachments, quotes, quoteItems, users } from "../drizzle/schema";
import { eq, and, desc, sql, isNull, or } from "drizzle-orm";

/**
 * Supplier Portal Router
 * Endpoints for suppliers to manage their prices by size+quantity combinations
 * Only suppliers can access their own data
 */

export const supplierPortalRouter = router({
  // ==================== DASHBOARD ====================
  dashboard: protectedProcedure
    .input(z.object({ supplierId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      // Admin and employees can also view supplier portal for testing/development
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get supplier's price listings
      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";
      const targetSupplierId = isAdminOrEmployee && input?.supplierId ? input.supplierId : ctx.user.id;
      const prices = await db.select().from(supplierPrices).where(eq(supplierPrices.supplierId, targetSupplierId));

      if (prices.length === 0) {
        return {
          totalProducts: 0,
          activeListings: 0,
          priceRange: { min: 0, max: 0 },
          lastUpdated: null,
        };
      }

      const priceValues = prices.map((p) => Number(p.pricePerUnit));
      const min = priceValues.length > 0 ? Math.min(...priceValues) : 0;
      const max = priceValues.length > 0 ? Math.max(...priceValues) : 0;
      const lastUpdated = prices.length > 0 ? prices[0].updatedAt : null;

      return {
        totalProducts: prices.length,
        activeListings: prices.length,
        priceRange: { min, max },
        lastUpdated,
      };
    }),

  // ==================== PRICES LIST ====================
  prices: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(20),
        search: z.string().optional(),
        supplierId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const offset = (input.page - 1) * input.limit;
      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";
      const targetSupplierId = isAdminOrEmployee && input.supplierId ? input.supplierId : ctx.user.id;

      // Get all prices with size+quantity info for target supplier
      const allPrices = await db
        .select({
          id: supplierPrices.id,
          price: supplierPrices.pricePerUnit,
          deliveryDays: supplierPrices.deliveryDays,
          updatedAt: supplierPrices.updatedAt,
          sizeQuantityId: supplierPrices.sizeQuantityId,
          quantity: sizeQuantities.quantity,
          sizeName: productSizes.name,
          dimensions: productSizes.dimensions,
          productName: baseProducts.name,
          productId: baseProducts.id,
        })
        .from(supplierPrices)
        .innerJoin(
          sizeQuantities,
          eq(supplierPrices.sizeQuantityId, sizeQuantities.id)
        )
        .innerJoin(
          productSizes,
          eq(sizeQuantities.sizeId, productSizes.id)
        )
        .innerJoin(
          baseProducts,
          eq(productSizes.productId, baseProducts.id)
        )
        .where(eq(supplierPrices.supplierId, targetSupplierId))
        .orderBy(desc(supplierPrices.updatedAt));

      // Filter by search if provided
      let filteredPrices = allPrices;
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        filteredPrices = allPrices.filter(
          (p) =>
            p.productName?.toLowerCase().includes(searchLower) ||
            p.sizeName?.toLowerCase().includes(searchLower)
        );
      }

      const total = filteredPrices.length;
      const prices = filteredPrices.slice(offset, offset + input.limit);

      return {
        data: prices,
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  // ==================== GET AVAILABLE SIZE QUANTITIES ====================
  availableSizeQuantities: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        supplierId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";
      const targetSupplierId = isAdminOrEmployee && input.supplierId ? input.supplierId : ctx.user.id;

      // Get all size quantities with product info
      const allSizeQuantities = await db
        .select({
          id: sizeQuantities.id,
          quantity: sizeQuantities.quantity,
          price: sizeQuantities.price,
          sizeName: productSizes.name,
          dimensions: productSizes.dimensions,
          sizeId: productSizes.id,
          productName: baseProducts.name,
          productId: baseProducts.id,
        })
        .from(sizeQuantities)
        .innerJoin(
          productSizes,
          eq(sizeQuantities.sizeId, productSizes.id)
        )
        .innerJoin(
          baseProducts,
          eq(productSizes.productId, baseProducts.id)
        )
        .where(eq(sizeQuantities.isActive, true));

      // Filter by search if provided
      let result = allSizeQuantities;
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        result = allSizeQuantities.filter((sq) =>
          sq.productName?.toLowerCase().includes(searchLower) ||
          sq.sizeName?.toLowerCase().includes(searchLower)
        );
      }

      // Get target supplier's existing prices
      const existingPrices = await db.select({ sizeQuantityId: supplierPrices.sizeQuantityId }).from(supplierPrices).where(eq(supplierPrices.supplierId, targetSupplierId));

      const existingSizeQuantityIds = new Set(
        existingPrices.map((p) => p.sizeQuantityId)
      );

      // Add hasPrice flag
      const finalResult = result.map((sq) => ({
        ...sq,
        hasPrice: existingSizeQuantityIds.has(sq.id),
      }));

      return finalResult;
    }),

  // ==================== CREATE PRICE ====================
  createPrice: protectedProcedure
    .input(
      z.object({
        sizeQuantityId: z.number(),
        price: z.number().positive("Price must be positive"),
        deliveryDays: z.number().int().positive("Delivery days must be positive"),
        supplierId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";
      const targetSupplierId = isAdminOrEmployee && input.supplierId ? input.supplierId : ctx.user.id;

      // Check if price already exists
      const existing = await db
        .select()
        .from(supplierPrices)
        .where(
          and(
            eq(supplierPrices.supplierId, targetSupplierId),
            eq(supplierPrices.sizeQuantityId, input.sizeQuantityId)
          )
        );

      if (existing.length > 0) {
        throw new Error("Price already exists for this size+quantity");
      }

      // Insert new price
      await db.insert(supplierPrices).values({
        supplierId: targetSupplierId,
        sizeQuantityId: input.sizeQuantityId,
        pricePerUnit: input.price.toString(),
        deliveryDays: input.deliveryDays,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true, id: input.sizeQuantityId };
    }),

  // ==================== UPDATE PRICE ====================
  updatePrice: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        price: z.number().positive("Price must be positive").optional(),
        deliveryDays: z.number().int().positive("Delivery days must be positive").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";

      // Verify ownership (admin can update any price)
      const price = await db
        .select()
        .from(supplierPrices)
        .where(eq(supplierPrices.id, input.id));

      if (price.length === 0) {
        throw new Error("Price not found");
      }

      if (!isAdminOrEmployee && price[0].supplierId !== ctx.user.id) {
        throw new Error("You can only update your own prices");
      }

      // Update price - TYPE SAFETY FIX: Using proper type instead of 'any'
      const updateData: { updatedAt: Date; pricePerUnit?: string; deliveryDays?: number } = { 
        updatedAt: new Date() 
      };
      if (input.price !== undefined) updateData.pricePerUnit = input.price.toString();
      if (input.deliveryDays !== undefined) updateData.deliveryDays = input.deliveryDays;

      await db
        .update(supplierPrices)
        .set(updateData)
        .where(eq(supplierPrices.id, input.id));

      return { success: true };
    }),

  // ==================== DELETE PRICE ====================
  deletePrice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";

      // Verify ownership (admin can delete any price)
      const price = await db
        .select()
        .from(supplierPrices)
        .where(eq(supplierPrices.id, input.id));

      if (price.length === 0) {
        throw new Error("Price not found");
      }

      if (!isAdminOrEmployee && price[0].supplierId !== ctx.user.id) {
        throw new Error("You can only delete your own prices");
      }

      // Delete price
      await db
        .delete(supplierPrices)
        .where(eq(supplierPrices.id, input.id));

      return { success: true };
    }),

  // ==================== ENHANCED DASHBOARD ====================
  enhancedDashboard: protectedProcedure
    .input(z.object({ supplierId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";
      const targetSupplierId = isAdminOrEmployee && input?.supplierId ? input.supplierId : ctx.user.id;

      // Get supplier info
      const supplierResult = await db.execute(sql`
        SELECT name, "companyName", email, phone FROM users WHERE id = ${targetSupplierId}
      `);
      const supplierInfo = supplierResult.rows[0] as any || {};

      // Get job counts by status
      const jobCountsResult = await db.execute(sql`
        SELECT 
          COUNT(CASE WHEN status = 'pending' AND "isCancelled" = false THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'accepted' AND "isCancelled" = false THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'ready' AND "isCancelled" = false THEN 1 END) as ready_for_pickup,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed,
          COUNT(CASE WHEN "isCancelled" = true THEN 1 END) as cancelled
        FROM supplier_jobs
        WHERE "supplierId" = ${targetSupplierId}
      `);
      const jobCounts = jobCountsResult.rows[0] as any || {};

      // Get average rating
      const ratingResult = await db.execute(sql`
        SELECT AVG("supplierRating") as avg_rating, COUNT("supplierRating") as total_ratings
        FROM supplier_jobs
        WHERE "supplierId" = ${targetSupplierId} AND "supplierRating" IS NOT NULL
      `);
      const ratingData = ratingResult.rows[0] as any || {};

      // Get price listings count
      const pricesCount = await db.select().from(supplierPrices).where(eq(supplierPrices.supplierId, targetSupplierId));

      return {
        supplier: {
          id: targetSupplierId,
          name: supplierInfo.name || 'ספק',
          companyName: supplierInfo.companyName || '',
          email: supplierInfo.email || '',
          phone: supplierInfo.phone || '',
        },
        stats: {
          pendingOrders: parseInt(jobCounts.pending_orders) || 0,
          inProgress: parseInt(jobCounts.in_progress) || 0,
          readyForPickup: parseInt(jobCounts.ready_for_pickup) || 0,
          completed: parseInt(jobCounts.completed) || 0,
          cancelled: parseInt(jobCounts.cancelled) || 0,
        },
        rating: {
          average: ratingData.avg_rating ? parseFloat(ratingData.avg_rating).toFixed(1) : null,
          totalRatings: parseInt(ratingData.total_ratings) || 0,
        },
        priceListings: pricesCount.length,
      };
    }),

  // ==================== PENDING ORDERS (הזמנות חדשות) ====================
  pendingOrders: protectedProcedure
    .input(z.object({ supplierId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";
      const targetSupplierId = isAdminOrEmployee && input?.supplierId ? input.supplierId : ctx.user.id;

      // Get pending orders (not yet accepted by supplier)
      const result = await db.execute(sql`
        SELECT 
          sj.id,
          sj."quoteId",
          sj."quoteItemId",
          sj.quantity,
          sj."pricePerUnit",
          sj."promisedDeliveryDays",
          sj."createdAt",
          sj."isCancelled",
          sj."cancelledReason",
          customer.name as "customerName",
          customer."companyName" as "customerCompany",
          ps.name as "sizeName",
          ps.dimensions as "dimensions",
          bp.name as "productName",
          bp.id as "productId"
        FROM supplier_jobs sj
        LEFT JOIN users customer ON sj."customerId" = customer.id
        LEFT JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
        LEFT JOIN product_sizes ps ON sq.size_id = ps.id
        LEFT JOIN base_products bp ON ps.product_id = bp.id
        WHERE sj."supplierId" = ${targetSupplierId}
          AND sj.status = 'pending'
        ORDER BY sj."createdAt" DESC
      `);

      return result.rows.map((row: any) => ({
        id: row.id,
        quoteId: row.quoteId,
        quoteItemId: row.quoteItemId,
        quantity: row.quantity,
        pricePerUnit: parseFloat(row.pricePerUnit),
        promisedDeliveryDays: row.promisedDeliveryDays,
        createdAt: row.createdAt,
        isCancelled: row.isCancelled,
        cancelledReason: row.cancelledReason,
        customerName: row.customerName || 'לקוח לא מזוהה',
        customerCompany: row.customerCompany,
        productName: row.productName || 'מוצר',
        sizeName: row.sizeName,
        dimensions: row.dimensions,
        productId: row.productId,
      }));
    }),

  // ==================== ACTIVE JOBS (עבודות בביצוע) ====================
  activeJobs: protectedProcedure
    .input(z.object({ supplierId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";
      const targetSupplierId = isAdminOrEmployee && input?.supplierId ? input.supplierId : ctx.user.id;

      // Get accepted jobs (in progress)
      const result = await db.execute(sql`
        SELECT 
          sj.id,
          sj."quoteId",
          sj."quoteItemId",
          sj.quantity,
          sj."pricePerUnit",
          sj."promisedDeliveryDays",
          sj."supplierAcceptedAt",
          sj."createdAt",
          customer.name as "customerName",
          customer."companyName" as "customerCompany",
          ps.name as "sizeName",
          ps.dimensions as "dimensions",
          bp.name as "productName",
          bp.id as "productId"
        FROM supplier_jobs sj
        LEFT JOIN users customer ON sj."customerId" = customer.id
        LEFT JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
        LEFT JOIN product_sizes ps ON sq.size_id = ps.id
        LEFT JOIN base_products bp ON ps.product_id = bp.id
        WHERE sj."supplierId" = ${targetSupplierId}
          AND sj.status = 'accepted'
          AND sj."isCancelled" = false
        ORDER BY sj."supplierAcceptedAt" DESC
      `);

      // Get attachments for each job
      const jobsWithAttachments = await Promise.all(
        result.rows.map(async (row: any) => {
          // Get attachments for this quote
          const attachments = await db.execute(sql`
            SELECT id, "fileName", "fileUrl", "uploadedAt"
            FROM quote_attachments
            WHERE "quoteId" = ${row.quoteId}
          `);

          return {
            id: row.id,
            quoteId: row.quoteId,
            quoteItemId: row.quoteItemId,
            quantity: row.quantity,
            pricePerUnit: parseFloat(row.pricePerUnit),
            promisedDeliveryDays: row.promisedDeliveryDays,
            acceptedAt: row.supplierAcceptedAt,
            createdAt: row.createdAt,
            customerName: row.customerName || 'לקוח לא מזוהה',
            customerCompany: row.customerCompany,
            productName: row.productName || 'מוצר',
            sizeName: row.sizeName,
            dimensions: row.dimensions,
            productId: row.productId,
            attachments: attachments.rows.map((att: any) => ({
              id: att.id,
              fileName: att.fileName,
              fileUrl: att.fileUrl,
              uploadedAt: att.uploadedAt,
            })),
          };
        })
      );

      return jobsWithAttachments;
    }),

  // ==================== ACCEPT JOB (אישור עבודה) ====================
  acceptJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can accept jobs");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";

      // Verify job exists and belongs to supplier (or admin)
      const jobResult = await db.execute(sql`
        SELECT id, "supplierId", status, "isCancelled" FROM supplier_jobs WHERE id = ${input.jobId}
      `);

      if (!jobResult.rows || jobResult.rows.length === 0) {
        throw new Error("עבודה לא נמצאה");
      }

      const job = jobResult.rows[0] as any;

      if (!isAdminOrEmployee && job.supplierId !== ctx.user.id) {
        throw new Error("אין לך הרשאה לאשר עבודה זו");
      }

      if (job.isCancelled) {
        throw new Error("לא ניתן לאשר עבודה מבוטלת");
      }

      if (job.status !== 'pending') {
        throw new Error("עבודה זו כבר אושרה או בסטטוס אחר");
      }

      // Accept the job
      await db.execute(sql`
        UPDATE supplier_jobs
        SET status = 'accepted',
            "supplierAccepted" = true,
            "supplierAcceptedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE id = ${input.jobId}
      `);

      // Update quote status to in_production if not already
      const quoteIdResult = await db.execute(sql`
        SELECT "quoteId" FROM supplier_jobs WHERE id = ${input.jobId}
      `);
      const quoteId = (quoteIdResult.rows[0] as any)?.quoteId;

      if (quoteId) {
        await db.execute(sql`
          UPDATE quotes
          SET status = 'in_production', "updatedAt" = NOW()
          WHERE id = ${quoteId} AND status != 'in_production'
        `);
      }

      return { success: true, message: "עבודה אושרה בהצלחה" };
    }),

  // ==================== MARK JOB READY (סימון כמוכן) ====================
  markJobReady: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can mark jobs as ready");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";

      // Verify job exists and belongs to supplier
      const jobResult = await db.execute(sql`
        SELECT id, "supplierId", status, "isCancelled" FROM supplier_jobs WHERE id = ${input.jobId}
      `);

      if (!jobResult.rows || jobResult.rows.length === 0) {
        throw new Error("עבודה לא נמצאה");
      }

      const job = jobResult.rows[0] as any;

      if (!isAdminOrEmployee && job.supplierId !== ctx.user.id) {
        throw new Error("אין לך הרשאה לעדכן עבודה זו");
      }

      if (job.isCancelled) {
        throw new Error("לא ניתן לעדכן עבודה מבוטלת");
      }

      if (job.status !== 'accepted') {
        throw new Error("ניתן לסמן כמוכן רק עבודות שאושרו");
      }

      // Mark as ready
      await db.execute(sql`
        UPDATE supplier_jobs
        SET status = 'ready',
            "supplierMarkedReady" = true,
            "supplierReadyAt" = NOW(),
            "updatedAt" = NOW()
        WHERE id = ${input.jobId}
      `);

      return { success: true, message: "עבודה סומנה כמוכנה" };
    }),

  // ==================== JOB HISTORY (היסטוריה) ====================
  jobHistory: protectedProcedure
    .input(z.object({ 
      supplierId: z.number().optional(),
      limit: z.number().default(50)
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access supplier portal");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";
      const targetSupplierId = isAdminOrEmployee && input?.supplierId ? input.supplierId : ctx.user.id;
      const limit = input?.limit || 50;

      // Get completed and cancelled jobs
      const result = await db.execute(sql`
        SELECT 
          sj.id,
          sj."quoteId",
          sj.quantity,
          sj."pricePerUnit",
          sj.status,
          sj."supplierRating",
          sj."supplierReadyAt",
          sj."isCancelled",
          sj."cancelledAt",
          sj."cancelledReason",
          sj."createdAt",
          customer.name as "customerName",
          customer."companyName" as "customerCompany",
          ps.name as "sizeName",
          bp.name as "productName"
        FROM supplier_jobs sj
        LEFT JOIN users customer ON sj."customerId" = customer.id
        LEFT JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
        LEFT JOIN product_sizes ps ON sq.size_id = ps.id
        LEFT JOIN base_products bp ON ps.product_id = bp.id
        WHERE sj."supplierId" = ${targetSupplierId}
          AND (sj.status IN ('ready', 'picked_up', 'delivered') OR sj."isCancelled" = true)
        ORDER BY sj."createdAt" DESC
        LIMIT ${limit}
      `);

      return result.rows.map((row: any) => ({
        id: row.id,
        quoteId: row.quoteId,
        quantity: row.quantity,
        pricePerUnit: parseFloat(row.pricePerUnit),
        status: row.status,
        rating: row.supplierRating ? parseFloat(row.supplierRating) : null,
        readyAt: row.supplierReadyAt,
        isCancelled: row.isCancelled,
        cancelledAt: row.cancelledAt,
        cancelledReason: row.cancelledReason,
        createdAt: row.createdAt,
        customerName: row.customerName || 'לקוח לא מזוהה',
        customerCompany: row.customerCompany,
        productName: row.productName ? `${row.productName} - ${row.sizeName}` : 'מוצר',
      }));
    }),

  // ==================== GET JOB ATTACHMENTS (קבצים לעבודה) ====================
  getJobAttachments: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== "supplier" && ctx.user.role !== "admin" && ctx.user.role !== "employee") {
        throw new Error("Only suppliers can access job attachments");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isAdminOrEmployee = ctx.user.role === "admin" || ctx.user.role === "employee";

      // Get job and verify ownership
      const jobResult = await db.execute(sql`
        SELECT "supplierId", "quoteId", "isCancelled" FROM supplier_jobs WHERE id = ${input.jobId}
      `);

      if (!jobResult.rows || jobResult.rows.length === 0) {
        throw new Error("עבודה לא נמצאה");
      }

      const job = jobResult.rows[0] as any;

      if (!isAdminOrEmployee && job.supplierId !== ctx.user.id) {
        throw new Error("אין לך הרשאה לצפות בקבצים של עבודה זו");
      }

      // If job is cancelled, don't show attachments
      if (job.isCancelled) {
        return { attachments: [], message: "עבודה בוטלה - אין גישה לקבצים" };
      }

      // Get attachments
      const attachments = await db.execute(sql`
        SELECT id, "fileName", "fileUrl", "uploadedAt"
        FROM quote_attachments
        WHERE "quoteId" = ${job.quoteId}
      `);

      return {
        attachments: attachments.rows.map((att: any) => ({
          id: att.id,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          uploadedAt: att.uploadedAt,
        })),
        message: null,
      };
    }),
});
