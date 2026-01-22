import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { supplierPortalRouter } from "./supplierPortal";
import { customerPortalRouter } from "./customerPortal";
import { createCustomerWithQuote } from "./createCustomerWithQuote";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import {
  getUserByEmail,
  getDashboardKPIs,
  getRecentActivity,
  getRecentQuotes,
  getPendingCustomers,
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
  createVariant,
  updateVariant,
  deleteVariant,
  getProductCategories,
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
  updateSupplierPrice,
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
        secretKey: z.string() // Simple protection
      }))
      .mutation(async ({ input }) => {
        // Simple protection - require a secret key
        if (input.secretKey !== 'SETUP_ADMIN_2024') {
          throw new Error('Invalid secret key');
        }
        
        // Check if admin already exists
        const existing = await getUserByEmail(input.email.toLowerCase());
        if (existing) {
          // If exists but not admin, update to admin
          if (existing.role !== 'admin') {
            const db = await import('./db').then(m => m.getDb());
            if (db) {
              const { eq } = await import('drizzle-orm');
              const { users } = await import('../drizzle/schema');
              await db.update(users)
                .set({ 
                  role: 'admin',
                  status: 'active',
                  permissions: DEFAULT_PERMISSIONS.admin,
                  updatedAt: new Date(),
                })
                .where(eq(users.email, input.email.toLowerCase()));
            }
            return { success: true, message: 'User upgraded to admin' };
          }
          return { success: true, message: 'Admin already exists' };
        }
        
        // Create new admin user
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new Error('Database not available');
        
        const { users } = await import('../drizzle/schema');
        const crypto = await import('crypto');
        
        await db.insert(users).values({
          openId: `admin-${crypto.randomUUID()}`,
          name: input.name,
          email: input.email.toLowerCase(),
          role: 'admin',
          status: 'active',
          permissions: DEFAULT_PERMISSIONS.admin,
          loginMethod: 'clerk',
        });
        
        return { success: true, message: 'Admin user created' };
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
    list: protectedProcedure
      .input(z.object({
        category: z.string().optional(),
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

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1, "שם המוצר נדרש"),
        description: z.string().optional(),
        category: z.string().optional(),
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
        attributes: z.record(z.string(), z.unknown()).optional(),
        validationProfileId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can create variants");
        }
        return await createVariant({
          baseProductId: input.baseProductId,
          sku: input.sku,
          name: input.name,
          attributes: input.attributes as Record<string, unknown> | undefined,
          validationProfileId: input.validationProfileId,
        });
      }),

    updateVariant: protectedProcedure
      .input(z.object({
        id: z.number(),
        sku: z.string().optional(),
        name: z.string().optional(),
        attributes: z.record(z.string(), z.unknown()).optional(),
        validationProfileId: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can update variants");
        }
        return await updateVariant({
          id: input.id,
          sku: input.sku,
          name: input.name,
          attributes: input.attributes as Record<string, unknown> | undefined,
          validationProfileId: input.validationProfileId,
          isActive: input.isActive,
        });
      }),

    deleteVariant: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can delete variants");
        }
        return await deleteVariant(input.id);
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
          productVariantId: z.number(),
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
          productVariantId: z.number(),
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
  }),

  admin: router({
    approveCustomer: adminProcedure
      .input(z.object({ customerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await approveCustomer(input.customerId, ctx.user.id);
      }),

    pendingCustomers: adminProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await getPendingCustomers(input?.limit || 20);
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
          productVariantId: z.number(),
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
        variantId: z.number(),
        price: z.number().positive("Price must be positive"),
        deliveryDays: z.number().int().positive().optional(),
        minQuantity: z.number().int().positive().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can update supplier prices");
        }
        return await updateSupplierPrice(input);
      }),

    deletePrice: protectedProcedure
      .input(z.object({
        supplierId: z.number(),
        variantId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can delete supplier prices");
        }
        return await deleteSupplierPrice(input.supplierId, input.variantId);
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
        variantId: z.number(),
        quantity: z.number().int().positive(),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can view supplier recommendations");
        }
        return await getSupplierRecommendations(input.variantId, input.quantity);
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
        return await markJobPickedUp(input.quoteItemId, ctx.user.id);
      }),

    markDelivered: protectedProcedure
      .input(z.object({ quoteItemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee' && ctx.user.role !== 'courier') {
          throw new Error("Only couriers can mark jobs as delivered");
        }
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
});

export type AppRouter = typeof appRouter;
