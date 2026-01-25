import { z } from "zod";
import { desc, sql } from "drizzle-orm";
import { developerLogs } from "../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { supplierPortalRouter } from "./supplierPortal";
import { customerPortalRouter } from "./customerPortal";
import { createCustomerWithQuote } from "./createCustomerWithQuote";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { getTopSupplierRecommendations, getEnhancedSupplierRecommendations } from './supplierRecommendations';
import { getRecommendationsByCategory, createSupplierJobsForCategory } from './supplierRecommendationsByCategory';
import {
  getUserByEmail,
  getDashboardKPIs,
  getRecentActivity,
  getRecentQuotes,
  getPendingCustomers,
  getPendingSignups,
  getPendingApprovals,
  getDb,
  getFilteredActivity,
  getActivityActionTypes,
  getQuotes,
  getQuoteById,
  getQuoteHistory,
  createQuoteRequest,
  updateQuote,
  reviseQuote,
  updateQuoteStatus,
  rejectQuote,
  rateDeal,
  approveCustomer,
  // Products API
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  // variant functions removed - using sizes/quantities now
  getProductCategories,
  // Product Sizes, Quantities, Addons
  getProductWithDetails,
  getProductsWithDetails,
  createProductSize,
  updateProductSize,
  deleteProductSize,
  createProductQuantity,
  updateProductQuantity,
  deleteProductQuantity,
  createProductAddon,
  updateProductAddon,
  deleteProductAddon,
  calculateProductPrice,
  // Customers API
  getCustomers,
  getCustomerById,
  rejectCustomer,
  updateCustomer,
  getCustomerPricelists,
  assignPricelistToCustomer,
  removePricelistFromCustomer,
  getAllPricelists,
  getCustomerStats,
  // Suppliers API
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
  // Courier API
  getCourierReadyJobs,
  markJobPickedUp,
  markJobDelivered,
  getCourierStats,
  // Notes API
  createNote,
  getNotes,
  deleteNote,
  // Analytics API
  getProductPerformance,
  getSupplierPerformance,
  getCustomerAnalytics,
  getRevenueReport,
  getAnalyticsSummary,
  // File Validation API
  getValidationProfiles,
  getValidationProfileById,
  createValidationProfile,
  updateValidationProfile,
  deleteValidationProfile,
  getDefaultValidationProfile,
  validateFile,
  saveFileWarnings,
  getFileWarnings,
  getFileWarningsByAttachment,
  acknowledgeWarning,
  acknowledgeAllWarnings,
  // Settings API
  getSupplierWeights,
  updateSupplierWeights,
  // User Management API
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
  // Staff Management API
  getAllStaff,
  createStaffUser,
  updateUserPermissions,
  updateUserRole,
  updateStaffUser,
  deleteStaffUser,
  getUserById,
  DEFAULT_PERMISSIONS,
  getActiveJobs,
  getJobsReadyForPickup,
  updateJobStatus,
  getEmailOnStatusChangeSetting,
  setEmailOnStatusChangeSetting,
  type EmailOnStatusChange,
  getSupplierJobsHistory,
  updateSupplierJobData,
  getSupplierScoreDetails,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  supplierPortal: supplierPortalRouter,
  customerPortal: customerPortalRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // Support both Express clearCookie and Vercel setHeader
      if (ctx.res.clearCookie) {
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      } else if (ctx.res.setHeader) {
        ctx.res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
      }
      return { success: true } as const;
    }),
    // Check if user email exists in database and return their role/permissions
    checkUserByEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const user = await getUserByEmail(input.email.toLowerCase());
        if (!user) {
          return { authorized: false, user: null };
        }
        // Check if user is active
        if (user.status !== 'active') {
          return { authorized: false, user: null, reason: 'user_not_active' };
        }
        return {
          authorized: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions,
            status: user.status,
          },
        };
      }),
    // Seed admin user (only works if admin doesn't exist yet)
    seedAdmin: publicProcedure
      .input(z.object({ 
        email: z.string().email(),
        name: z.string(),
        password: z.string().min(4, "סיסמה חייבת להכיל לפחות 4 תווים"),
        secretKey: z.string() // Simple protection
      }))
      .mutation(async ({ input }) => {
        // Simple protection - require a secret key from environment variable
        const adminSetupKey = process.env.ADMIN_SETUP_KEY || 'CHANGE_THIS_DEFAULT_KEY';
        if (input.secretKey !== adminSetupKey) {
          throw new Error('Invalid secret key');
        }
        
        const db = await import('./db').then(m => m.getDb());
        if (!db) {
          throw new Error('Database not available - check DATABASE_URL environment variable');
        }
        
        const { users } = await import('../drizzle/schema');
        const { eq, sql } = await import('drizzle-orm');
        const crypto = await import('crypto');
        const bcrypt = await import('bcryptjs');
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(input.password, salt);
        
        try {
          // First, check if table exists by trying a simple query
          const tableCheck = await db.execute(sql`SELECT to_regclass('public.users')`);
          const tableExists = tableCheck.rows[0]?.to_regclass !== null;
          
          if (!tableExists) {
            // Create the users table with all required columns
            await db.execute(sql`
              DO $$ BEGIN
                CREATE TYPE user_role AS ENUM ('admin', 'employee', 'customer', 'supplier', 'courier');
              EXCEPTION
                WHEN duplicate_object THEN null;
              END $$;
              
              DO $$ BEGIN
                CREATE TYPE user_status AS ENUM ('pending_approval', 'active', 'rejected', 'deactivated');
              EXCEPTION
                WHEN duplicate_object THEN null;
              END $$;
            `);
            
            await db.execute(sql`
              CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                "openId" VARCHAR(64) NOT NULL UNIQUE,
                name TEXT,
                email VARCHAR(320),
                password VARCHAR(255),
                "loginMethod" VARCHAR(64),
                role user_role NOT NULL DEFAULT 'customer',
                status user_status NOT NULL DEFAULT 'pending_approval',
                phone VARCHAR(20),
                "companyName" TEXT,
                address TEXT,
                permissions JSONB DEFAULT '{}',
                "totalRatingPoints" INTEGER DEFAULT 0,
                "ratedDealsCount" INTEGER DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
                "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW()
              )
            `);
            
            console.log('[SeedAdmin] Created users table');
          }
          
          // Check if admin already exists
          const existingUsers = await db.select().from(users).where(eq(users.email, input.email.toLowerCase())).limit(1);
          const existing = existingUsers[0];
          
          if (existing) {
            // If exists but not admin, update to admin
            if (existing.role !== 'admin') {
              await db.update(users)
                .set({ 
                  role: 'admin',
                  status: 'active',
                  permissions: DEFAULT_PERMISSIONS.admin,
                  updatedAt: new Date(),
                })
                .where(eq(users.email, input.email.toLowerCase()));
              return { success: true, message: 'User upgraded to admin' };
            }
            return { success: true, message: 'Admin already exists' };
          }
          
          // Create new admin user
          await db.insert(users).values({
            openId: `admin-${crypto.randomUUID()}`,
            name: input.name,
            email: input.email.toLowerCase(),
            password: hashedPassword,
            role: 'admin',
            status: 'active',
            permissions: DEFAULT_PERMISSIONS.admin,
            loginMethod: 'email',
          });
          
          return { success: true, message: 'Admin user created successfully!' };
        } catch (error: any) {
          console.error('[SeedAdmin] Error:', error);
          throw new Error(`Database error: ${error.message}. Make sure the database migrations have been run.`);
        }
      }),
  }),

  dashboard: router({
    kpis: protectedProcedure.query(async () => {
      return await getDashboardKPIs();
    }),
    
    recentActivity: protectedProcedure.query(async () => {
      return await getRecentActivity(10);
    }),
    
    recentQuotes: protectedProcedure.query(async () => {
      return await getRecentQuotes(5);
    }),
    
    pendingCustomers: protectedProcedure.query(async () => {
      return await getPendingCustomers(5);
    }),

    // New endpoints for pending signups and approvals
    pendingSignups: protectedProcedure.query(async () => {
      return await getPendingSignups(5);
    }),

    pendingApprovals: protectedProcedure.query(async () => {
      return await getPendingApprovals(5);
    }),

    // Active jobs for Jobs page
    activeJobs: protectedProcedure.query(async () => {
      return await getActiveJobs();
    }),

    // Jobs ready for courier pickup
    readyForPickup: protectedProcedure.query(async () => {
      return await getJobsReadyForPickup();
    }),
  }),

  // ==================== ACTIVITY LOG API ====================
  activity: router({
    list: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        customerName: z.string().optional(),
        employeeName: z.string().optional(),
        actionType: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await getFilteredActivity(input || {});
      }),

    actionTypes: protectedProcedure.query(async () => {
      return await getActivityActionTypes();
    }),
  }),

  // ==================== PRODUCTS API ====================
  products: router({
    list: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        categoryId: z.number().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await getProducts(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getProductById(input.id);
      }),

    categories: protectedProcedure
      .query(async () => {
        return await getProductCategories();
      }),

    getCategories: publicProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) return [];
        const { categories } = await import('../drizzle/schema');
        return await db.select().from(categories).orderBy(categories.displayOrder);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1, "שם המוצר נדרש"),
        description: z.string().optional(),
        category: z.string().optional(),
        categoryId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can create products");
        }
        return await createProduct(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        categoryId: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can update products");
        }
        return await updateProduct(input);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can delete products");
        }
        return await deleteProduct(input.id);
      }),

    createVariant: protectedProcedure
      .input(z.object({
        baseProductId: z.number(),
        sku: z.string().min(1, "מק\"ט נדרש"),
        name: z.string().min(1, "שם הוריאנט נדרש"),
        price: z.number().optional(),
        pricingType: z.string().optional(),
        attributes: z.record(z.string(), z.unknown()).optional(),
        validationProfileId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Variants are deprecated - use sizes and quantities");
        }
        throw new Error("Variants are deprecated - use sizes and quantities");
      }),

    // DEPRECATED - variants replaced by sizes/quantities
    updateVariant: protectedProcedure
      .input(z.object({
        id: z.number(),
        sku: z.string().optional(),
        name: z.string().optional(),
        price: z.number().optional(),
        pricingType: z.string().optional(),
        attributes: z.record(z.string(), z.unknown()).optional(),
        validationProfileId: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async () => {
        throw new Error("Variants are deprecated - use sizes and quantities");
      }),

    deleteVariant: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async () => {
        throw new Error("Variants are deprecated - use sizes and quantities");
      }),

    // ===== SIZE QUANTITIES =====
    getSizeQuantities: publicProcedure
      .input(z.object({ sizeId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { sizeQuantities } = await import('../drizzle/schema');
        const { eq, asc, and } = await import('drizzle-orm');
        return await db.select().from(sizeQuantities)
          .where(and(
            eq(sizeQuantities.sizeId, input.sizeId),
            eq(sizeQuantities.isActive, true)
          ))
          .orderBy(asc(sizeQuantities.displayOrder));
      }),

    createSizeQuantity: protectedProcedure
      .input(z.object({
        sizeId: z.number(),
        quantity: z.number(),
        price: z.number(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { sizeQuantities } = await import('../drizzle/schema');
        const result = await db.insert(sizeQuantities).values({
          sizeId: input.sizeId,
          quantity: input.quantity,
          price: input.price.toString(),
          displayOrder: input.displayOrder || 0,
        }).returning();
        return result[0];
      }),

    updateSizeQuantity: protectedProcedure
      .input(z.object({
        id: z.number(),
        quantity: z.number().optional(),
        price: z.number().optional(),
        displayOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { sizeQuantities } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const updateData: any = {};
        if (input.quantity !== undefined) updateData.quantity = input.quantity;
        if (input.price !== undefined) updateData.price = input.price.toString();
        if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        const result = await db.update(sizeQuantities)
          .set(updateData)
          .where(eq(sizeQuantities.id, input.id))
          .returning();
        return result[0];
      }),

    deleteSizeQuantity: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { sizeQuantities } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        // Soft delete - set isActive to false
        await db.update(sizeQuantities)
          .set({ isActive: false })
          .where(eq(sizeQuantities.id, input.id));
        return { success: true };
      }),

    // ===== SIZES =====
    getSizes: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { productSizes } = await import('../drizzle/schema');
        const { eq, asc, and } = await import('drizzle-orm');
        return await db.select().from(productSizes)
          .where(and(
            eq(productSizes.productId, input.productId),
            eq(productSizes.isActive, true)
          ))
          .orderBy(asc(productSizes.displayOrder));
      }),

    createSize: protectedProcedure
      .input(z.object({
        productId: z.number(),
        name: z.string().min(1),
        dimensions: z.string().optional(),
        basePrice: z.number(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await createProductSize(input);
      }),

    updateSize: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        dimensions: z.string().optional(),
        basePrice: z.number().optional(),
        displayOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await updateProductSize(input);
      }),

    deleteSize: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await deleteProductSize(input.id);
      }),

    // ===== QUANTITIES =====
    getQuantities: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { sizeQuantities, productSizes } = await import('../drizzle/schema');
        const { eq, asc, inArray } = await import('drizzle-orm');
        // Get sizes for this product first
        const sizes = await db.select().from(productSizes).where(eq(productSizes.productId, input.productId));
        if (sizes.length === 0) return [];
        const sizeIds = sizes.map(s => s.id);
        return await db.select().from(sizeQuantities)
          .where(inArray(sizeQuantities.sizeId, sizeIds))
          .orderBy(asc(sizeQuantities.displayOrder));
      }),

    createQuantity: protectedProcedure
      .input(z.object({
        productId: z.number(),
        quantity: z.number(),
        priceMultiplier: z.number(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await createProductQuantity(input);
      }),

    updateQuantity: protectedProcedure
      .input(z.object({
        id: z.number(),
        quantity: z.number().optional(),
        priceMultiplier: z.number().optional(),
        displayOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await updateProductQuantity(input);
      }),

    deleteQuantity: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await deleteProductQuantity(input.id);
      }),

    // ===== ADDONS =====
    getAddons: publicProcedure
      .input(z.object({ productId: z.number().optional(), categoryId: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { productAddons } = await import('../drizzle/schema');
        const { eq, or, isNull, asc } = await import('drizzle-orm');
        if (input.productId) {
          return await db.select().from(productAddons)
            .where(or(eq(productAddons.productId, input.productId), isNull(productAddons.productId)))
            .orderBy(asc(productAddons.name));
        }
        return await db.select().from(productAddons).orderBy(asc(productAddons.name));
      }),

    createAddon: protectedProcedure
      .input(z.object({
        productId: z.number().optional(),
        categoryId: z.number().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        priceType: z.enum(['fixed', 'percentage', 'per_unit']),
        price: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await createProductAddon(input);
      }),

    updateAddon: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        priceType: z.enum(['fixed', 'percentage', 'per_unit']).optional(),
        price: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await updateProductAddon(input);
      }),

    deleteAddon: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await deleteProductAddon(input.id);
      }),

    // ===== PRICE CALCULATION =====
    calculatePrice: protectedProcedure
      .input(z.object({
        productId: z.number(),
        sizeId: z.number(),
        quantityId: z.number().optional(),
        customQuantity: z.number().optional(),
        addonIds: z.array(z.number()).optional(),
      }))
      .query(async ({ input }) => {
        return await calculateProductPrice(input);
      }),

    // ===== GET WITH DETAILS =====
    getWithDetails: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getProductWithDetails(input.id);
      }),

    listWithDetails: protectedProcedure
      .input(z.object({ categoryId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await getProductsWithDetails(input?.categoryId);
      }),
  }),

  quotes: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        customerId: z.number().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await getQuotes(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getQuoteById(input.id);
      }),

    history: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getQuoteHistory(input.id);
      }),

    request: protectedProcedure
      .input(z.object({
        items: z.array(z.object({
          sizeQuantityId: z.number(),
          quantity: z.number(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await createQuoteRequest({
          customerId: ctx.user.id,
          items: input.items || [],
        });
      }),

    update: protectedProcedure
      .input(z.object({
        quoteId: z.number(),
        items: z.array(z.object({
          sizeQuantityId: z.number(),
          quantity: z.number(),
          priceAtTimeOfQuote: z.number(),
          isUpsell: z.boolean().optional(),
          supplierId: z.number().optional(),
          supplierCost: z.number().optional(),
          deliveryDays: z.number().optional(),
        })).optional(),
        finalValue: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can update quotes");
        }
        return await updateQuote({
          quoteId: input.quoteId,
          employeeId: ctx.user.id,
          items: input.items,
          finalValue: input.finalValue,
        });
      }),

    revise: protectedProcedure
      .input(z.object({ quoteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can revise quotes");
        }
        return await reviseQuote({
          quoteId: input.quoteId,
          employeeId: ctx.user.id,
        });
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        quoteId: z.number(),
        status: z.enum(['draft', 'sent', 'approved', 'rejected', 'superseded', 'in_production', 'ready']),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can update quote status");
        }
        return await updateQuoteStatus(input.quoteId, input.status, ctx.user.id);
      }),

    reject: protectedProcedure
      .input(z.object({
        quoteId: z.number(),
        reason: z.string().min(1, "Rejection reason is required"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can reject quotes");
        }
        return await rejectQuote(input.quoteId, input.reason, ctx.user.id);
      }),

    rate: protectedProcedure
      .input(z.object({
        quoteId: z.number(),
        rating: z.number().min(1).max(10),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can rate deals");
        }
        return await rateDeal(input.quoteId, input.rating, ctx.user.id);
      }),

    assignSupplier: protectedProcedure
      .input(z.object({
        quoteId: z.number(),
        supplierId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can assign suppliers");
        }
        
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Get quote items
        const quoteItemsResult = await db.execute(sql`
          SELECT id, "sizeQuantityId", quantity FROM quote_items WHERE "quoteId" = ${input.quoteId}
        `);
        
        if (!quoteItemsResult.rows || quoteItemsResult.rows.length === 0) {
          throw new Error("No items found in quote");
        }
        
        // Get supplier price for the product
        const firstItem = quoteItemsResult.rows[0] as { id: number; sizeQuantityId: number; quantity: number };
        const supplierPrice = await db.execute(sql`
          SELECT "pricePerUnit", "deliveryDays" FROM supplier_prices 
          WHERE "supplierId" = ${input.supplierId} AND "sizeQuantityId" = ${firstItem.sizeQuantityId}
          LIMIT 1
        `);
        
        const pricePerUnit = supplierPrice.rows?.[0]?.pricePerUnit || 100;
        const deliveryDays = supplierPrice.rows?.[0]?.deliveryDays || 3;
        
        // Assign supplier to all quote items
        for (const item of quoteItemsResult.rows) {
          const typedItem = item as { id: number; sizeQuantityId: number; quantity: number };
          await assignSupplierToQuoteItem(
            typedItem.id,
            input.supplierId,
            Number(pricePerUnit),
            Number(deliveryDays)
          );
        }
        
        // Update quote status to in_production
        await db.execute(sql`
          UPDATE quotes SET status = 'in_production', "updatedAt" = NOW() WHERE id = ${input.quoteId}
        `);
        
        return { success: true };
      }),
  }),

  admin: router({
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
  }),

  customers: router({
    list: protectedProcedure
      .input(z.object({
        status: z.enum(['pending_approval', 'active', 'rejected', 'deactivated']).optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can view customers");
        }
        return await getCustomers({
          role: 'customer',
          status: input?.status,
          search: input?.search,
        });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can view customer details");
        }
        return await getCustomerById(input.id);
      }),

    stats: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can view customer stats");
        }
        return await getCustomerStats();
      }),

    approve: adminProcedure
      .input(z.object({ customerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await approveCustomer(input.customerId, ctx.user.id);
      }),

    reject: adminProcedure
      .input(z.object({
        customerId: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await rejectCustomer(input.customerId, ctx.user.id, input.reason);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        companyName: z.string().optional(),
        address: z.string().optional(),
        billingEmail: z.string().email().optional(),
        status: z.enum(['pending_approval', 'active', 'rejected', 'deactivated']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can update customers");
        }
        return await updateCustomer(input);
      }),

    getPricelists: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can view customer pricelists");
        }
        return await getCustomerPricelists(input.customerId);
      }),

    assignPricelist: adminProcedure
      .input(z.object({
        customerId: z.number(),
        pricelistId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await assignPricelistToCustomer(input.customerId, input.pricelistId);
      }),

    removePricelist: adminProcedure
      .input(z.object({
        customerId: z.number(),
        pricelistId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await removePricelistFromCustomer(input.customerId, input.pricelistId);
      }),

    createWithQuote: publicProcedure
      .input(z.object({
        customerInfo: z.object({
          name: z.string().min(1),
          email: z.string().email(),
          phone: z.string().min(1),
          companyName: z.string().optional(),
          address: z.string().optional(),
        }),
        quoteItems: z.array(z.object({
          sizeQuantityId: z.number(),
          quantity: z.number().int().positive(),
        })).min(1),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await createCustomerWithQuote(input);
      }),
  }),

  pricelists: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can view pricelists");
        }
        return await getAllPricelists();
      }),
  }),

  // ==================== SUPPLIERS ====================
  suppliers: router({
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
  }),

  // ==================== COURIER API ====================
  courier: router({
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
  }),

  // ==================== NOTES API ====================
  notes: router({
    list: protectedProcedure
      .input(z.object({
        targetType: z.enum(['customer', 'quote']),
        targetId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can view internal notes");
        }
        return await getNotes(input.targetType, input.targetId);
      }),

    create: protectedProcedure
      .input(z.object({
        targetType: z.enum(['customer', 'quote']),
        targetId: z.number(),
        content: z.string().min(1, "Content is required"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can create internal notes");
        }
        return await createNote({
          userId: ctx.user.id,
          targetType: input.targetType,
          targetId: input.targetId,
          content: input.content,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ noteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can delete internal notes");
        }
        return await deleteNote(input.noteId, ctx.user.id);
      }),
  }),

  // ==================== FILE VALIDATION API ====================
  validation: router({
    profiles: router({
      list: protectedProcedure
        .query(async ({ ctx }) => {
          if (!ctx.user) throw new Error("Not authenticated");
          if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
            throw new Error("Only employees can view validation profiles");
          }
          return await getValidationProfiles();
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.user) throw new Error("Not authenticated");
          if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
            throw new Error("Only employees can view validation profiles");
          }
          return await getValidationProfileById(input.id);
        }),

      getDefault: protectedProcedure
        .query(async ({ ctx }) => {
          if (!ctx.user) throw new Error("Not authenticated");
          return await getDefaultValidationProfile();
        }),

      create: adminProcedure
        .input(z.object({
          name: z.string().min(1, "Name is required"),
          description: z.string().optional(),
          minDpi: z.number().int().positive().default(300),
          maxDpi: z.number().int().positive().optional(),
          allowedColorspaces: z.array(z.string()).default(['CMYK']),
          requiredBleedMm: z.number().int().nonnegative().default(3),
          maxFileSizeMb: z.number().int().positive().default(100),
          allowedFormats: z.array(z.string()).default(['pdf', 'ai', 'eps', 'tiff']),
          isDefault: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
          return await createValidationProfile(input);
        }),

      update: adminProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          minDpi: z.number().int().positive().optional(),
          maxDpi: z.number().int().positive().optional(),
          allowedColorspaces: z.array(z.string()).optional(),
          requiredBleedMm: z.number().int().nonnegative().optional(),
          maxFileSizeMb: z.number().int().positive().optional(),
          allowedFormats: z.array(z.string()).optional(),
          isDefault: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await updateValidationProfile(id, data);
        }),

      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await deleteValidationProfile(input.id);
        }),
    }),

    validateFile: protectedProcedure
      .input(z.object({
        filename: z.string(),
        fileSizeMb: z.number(),
        format: z.string(),
        dpi: z.number().optional(),
        colorspace: z.string().optional(),
        hasBleed: z.boolean().optional(),
        bleedMm: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        profileId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const { profileId, ...fileMetadata } = input;
        return await validateFile(fileMetadata, profileId);
      }),

    warnings: router({
      getByQuote: protectedProcedure
        .input(z.object({ quoteId: z.number() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.user) throw new Error("Not authenticated");
          return await getFileWarnings(input.quoteId);
        }),

      getByAttachment: protectedProcedure
        .input(z.object({ attachmentId: z.number() }))
        .query(async ({ ctx, input }) => {
          if (!ctx.user) throw new Error("Not authenticated");
          return await getFileWarningsByAttachment(input.attachmentId);
        }),

      save: protectedProcedure
        .input(z.object({
          quoteId: z.number(),
          attachmentId: z.number(),
          warnings: z.array(z.object({
            type: z.enum(['dpi', 'colorspace', 'bleed', 'format', 'filesize']),
            severity: z.enum(['warning', 'error']),
            message: z.string(),
            details: z.string().optional(),
            currentValue: z.string().optional(),
            requiredValue: z.string().optional(),
          })),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user) throw new Error("Not authenticated");
          return await saveFileWarnings(input.quoteId, input.attachmentId, input.warnings);
        }),

      acknowledge: protectedProcedure
        .input(z.object({ warningId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user) throw new Error("Not authenticated");
          return await acknowledgeWarning(input.warningId, ctx.user.id);
        }),

      acknowledgeAll: protectedProcedure
        .input(z.object({ quoteId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (!ctx.user) throw new Error("Not authenticated");
          return await acknowledgeAllWarnings(input.quoteId, ctx.user.id);
        }),
    }),
  }),

  // ==================== ANALYTICS API ====================
  analytics: router({
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
        return await getCustomerAnalytics(input?.startDate, input?.endDate);
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
  }),

  // ==================== SETTINGS API ====================
  settings: router({
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
  }),

  // ==================== USER MANAGEMENT API ====================
  userManagement: router({
    // Customer Signup Requests
    signupRequests: router({
      list: adminProcedure
        .input(z.object({ status: z.string().optional() }).optional())
        .query(async ({ ctx, input }) => {
          return await getCustomerSignupRequests(input?.status);
        }),

      get: adminProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
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
      .query(async ({ ctx, input }) => {
        return await getPendingUsers(input?.role);
      }),

    // Suppliers List
    suppliers: adminProcedure
      .query(async ({ ctx }) => {
        return await getSuppliersList();
      }),

    // Couriers List
    couriers: adminProcedure
      .query(async ({ ctx }) => {
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
  }),

  // ==================== STAFF MANAGEMENT API ====================
  staff: router({
    // Get all staff (employees, suppliers, couriers)
    list: adminProcedure
      .query(async ({ ctx }) => {
        return await getAllStaff();
      }),

    // Get single user by ID
    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getUserById(input.id);
      }),

    // Create new staff user
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1, "שם חובה"),
        email: z.string().email("כתובת מייל לא תקינה"),
        password: z.string().min(4, "סיסמה חייבת להכיל לפחות 4 תווים"),
        phone: z.string().optional(),
        companyName: z.string().optional(),
        role: z.enum(['employee', 'supplier', 'courier']),
        permissions: z.object({
          canViewDashboard: z.boolean().optional(),
          canManageQuotes: z.boolean().optional(),
          canViewCustomers: z.boolean().optional(),
          canEditCustomers: z.boolean().optional(),
          canViewSuppliers: z.boolean().optional(),
          canEditSuppliers: z.boolean().optional(),
          canViewProducts: z.boolean().optional(),
          canEditProducts: z.boolean().optional(),
          canViewAnalytics: z.boolean().optional(),
          canManageSettings: z.boolean().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await createStaffUser(input, ctx.user.id);
      }),

    // Update staff user details
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        companyName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await updateStaffUser(id, data, ctx.user.id);
      }),

    // Update user permissions
    updatePermissions: adminProcedure
      .input(z.object({
        userId: z.number(),
        permissions: z.object({
          canViewDashboard: z.boolean().optional(),
          canManageQuotes: z.boolean().optional(),
          canViewCustomers: z.boolean().optional(),
          canEditCustomers: z.boolean().optional(),
          canViewSuppliers: z.boolean().optional(),
          canEditSuppliers: z.boolean().optional(),
          canViewProducts: z.boolean().optional(),
          canEditProducts: z.boolean().optional(),
          canViewAnalytics: z.boolean().optional(),
          canManageSettings: z.boolean().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        return await updateUserPermissions(input.userId, input.permissions, ctx.user.id);
      }),

    // Update user role
    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(['employee', 'supplier', 'courier', 'admin']),
      }))
      .mutation(async ({ ctx, input }) => {
        return await updateUserRole(input.userId, input.role, ctx.user.id);
      }),

    // Delete (deactivate) staff user
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await deleteStaffUser(input.id, ctx.user.id);
      }),

    // Get default permissions for a role
    defaultPermissions: adminProcedure
      .input(z.object({ role: z.string() }))
      .query(async ({ ctx, input }) => {
        return DEFAULT_PERMISSIONS[input.role as keyof typeof DEFAULT_PERMISSIONS] || {};
      }),
  }),

  // ==================== JOBS API ====================
  jobs: router({
    // Get all active jobs
    list: protectedProcedure.query(async () => {
      return await getActiveJobs();
    }),

    // Get jobs ready for pickup
    readyForPickup: protectedProcedure.query(async () => {
      return await getJobsReadyForPickup();
    }),

    // Update job status
    updateStatus: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        status: z.enum(['pending', 'in_progress', 'ready', 'picked_up', 'delivered']),
        notifyCustomer: z.boolean().optional().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await updateJobStatus(input.jobId, input.status, ctx.user?.id);
        
        // Send email notification if requested
        if (input.notifyCustomer) {
          // TODO: Implement email sending when Gmail API key is configured
          console.log(`[Email] Would send status update email for job ${input.jobId} to customer`);
        }
        
        return result;
      }),
  }),
});

export type AppRouter = typeof appRouter;
