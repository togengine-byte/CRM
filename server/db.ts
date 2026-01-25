import { eq, desc, sql, and, count, inArray, like, gte, lte, SQL, or, sum, isNull, isNotNull, ne, asc, ilike } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import crypto from "crypto";
import { 
  InsertUser, 
  users, 
  quotes, 
  activityLog,
  baseProducts,
  productSizes,
  sizeQuantities,
  productAddons,
  quoteItems,
  quoteAttachments,
  pricelists,
  customerPricelists,
  supplierPrices,
  internalNotes,
  validationProfiles,
  quoteFileWarnings,
  systemSettings
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getDashboardKPIs() {
  const db = await getDb();
  if (!db) {
    return {
      totalQuotes: 0,
      activeCustomers: 0,
      totalRevenue: 0,
      conversionRate: 0,
      pendingApprovals: 0,
      quotesThisMonth: 0,
      revenueThisMonth: 0,
      avgDealValue: 0
    };
  }

  const [quotesCount] = await db.select({ count: count() }).from(quotes);
  
  const [customersCount] = await db.select({ count: count() })
    .from(users)
    .where(and(eq(users.role, "customer"), eq(users.status, "active")));

  const [pendingCount] = await db.select({ count: count() })
    .from(users)
    .where(eq(users.status, "pending_approval"));

  const [approvedQuotes] = await db.select({ count: count() })
    .from(quotes)
    .where(eq(quotes.status, "approved"));

  const [revenueResult] = await db.select({ 
    total: sql<string>`COALESCE(SUM(${quotes.finalValue}), 0)` 
  }).from(quotes).where(eq(quotes.status, "approved"));

  const totalQuotes = quotesCount?.count || 0;
  const approvedCount = approvedQuotes?.count || 0;
  const conversionRate = totalQuotes > 0 ? (approvedCount / totalQuotes) * 100 : 0;
  const totalRevenue = parseFloat(revenueResult?.total || "0");
  const avgDealValue = approvedCount > 0 ? totalRevenue / approvedCount : 0;

  return {
    totalQuotes,
    activeCustomers: customersCount?.count || 0,
    totalRevenue,
    conversionRate: Math.round(conversionRate * 10) / 10,
    pendingApprovals: pendingCount?.count || 0,
    quotesThisMonth: totalQuotes,
    revenueThisMonth: totalRevenue,
    avgDealValue: Math.round(avgDealValue * 100) / 100
  };
}

export async function getRecentActivity(limit: number = 10) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const activities = await db.select({
    id: activityLog.id,
    actionType: activityLog.actionType,
    details: activityLog.details,
    createdAt: activityLog.createdAt,
    userName: users.name,
    userEmail: users.email
  })
  .from(activityLog)
  .leftJoin(users, eq(activityLog.userId, users.id))
  .orderBy(desc(activityLog.createdAt))
  .limit(limit);

  return activities;
}

export async function getRecentQuotes(limit: number = 5) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  // Get recent quotes with status 'draft' or 'sent' (pending)
  const recentQuotes = await db.select({
    id: quotes.id,
    status: quotes.status,
    finalValue: quotes.finalValue,
    createdAt: quotes.createdAt,
    customerName: users.name,
    customerEmail: users.email
  })
  .from(quotes)
  .leftJoin(users, eq(quotes.customerId, users.id))
  .where(
    or(
      eq(quotes.status, 'draft'),
      eq(quotes.status, 'sent')
    )
  )
  .orderBy(desc(quotes.createdAt))
  .limit(limit);

  return recentQuotes;
}

// Get pending customer signup requests (new customers waiting in queue)
export async function getPendingSignups(limit: number = 5) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    // Try with fileValidationWarnings column
    const pending = await db.select({
      id: customerSignupRequests.id,
      name: customerSignupRequests.name,
      email: customerSignupRequests.email,
      phone: customerSignupRequests.phone,
      companyName: customerSignupRequests.companyName,
      description: customerSignupRequests.description,
      productId: customerSignupRequests.productId,
      queueNumber: customerSignupRequests.queueNumber,
      status: customerSignupRequests.status,
      files: customerSignupRequests.files,
      fileValidationWarnings: customerSignupRequests.fileValidationWarnings,
      createdAt: customerSignupRequests.createdAt,
    })
      .from(customerSignupRequests)
      .where(eq(customerSignupRequests.status, "pending"))
      .orderBy(customerSignupRequests.queueNumber)
      .limit(limit);

    return pending;
  } catch (error) {
    // Fallback without fileValidationWarnings if column doesn't exist
    console.log('[getPendingSignups] Falling back without fileValidationWarnings column');
    const pending = await db.select({
      id: customerSignupRequests.id,
      name: customerSignupRequests.name,
      email: customerSignupRequests.email,
      phone: customerSignupRequests.phone,
      companyName: customerSignupRequests.companyName,
      description: customerSignupRequests.description,
      productId: customerSignupRequests.productId,
      queueNumber: customerSignupRequests.queueNumber,
      status: customerSignupRequests.status,
      files: customerSignupRequests.files,
      createdAt: customerSignupRequests.createdAt,
    })
      .from(customerSignupRequests)
      .where(eq(customerSignupRequests.status, "pending"))
      .orderBy(customerSignupRequests.queueNumber)
      .limit(limit);

    return pending.map(p => ({ ...p, fileValidationWarnings: null }));
  }
}

// Get pending customer approvals (existing users waiting for approval)
export async function getPendingApprovals(limit: number = 5) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const pending = await db.select()
    .from(users)
    .where(eq(users.status, "pending_approval"))
    .orderBy(desc(users.id))
    .limit(limit);

  return pending;
}

// Legacy function - kept for backwards compatibility
export async function getPendingCustomers(limit: number = 5) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const pending = await db.select()
    .from(users)
    .where(eq(users.status, "pending_approval"))
    .orderBy(desc(users.id))
    .limit(limit);

  return pending;
}

export async function logActivity(userId: number | null, actionType: string, details?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;

  await db.insert(activityLog).values({
    userId,
    actionType,
    details: details || null
  });
}

// Full activity log with filters
export interface ActivityFilters {
  userId?: number;
  customerName?: string;
  employeeName?: string;
  actionType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export async function getFilteredActivity(filters: ActivityFilters = {}) {
  const db = await getDb();
  if (!db) {
    return { activities: [], total: 0 };
  }

  const conditions: SQL[] = [];

  if (filters.userId) {
    conditions.push(eq(activityLog.userId, filters.userId));
  }

  if (filters.customerName) {
    conditions.push(like(users.name, `%${filters.customerName}%`));
  }

  if (filters.employeeName) {
    conditions.push(like(users.name, `%${filters.employeeName}%`));
  }

  if (filters.actionType) {
    conditions.push(eq(activityLog.actionType, filters.actionType));
  }

  if (filters.startDate) {
    conditions.push(gte(activityLog.createdAt, filters.startDate));
  }

  if (filters.endDate) {
    conditions.push(lte(activityLog.createdAt, filters.endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(activityLog)
    .leftJoin(users, eq(activityLog.userId, users.id))
    .where(whereClause);

  const total = Number(countResult[0]?.count || 0);

  // Get activities
  const activities = await db.select({
    id: activityLog.id,
    userId: activityLog.userId,
    actionType: activityLog.actionType,
    details: activityLog.details,
    createdAt: activityLog.createdAt,
    userName: users.name,
    userEmail: users.email,
    userRole: users.role
  })
  .from(activityLog)
  .leftJoin(users, eq(activityLog.userId, users.id))
  .where(whereClause)
  .orderBy(desc(activityLog.createdAt))
  .limit(filters.limit || 50)
  .offset(filters.offset || 0);

  return { activities, total };
}

export async function getActivityActionTypes() {
  const db = await getDb();
  if (!db) return [];

  const types = await db.selectDistinct({ actionType: activityLog.actionType })
    .from(activityLog)
    .orderBy(activityLog.actionType);

  return types.map(t => t.actionType);
}

// Quote-related functions
export async function getQuotes(filters?: {
  status?: string;
  customerId?: number;
  employeeId?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const results = await db.select({
    id: quotes.id,
    customerId: quotes.customerId,
    employeeId: quotes.employeeId,
    status: quotes.status,
    version: quotes.version,
    parentQuoteId: quotes.parentQuoteId,
    finalValue: quotes.finalValue,
    rejectionReason: quotes.rejectionReason,
    dealRating: quotes.dealRating,
    createdAt: quotes.createdAt,
    updatedAt: quotes.updatedAt,
    customerName: users.name,
    customerEmail: users.email,
  })
  .from(quotes)
  .leftJoin(users, eq(quotes.customerId, users.id))
  .orderBy(desc(quotes.id))
  .limit(filters?.limit || 50);
  
  let filtered = results;
  if (filters?.status) {
    filtered = filtered.filter(q => q.status === filters.status);
  }
  if (filters?.customerId) {
    filtered = filtered.filter(q => q.customerId === filters.customerId);
  }

  return filtered;
}

export async function getQuoteById(quoteId: number) {
  const db = await getDb();
  if (!db) return null;

  const [quote] = await db.select({
    id: quotes.id,
    customerId: quotes.customerId,
    employeeId: quotes.employeeId,
    status: quotes.status,
    version: quotes.version,
    parentQuoteId: quotes.parentQuoteId,
    finalValue: quotes.finalValue,
    rejectionReason: quotes.rejectionReason,
    dealRating: quotes.dealRating,
    createdAt: quotes.createdAt,
    updatedAt: quotes.updatedAt,
  })
  .from(quotes)
  .where(eq(quotes.id, quoteId))
  .limit(1);

  if (!quote) return null;

  const items = await db.select({
    id: quoteItems.id,
    sizeQuantityId: quoteItems.sizeQuantityId,
    quantity: quoteItems.quantity,
    priceAtTimeOfQuote: quoteItems.priceAtTimeOfQuote,
    isUpsell: quoteItems.isUpsell,
    supplierId: quoteItems.supplierId,
    supplierCost: quoteItems.supplierCost,
    deliveryDays: quoteItems.deliveryDays,
  })
  .from(quoteItems)
  .where(eq(quoteItems.quoteId, quoteId));

  const attachments = await db.select()
  .from(quoteAttachments)
  .where(eq(quoteAttachments.quoteId, quoteId));

  return {
    ...quote,
    items,
    attachments,
  };
}

export async function getQuoteHistory(quoteId: number) {
  const db = await getDb();
  if (!db) return [];

  const [currentQuote] = await db.select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (!currentQuote) return [];

  let rootId = quoteId;
  if (currentQuote.parentQuoteId) {
    let parentId: number | null = currentQuote.parentQuoteId;
    while (parentId) {
      const [parent] = await db.select()
        .from(quotes)
        .where(eq(quotes.id, parentId))
        .limit(1);
      if (parent && parent.parentQuoteId) {
        parentId = parent.parentQuoteId;
      } else {
        rootId = parentId;
        break;
      }
    }
  }

  const allQuotes = await db.select({
    id: quotes.id,
    version: quotes.version,
    status: quotes.status,
    finalValue: quotes.finalValue,
    createdAt: quotes.createdAt,
    parentQuoteId: quotes.parentQuoteId,
  })
  .from(quotes)
  .orderBy(quotes.version);

  const history: typeof allQuotes = [];
  const visited = new Set<number>();
  
  const collectChain = async (id: number) => {
    if (visited.has(id)) return;
    visited.add(id);
    
    const quote = allQuotes.find(q => q.id === id);
    if (quote) {
      history.push(quote);
      const children = allQuotes.filter(q => q.parentQuoteId === id);
      for (const child of children) {
        await collectChain(child.id);
      }
    }
  };

  await collectChain(rootId);
  
  return history.sort((a, b) => a.version - b.version);
}

export interface CreateQuoteRequest {
  customerId: number;
  items: {
    sizeQuantityId: number;
    quantity: number;
  }[];
}

export async function createQuoteRequest(data: CreateQuoteRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // RACE CONDITION FIX: Use transaction to ensure atomicity
  // This prevents duplicate quote numbers when multiple requests arrive simultaneously
  try {
    // Get next quote number from sequence (PostgreSQL sequences are atomic)
    const seqResult = await db.execute(sql`SELECT nextval('quote_number_seq') as next_num`) as any;
    const quoteNumber = Number(seqResult.rows?.[0]?.next_num || seqResult[0]?.next_num || 1);

    // Insert quote with returning to get the ID atomically
    const result = await db.insert(quotes).values({
      customerId: data.customerId,
      status: "draft",
      version: 1,
      quoteNumber: quoteNumber,
    }).returning({ id: quotes.id });

    const quoteId = result[0]?.id;
    if (!quoteId) {
      throw new Error("Failed to create quote - no ID returned");
    }

    // Insert quote items
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        await db.insert(quoteItems).values({
          quoteId: quoteId,
          sizeQuantityId: item.sizeQuantityId,
          quantity: item.quantity,
          priceAtTimeOfQuote: "0",
        });
      }
    }

    // Log activity
    await db.insert(activityLog).values({
      userId: data.customerId,
      actionType: "QUOTE_REQUESTED",
      details: { quoteId: quoteId, quoteNumber: quoteNumber },
    });

    return { id: quoteId, quoteNumber: quoteNumber, success: true };
  } catch (error) {
    console.error("[createQuoteRequest] Failed to create quote:", error);
    throw new Error("Failed to create quote request. Please try again.");
  }
}

export interface UpdateQuoteRequest {
  quoteId: number;
  employeeId: number;
  items?: {
    sizeQuantityId: number;
    quantity: number;
    priceAtTimeOfQuote: number;
    isUpsell?: boolean;
    supplierId?: number;
    supplierCost?: number;
    deliveryDays?: number;
  }[];
  finalValue?: number;
}

export async function updateQuote(data: UpdateQuoteRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {
    employeeId: data.employeeId,
  };
  
  // Calculate finalValue from items if items are provided
  if (data.items && data.items.length > 0) {
    const calculatedFinalValue = data.items.reduce((sum, item) => {
      return sum + (item.priceAtTimeOfQuote * item.quantity);
    }, 0);
    updateData.finalValue = calculatedFinalValue.toString();
  } else if (data.finalValue !== undefined) {
    updateData.finalValue = data.finalValue.toString();
  }

  await db.update(quotes)
    .set(updateData)
    .where(eq(quotes.id, data.quoteId));

  if (data.items) {
    await db.delete(quoteItems).where(eq(quoteItems.quoteId, data.quoteId));
    
    for (const item of data.items) {
      await db.insert(quoteItems).values({
        quoteId: data.quoteId,
        sizeQuantityId: item.sizeQuantityId,
        quantity: item.quantity,
        priceAtTimeOfQuote: item.priceAtTimeOfQuote.toString(),
        isUpsell: item.isUpsell || false,
        supplierId: item.supplierId || null,
        supplierCost: item.supplierCost?.toString() || null,
        deliveryDays: item.deliveryDays || null,
      });
    }
  }

  await db.insert(activityLog).values({
    userId: data.employeeId,
    actionType: "QUOTE_UPDATED",
    details: { quoteId: data.quoteId },
  });

  return { success: true };
}

export interface ReviseQuoteRequest {
  quoteId: number;
  employeeId: number;
}

export async function reviseQuote(data: ReviseQuoteRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [currentQuote] = await db.select()
    .from(quotes)
    .where(eq(quotes.id, data.quoteId))
    .limit(1);

  if (!currentQuote) throw new Error("Quote not found");

  await db.update(quotes)
    .set({ status: "superseded" })
    .where(eq(quotes.id, data.quoteId));

  const result = await db.insert(quotes).values({
    customerId: currentQuote.customerId,
    employeeId: data.employeeId,
    status: "draft",
    version: currentQuote.version + 1,
    parentQuoteId: data.quoteId,
  }).returning();

  const newQuoteId = result[0].id;

  const items = await db.select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, data.quoteId));

  for (const item of items) {
    await db.insert(quoteItems).values({
      quoteId: Number(newQuoteId),
      sizeQuantityId: item.sizeQuantityId,
      quantity: item.quantity,
      priceAtTimeOfQuote: item.priceAtTimeOfQuote,
      isUpsell: item.isUpsell,
      supplierId: item.supplierId,
      supplierCost: item.supplierCost,
      deliveryDays: item.deliveryDays,
    });
  }

  await db.insert(activityLog).values({
    userId: data.employeeId,
    actionType: "QUOTE_REVISED",
    details: { oldQuoteId: data.quoteId, newQuoteId: Number(newQuoteId), version: currentQuote.version + 1 },
  });

  return { id: Number(newQuoteId), version: currentQuote.version + 1, success: true };
}

export async function updateQuoteStatus(quoteId: number, status: string, employeeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(quotes)
    .set({ status: status as any })
    .where(eq(quotes.id, quoteId));

  await db.insert(activityLog).values({
    userId: employeeId,
    actionType: `QUOTE_${status.toUpperCase()}`,
    details: { quoteId },
  });

  return { success: true };
}

export async function rejectQuote(quoteId: number, reason: string, employeeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(quotes)
    .set({ 
      status: "rejected",
      rejectionReason: reason,
    })
    .where(eq(quotes.id, quoteId));

  await db.insert(activityLog).values({
    userId: employeeId,
    actionType: "QUOTE_REJECTED",
    details: { quoteId, reason },
  });

  return { success: true };
}

export async function rateDeal(quoteId: number, rating: number, employeeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (rating < 1 || rating > 10) {
    throw new Error("Rating must be between 1 and 10");
  }

  const [quote] = await db.select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (!quote) throw new Error("Quote not found");

  await db.update(quotes)
    .set({ dealRating: rating })
    .where(eq(quotes.id, quoteId));

  await db.update(users)
    .set({
      totalRatingPoints: sql`${users.totalRatingPoints} + ${rating}`,
      ratedDealsCount: sql`${users.ratedDealsCount} + 1`,
    })
    .where(eq(users.id, quote.customerId));

  await db.insert(activityLog).values({
    userId: employeeId,
    actionType: "DEAL_RATED",
    details: { quoteId, rating },
  });

  return { success: true };
}


// ==================== PRODUCTS API ====================

export interface CreateProductInput {
  name: string;
  description?: string;
  category?: string;
}

export interface UpdateProductInput {
  id: number;
  name?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}

export interface CreateSizeInput {
  productId: number;
  name: string;
  dimensions?: string;
  basePrice?: string;
  displayOrder?: number;
}

export interface UpdateSizeInput {
  id: number;
  name?: string;
  dimensions?: string;
  basePrice?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CreateSizeQuantityInput {
  sizeId: number;
  quantity: number;
  price: string;
  displayOrder?: number;
}

export interface UpdateSizeQuantityInput {
  id: number;
  quantity?: number;
  price?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export async function getProducts(filters?: {
  category?: string;
  categoryId?: number;
  isActive?: boolean;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const products = await db.select({
    id: baseProducts.id,
    name: baseProducts.name,
    description: baseProducts.description,
    category: baseProducts.category,
    categoryId: baseProducts.categoryId,
    isActive: baseProducts.isActive,
    createdAt: baseProducts.createdAt,
    updatedAt: baseProducts.updatedAt,
  })
  .from(baseProducts)
  .orderBy(baseProducts.categoryId, baseProducts.name)
  .limit(filters?.limit || 200);

  let filtered = products;
  if (filters?.category) {
    filtered = filtered.filter(p => p.category === filters.category);
  }
  if (filters?.categoryId) {
    filtered = filtered.filter(p => p.categoryId === filters.categoryId);
  }
  if (filters?.isActive !== undefined) {
    filtered = filtered.filter(p => p.isActive === filters.isActive);
  }

  // Get sizes for each product
  const productsWithSizes = await Promise.all(
    filtered.map(async (product) => {
      const sizes = await db.select({
        id: productSizes.id,
        name: productSizes.name,
        dimensions: productSizes.dimensions,
        basePrice: productSizes.basePrice,
        displayOrder: productSizes.displayOrder,
        isActive: productSizes.isActive,
        createdAt: productSizes.createdAt,
      })
      .from(productSizes)
      .where(eq(productSizes.productId, product.id))
      .orderBy(productSizes.displayOrder);

      return {
        ...product,
        sizes,
        sizeCount: sizes.length,
      };
    })
  );

  return productsWithSizes;
}

export async function getProductById(productId: number) {
  const db = await getDb();
  if (!db) return null;

  const [product] = await db.select()
    .from(baseProducts)
    .where(eq(baseProducts.id, productId))
    .limit(1);

  if (!product) return null;

  // Get sizes with their quantities
  const sizes = await db.select()
    .from(productSizes)
    .where(eq(productSizes.productId, productId))
    .orderBy(productSizes.displayOrder);

  // Get quantities for each size
  const sizesWithQuantities = await Promise.all(
    sizes.map(async (size) => {
      const quantities = await db.select()
        .from(sizeQuantities)
        .where(eq(sizeQuantities.sizeId, size.id))
        .orderBy(sizeQuantities.displayOrder);
      return { ...size, quantities };
    })
  );

  return {
    ...product,
    sizes: sizesWithQuantities,
  };
}

export async function createProduct(input: CreateProductInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(baseProducts).values({
    name: input.name,
    description: input.description || null,
    category: input.category || null,
    isActive: true,
  }).returning({ id: baseProducts.id });

  const insertId = result[0]?.id;
  
  await logActivity(null, "product_created", { productId: insertId, name: input.name });

  return { id: insertId, ...input };
}

export async function updateProduct(input: UpdateProductInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields to update");
  }

  await db.update(baseProducts)
    .set(updateData)
    .where(eq(baseProducts.id, input.id));

  await logActivity(null, "product_updated", { productId: input.id, changes: updateData });

  return await getProductById(input.id);
}

export async function deleteProduct(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete - set isActive to false
  await db.update(baseProducts)
    .set({ isActive: false })
    .where(eq(baseProducts.id, productId));

  // Also deactivate all sizes
  await db.update(productSizes)
    .set({ isActive: false })
    .where(eq(productSizes.productId, productId));

  await logActivity(null, "product_deleted", { productId });

  return { success: true };
}

// ==================== SIZE FUNCTIONS ====================

export async function createSize(input: CreateSizeInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if product exists
  const [product] = await db.select()
    .from(baseProducts)
    .where(eq(baseProducts.id, input.productId))
    .limit(1);

  if (!product) {
    throw new Error("Product not found");
  }

  const result = await db.insert(productSizes).values({
    productId: input.productId,
    name: input.name,
    dimensions: input.dimensions || null,
    basePrice: input.basePrice || "0",
    displayOrder: input.displayOrder || 0,
    isActive: true,
  }).returning();

  await logActivity(null, "size_created", { 
    sizeId: result[0].id, 
    productId: input.productId,
    name: input.name 
  });

  return result[0];
}

export async function updateSize(input: UpdateSizeInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.dimensions !== undefined) updateData.dimensions = input.dimensions;
  if (input.basePrice !== undefined) updateData.basePrice = input.basePrice;
  if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields to update");
  }

  await db.update(productSizes)
    .set(updateData)
    .where(eq(productSizes.id, input.id));

  await logActivity(null, "size_updated", { sizeId: input.id, changes: updateData });

  const [updated] = await db.select()
    .from(productSizes)
    .where(eq(productSizes.id, input.id))
    .limit(1);

  return updated;
}

export async function deleteSize(sizeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete
  await db.update(productSizes)
    .set({ isActive: false })
    .where(eq(productSizes.id, sizeId));

  // Also deactivate all quantities for this size
  await db.update(sizeQuantities)
    .set({ isActive: false })
    .where(eq(sizeQuantities.sizeId, sizeId));

  await logActivity(null, "size_deleted", { sizeId });

  return { success: true };
}

// ==================== SIZE QUANTITY FUNCTIONS ====================

export async function createSizeQuantity(input: CreateSizeQuantityInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if size exists
  const [size] = await db.select()
    .from(productSizes)
    .where(eq(productSizes.id, input.sizeId))
    .limit(1);

  if (!size) {
    throw new Error("Size not found");
  }

  const result = await db.insert(sizeQuantities).values({
    sizeId: input.sizeId,
    quantity: input.quantity,
    price: input.price,
    displayOrder: input.displayOrder || 0,
    isActive: true,
  }).returning();

  await logActivity(null, "size_quantity_created", { 
    sizeQuantityId: result[0].id, 
    sizeId: input.sizeId,
    quantity: input.quantity 
  });

  return result[0];
}

export async function updateSizeQuantity(input: UpdateSizeQuantityInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.quantity !== undefined) updateData.quantity = input.quantity;
  if (input.price !== undefined) updateData.price = input.price;
  if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields to update");
  }

  await db.update(sizeQuantities)
    .set(updateData)
    .where(eq(sizeQuantities.id, input.id));

  await logActivity(null, "size_quantity_updated", { sizeQuantityId: input.id, changes: updateData });

  const [updated] = await db.select()
    .from(sizeQuantities)
    .where(eq(sizeQuantities.id, input.id))
    .limit(1);

  return updated;
}

export async function deleteSizeQuantity(sizeQuantityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete
  await db.update(sizeQuantities)
    .set({ isActive: false })
    .where(eq(sizeQuantities.id, sizeQuantityId));

  await logActivity(null, "size_quantity_deleted", { sizeQuantityId });

  return { success: true };
}

export async function getSizeQuantityById(sizeQuantityId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select({
    id: sizeQuantities.id,
    sizeId: sizeQuantities.sizeId,
    quantity: sizeQuantities.quantity,
    price: sizeQuantities.price,
    sizeName: productSizes.name,
    dimensions: productSizes.dimensions,
    productId: productSizes.productId,
    productName: baseProducts.name,
  })
    .from(sizeQuantities)
    .innerJoin(productSizes, eq(sizeQuantities.sizeId, productSizes.id))
    .innerJoin(baseProducts, eq(productSizes.productId, baseProducts.id))
    .where(eq(sizeQuantities.id, sizeQuantityId))
    .limit(1);

  return result[0] || null;
}

export async function getProductCategories() {
  const db = await getDb();
  if (!db) return [];

  const categories = await db.selectDistinct({ category: baseProducts.category })
    .from(baseProducts)
    .where(sql`${baseProducts.category} IS NOT NULL`);

  return categories.map(c => c.category).filter(Boolean) as string[];
}


// ==================== CUSTOMERS ====================

export interface CustomerFilters {
  role?: 'customer' | 'supplier' | 'courier';
  status?: 'pending_approval' | 'active' | 'rejected' | 'deactivated';
  search?: string;
}

export async function getCustomers(filters: CustomerFilters = {}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  
  // Default to customer role if not specified
  const role = filters.role || 'customer';
  conditions.push(eq(users.role, role));
  
  if (filters.status) {
    conditions.push(eq(users.status, filters.status));
  }

  const result = await db.select()
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.id));

  // Filter by search if provided
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    return result.filter(user => 
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.companyName?.toLowerCase().includes(searchLower) ||
      user.phone?.includes(searchLower)
    );
  }

  return result;
}

export async function getCustomerById(customerId: number) {
  const db = await getDb();
  if (!db) return null;

  const [customer] = await db.select()
    .from(users)
    .where(eq(users.id, customerId))
    .limit(1);

  if (!customer) return null;

  // Get customer's quotes count
  const quotesResult = await db.select({ count: sql<number>`count(*)` })
    .from(quotes)
    .where(eq(quotes.customerId, customerId));

  // Get customer's pricelists
  const pricelistsResult = await db.select({
    pricelist: pricelists,
  })
    .from(customerPricelists)
    .innerJoin(pricelists, eq(customerPricelists.pricelistId, pricelists.id))
    .where(eq(customerPricelists.customerId, customerId));

  return {
    ...customer,
    quotesCount: quotesResult[0]?.count || 0,
    pricelists: pricelistsResult.map(r => r.pricelist),
  };
}

export async function approveCustomer(customerId: number, approvedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ status: 'active' })
    .where(eq(users.id, customerId));

  const customerQuotes = await db.select({ id: quotes.id })
    .from(quotes)
    .where(and(eq(quotes.customerId, customerId), eq(quotes.status, 'draft')));

  for (const quote of customerQuotes) {
    await db.update(quotes)
      .set({ status: 'sent' })
      .where(eq(quotes.id, quote.id));
  }

  await logActivity(approvedBy, "customer_approved", { customerId });

  return { success: true };
}

export async function rejectCustomer(customerId: number, rejectedBy: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ status: 'rejected' })
    .where(eq(users.id, customerId));

  await logActivity(rejectedBy, "customer_rejected", { customerId, reason });

  return { success: true };
}

export async function updateCustomer(input: {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  address?: string;
  billingEmail?: string;
  status?: 'pending_approval' | 'active' | 'rejected' | 'deactivated';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.companyName !== undefined) updateData.companyName = input.companyName;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.billingEmail !== undefined) updateData.billingEmail = input.billingEmail;
  if (input.status !== undefined) updateData.status = input.status;

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields to update");
  }

  await db.update(users)
    .set(updateData)
    .where(eq(users.id, input.id));

  await logActivity(null, "customer_updated", { customerId: input.id, changes: updateData });

  return await getCustomerById(input.id);
}

export async function getCustomerPricelists(customerId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    pricelist: pricelists,
  })
    .from(customerPricelists)
    .innerJoin(pricelists, eq(customerPricelists.pricelistId, pricelists.id))
    .where(eq(customerPricelists.customerId, customerId));

  return result.map(r => r.pricelist);
}

export async function assignPricelistToCustomer(customerId: number, pricelistId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already assigned
  const existing = await db.select()
    .from(customerPricelists)
    .where(and(
      eq(customerPricelists.customerId, customerId),
      eq(customerPricelists.pricelistId, pricelistId)
    ))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Pricelist already assigned to customer");
  }

  await db.insert(customerPricelists).values({
    customerId,
    pricelistId,
  });

  await logActivity(null, "pricelist_assigned", { customerId, pricelistId });

  return { success: true };
}

export async function removePricelistFromCustomer(customerId: number, pricelistId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(customerPricelists)
    .where(and(
      eq(customerPricelists.customerId, customerId),
      eq(customerPricelists.pricelistId, pricelistId)
    ));

  await logActivity(null, "pricelist_removed", { customerId, pricelistId });

  return { success: true };
}

export async function getAllPricelists() {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(pricelists)
    .where(eq(pricelists.isActive, true))
    .orderBy(pricelists.name);
}

// Get customer statistics
export async function getCustomerStats() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, pending: 0, rejected: 0 };

  const result = await db.select({
    status: users.status,
    count: sql<number>`count(*)`,
  })
    .from(users)
    .where(eq(users.role, 'customer'))
    .groupBy(users.status);

  const stats = { total: 0, active: 0, pending: 0, rejected: 0 };
  
  for (const row of result) {
    const count = Number(row.count);
    stats.total += count;
    if (row.status === 'active') stats.active = count;
    if (row.status === 'pending_approval') stats.pending = count;
    if (row.status === 'rejected') stats.rejected = count;
  }

  return stats;
}


// ==================== SUPPLIERS ====================

export async function getSuppliers(filters?: {
  status?: 'pending_approval' | 'active' | 'rejected' | 'deactivated';
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(users.role, 'supplier')];
  
  if (filters?.status) {
    conditions.push(eq(users.status, filters.status));
  }

  let query = db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    phone: users.phone,
    companyName: users.companyName,
    address: users.address,
    status: users.status,
    createdAt: users.createdAt,
  })
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.id));

  const results = await query;

  if (filters?.search) {
    const search = filters.search.toLowerCase();
    return results.filter(s => 
      s.name?.toLowerCase().includes(search) ||
      s.email?.toLowerCase().includes(search) ||
      s.companyName?.toLowerCase().includes(search) ||
      s.phone?.includes(search)
    );
  }

  return results;
}

export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const supplier = await db.select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, 'supplier')))
    .limit(1);

  if (supplier.length === 0) return null;

  // Get supplier prices with size+quantity info
  const prices = await db.select({
    id: supplierPrices.id,
    sizeQuantityId: supplierPrices.sizeQuantityId,
    price: supplierPrices.pricePerUnit,
    deliveryDays: supplierPrices.deliveryDays,
    qualityRating: supplierPrices.qualityRating,
    updatedAt: supplierPrices.updatedAt,
    quantity: sizeQuantities.quantity,
    sizeName: productSizes.name,
    dimensions: productSizes.dimensions,
    productName: baseProducts.name,
  })
    .from(supplierPrices)
    .innerJoin(sizeQuantities, eq(supplierPrices.sizeQuantityId, sizeQuantities.id))
    .innerJoin(productSizes, eq(sizeQuantities.sizeId, productSizes.id))
    .innerJoin(baseProducts, eq(productSizes.productId, baseProducts.id))
    .where(eq(supplierPrices.supplierId, id));

  // Get open jobs count
  const openJobsResult = await db.select({
    count: sql<number>`count(*)`,
  })
    .from(quoteItems)
    .where(eq(quoteItems.supplierId, id));

  // Get supplier ratings from supplier_jobs
  const ratingsResult = await db.execute(sql`
    SELECT 
      AVG("supplierRating") as avg_rating,
      COUNT("supplierRating") as total_ratings,
      COUNT(CASE WHEN "supplierMarkedReady" = true AND "courierConfirmedReady" = true THEN 1 END) as reliable_jobs,
      COUNT(CASE WHEN "supplierMarkedReady" = true THEN 1 END) as total_ready_jobs,
      AVG(EXTRACT(EPOCH FROM ("supplierReadyAt" - "createdAt")) / 86400) as avg_delivery_days
    FROM supplier_jobs
    WHERE "supplierId" = ${id}
  `);

  // Get average price score compared to other suppliers
  const priceScoreResult = await db.execute(sql`
    WITH supplier_avg AS (
      SELECT AVG(CAST("pricePerUnit" AS DECIMAL)) as avg_price
      FROM supplier_prices
      WHERE "supplierId" = ${id}
    ),
    all_avg AS (
      SELECT AVG(CAST("pricePerUnit" AS DECIMAL)) as avg_price
      FROM supplier_prices
    )
    SELECT 
      supplier_avg.avg_price as supplier_price,
      all_avg.avg_price as market_price
    FROM supplier_avg, all_avg
  `);

  const ratingsRow = ratingsResult.rows?.[0] as any || {};
  const priceRow = priceScoreResult.rows?.[0] as any || {};

  // Calculate scores (0-100)
  const avgRating = parseFloat(ratingsRow.avg_rating) || 3;
  const totalRatings = parseInt(ratingsRow.total_ratings) || 0;
  const reliableJobs = parseInt(ratingsRow.reliable_jobs) || 0;
  const totalReadyJobs = parseInt(ratingsRow.total_ready_jobs) || 0;
  const avgDeliveryDays = parseFloat(ratingsRow.avg_delivery_days) || 3;
  const supplierPrice = parseFloat(priceRow.supplier_price) || 0;
  const marketPrice = parseFloat(priceRow.market_price) || 0;

  // Calculate percentage scores
  const qualityScore = Math.round((avgRating / 5) * 100);
  const reliabilityScore = totalReadyJobs > 0 ? Math.round((reliableJobs / totalReadyJobs) * 100) : 50;
  const speedScore = Math.round(Math.max(0, Math.min(100, 100 - (avgDeliveryDays - 1) * 20))); // 1 day = 100%, 6+ days = 0%
  const priceScore = marketPrice > 0 && supplierPrice > 0 
    ? Math.round(Math.max(0, Math.min(100, 100 - ((supplierPrice - marketPrice) / marketPrice) * 100)))
    : 50;

  return {
    ...supplier[0],
    prices,
    openJobsCount: Number(openJobsResult[0]?.count || 0),
    ratings: {
      quality: { score: qualityScore, avgRating, totalRatings },
      reliability: { score: reliabilityScore, reliableJobs, totalReadyJobs },
      speed: { score: speedScore, avgDeliveryDays: Math.round(avgDeliveryDays * 10) / 10 },
      price: { score: priceScore, supplierAvg: Math.round(supplierPrice), marketAvg: Math.round(marketPrice) },
    },
  };
}

export async function createSupplier(input: {
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  address?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get next supplier number from sequence
  const seqResult = await db.execute(sql`SELECT nextval('supplier_number_seq') as next_num`) as any;
  const supplierNumber = Number(seqResult.rows?.[0]?.next_num || seqResult[0]?.next_num || Date.now());

  const result = await db.insert(users).values({
    openId: `supplier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    companyName: input.companyName || null,
    address: input.address || null,
    role: 'supplier',
    status: 'active',
    supplierNumber: supplierNumber,
  }).returning();

  await logActivity(null, "supplier_created", { name: input.name, email: input.email });

  return { id: result[0].id, success: true, supplier: result[0] };
}

export async function updateSupplier(input: {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  address?: string;
  status?: 'pending_approval' | 'active' | 'rejected' | 'deactivated';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.companyName !== undefined) updateData.companyName = input.companyName;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.status !== undefined) updateData.status = input.status;

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields to update");
  }

  await db.update(users)
    .set(updateData)
    .where(and(eq(users.id, input.id), eq(users.role, 'supplier')));

  await logActivity(null, "supplier_updated", { supplierId: input.id });

  return { success: true };
}

export async function getSupplierPrices(supplierId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select({
    id: supplierPrices.id,
    sizeQuantityId: supplierPrices.sizeQuantityId,
    quantity: sizeQuantities.quantity,
    sizeName: productSizes.name,
    dimensions: productSizes.dimensions,
    productName: baseProducts.name,
    productId: baseProducts.id,
    price: supplierPrices.pricePerUnit,
    deliveryDays: supplierPrices.deliveryDays,
    qualityRating: supplierPrices.qualityRating,
    updatedAt: supplierPrices.updatedAt,
  })
    .from(supplierPrices)
    .innerJoin(sizeQuantities, eq(supplierPrices.sizeQuantityId, sizeQuantities.id))
    .innerJoin(productSizes, eq(sizeQuantities.sizeId, productSizes.id))
    .innerJoin(baseProducts, eq(productSizes.productId, baseProducts.id))
    .where(eq(supplierPrices.supplierId, supplierId))
    .orderBy(baseProducts.name, productSizes.name, sizeQuantities.quantity);
}

export async function upsertSupplierPrice(input: {
  supplierId: number;
  sizeQuantityId: number;
  price: number;
  deliveryDays?: number;
  isPreferred?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if price exists
  const existing = await db.select()
    .from(supplierPrices)
    .where(and(
      eq(supplierPrices.supplierId, input.supplierId),
      eq(supplierPrices.sizeQuantityId, input.sizeQuantityId)
    ))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db.update(supplierPrices)
      .set({
        pricePerUnit: input.price.toString(),
        deliveryDays: input.deliveryDays ?? existing[0].deliveryDays,
        isPreferred: input.isPreferred ?? existing[0].isPreferred,
      })
      .where(eq(supplierPrices.id, existing[0].id));
  } else {
    // Create new
    await db.insert(supplierPrices).values({
      supplierId: input.supplierId,
      sizeQuantityId: input.sizeQuantityId,
      pricePerUnit: input.price.toString(),
      deliveryDays: input.deliveryDays ?? 3,
      isPreferred: input.isPreferred ?? false,
    });
  }

  await logActivity(null, "supplier_price_updated", { 
    supplierId: input.supplierId, 
    sizeQuantityId: input.sizeQuantityId, 
    price: input.price 
  });

  return { success: true };
}

export async function deleteSupplierPrice(supplierId: number, sizeQuantityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(supplierPrices)
    .where(and(
      eq(supplierPrices.supplierId, supplierId),
      eq(supplierPrices.sizeQuantityId, sizeQuantityId)
    ));

  return { success: true };
}

export async function getSupplierOpenJobs(supplierId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select({
    quoteItemId: quoteItems.id,
    quoteId: quoteItems.quoteId,
    sizeQuantityId: quoteItems.sizeQuantityId,
    sizeName: productSizes.name,
    dimensions: productSizes.dimensions,
    productName: baseProducts.name,
    quantity: quoteItems.quantity,
    supplierCost: quoteItems.supplierCost,
    deliveryDays: quoteItems.deliveryDays,
    quoteStatus: quotes.status,
    quoteCreatedAt: quotes.createdAt,
  })
    .from(quoteItems)
    .innerJoin(quotes, eq(quoteItems.quoteId, quotes.id))
    .innerJoin(sizeQuantities, eq(quoteItems.sizeQuantityId, sizeQuantities.id))
    .innerJoin(productSizes, eq(sizeQuantities.sizeId, productSizes.id))
    .innerJoin(baseProducts, eq(productSizes.productId, baseProducts.id))
    .where(and(
      eq(quoteItems.supplierId, supplierId),
      inArray(quotes.status, ['approved', 'in_production'])
    ))
    .orderBy(desc(quotes.createdAt));
}

// Weighted Supplier Recommendation Engine - by sizeQuantityId
export async function getSupplierRecommendations(sizeQuantityId: number, quantity: number) {
  const db = await getDb();
  if (!db) return [];

  // Get weights from settings
  const weights = await getSupplierWeights();

  // Get all suppliers with prices for this size+quantity
  const suppliers = await db.select({
    supplierId: supplierPrices.supplierId,
    supplierName: users.name,
    supplierCompany: users.companyName,
    price: supplierPrices.pricePerUnit,
    deliveryDays: supplierPrices.deliveryDays,
    qualityRating: supplierPrices.qualityRating,
    totalRatingPoints: users.totalRatingPoints,
    ratedDealsCount: users.ratedDealsCount,
  })
    .from(supplierPrices)
    .innerJoin(users, eq(supplierPrices.supplierId, users.id))
    .where(and(
      eq(supplierPrices.sizeQuantityId, sizeQuantityId),
      eq(users.status, 'active')
    ))
    .orderBy(supplierPrices.pricePerUnit);

  if (suppliers.length === 0) return [];

  // Calculate min/max for normalization
  const minPrice = Math.min(...suppliers.map(s => Number(s.price)));
  const maxPrice = Math.max(...suppliers.map(s => Number(s.price)));
  const minDelivery = Math.min(...suppliers.map(s => s.deliveryDays || 3));
  const maxDelivery = Math.max(...suppliers.map(s => s.deliveryDays || 3));

  const recommendations = suppliers.map(supplier => {
    const price = Number(supplier.price);
    const delivery = supplier.deliveryDays || 3;
    const quality = Number(supplier.qualityRating || 3);
    
    // Calculate supplier rating from deals
    const avgRating = supplier.ratedDealsCount && supplier.ratedDealsCount > 0
      ? (supplier.totalRatingPoints || 0) / supplier.ratedDealsCount
      : 3; // Default rating
    
    // Calculate reliability (placeholder - could be based on on-time delivery %)
    const reliability = quality; // Using quality as proxy for now
    
    // Normalize scores (0-100, higher is better)
    const priceScore = maxPrice === minPrice ? 100 : 
      ((maxPrice - price) / (maxPrice - minPrice)) * 100;
    const deliveryScore = maxDelivery === minDelivery ? 100 : 
      ((maxDelivery - delivery) / (maxDelivery - minDelivery)) * 100;
    const ratingScore = (avgRating / 5) * 100;
    const reliabilityScore = (reliability / 5) * 100;

    // Weighted total using configurable weights
    const totalScore = 
      (priceScore * weights.price / 100) + 
      (ratingScore * weights.rating / 100) + 
      (deliveryScore * weights.deliveryTime / 100) + 
      (reliabilityScore * weights.reliability / 100);

    return {
      supplierId: supplier.supplierId,
      supplierName: supplier.supplierName,
      supplierCompany: supplier.supplierCompany,
      price: price,
      deliveryDays: delivery,
      qualityRating: quality,
      avgRating: Math.round(avgRating * 10) / 10,
      scores: {
        price: Math.round(priceScore),
        rating: Math.round(ratingScore),
        delivery: Math.round(deliveryScore),
        reliability: Math.round(reliabilityScore),
        total: Math.round(totalScore),
      },
      weights: weights, // Include weights in response for UI display
      totalCost: price * quantity,
    };
  });

  // Sort by total score descending
  return recommendations.sort((a, b) => b.scores.total - a.scores.total);
}

export async function getSupplierStats() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, pending: 0 };

  const result = await db.select({
    status: users.status,
    count: sql<number>`count(*)`,
  })
    .from(users)
    .where(eq(users.role, 'supplier'))
    .groupBy(users.status);

  const stats = { total: 0, active: 0, pending: 0 };
  
  for (const row of result) {
    const count = Number(row.count);
    stats.total += count;
    if (row.status === 'active') stats.active = count;
    if (row.status === 'pending_approval') stats.pending = count;
  }

  return stats;
}

export async function assignSupplierToQuoteItem(quoteItemId: number, supplierId: number, supplierCost: number, deliveryDays: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(quoteItems)
    .set({
      supplierId,
      supplierCost: supplierCost.toString(),
      deliveryDays,
    })
    .where(eq(quoteItems.id, quoteItemId));

  await logActivity(null, "supplier_assigned", { quoteItemId, supplierId });

  return { success: true };
}


// ==================== COURIER API ====================

export async function getCourierReadyJobs() {
  const db = await getDb();
  if (!db) return [];

  // Get jobs from supplier_jobs that are ready for pickup, picked up, or delivered
  const result = await db.execute(sql`
    SELECT 
      sj.id,
      sj."quoteId",
      sj."supplierId",
      sj."customerId",
      sj."sizeQuantityId",
      sj.quantity,
      sj.status,
      sj."createdAt",
      supplier.name as "supplierName",
      supplier."companyName" as "supplierCompany",
      supplier.address as "supplierAddress",
      supplier.phone as "supplierPhone",
      customer.name as "customerName",
      customer."companyName" as "customerCompany",
      customer.address as "customerAddress",
      customer.phone as "customerPhone",
      ps.name as "sizeName",
      ps.dimensions as "dimensions",
      bp.name as "productName"
    FROM supplier_jobs sj
    LEFT JOIN users supplier ON sj."supplierId" = supplier.id
    LEFT JOIN users customer ON sj."customerId" = customer.id
    LEFT JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
    LEFT JOIN product_sizes ps ON sq.size_id = ps.id
    LEFT JOIN base_products bp ON ps.product_id = bp.id
    WHERE sj.status IN ('ready', 'picked_up', 'delivered')
    ORDER BY 
      CASE sj.status 
        WHEN 'ready' THEN 1
        WHEN 'picked_up' THEN 2
        WHEN 'delivered' THEN 3
      END,
      sj."createdAt" DESC
  `);

  // Map results to expected format
  return (result.rows || []).map((job: any) => ({
    id: job.id,
    quoteId: job.quoteId,
    productName: job.productName || 'מוצר',
    sizeName: job.sizeName || '',
    dimensions: job.dimensions,
    quantity: job.quantity,
    supplierName: job.supplierName || job.supplierCompany || '-',
    supplierAddress: job.supplierAddress || '-',
    supplierPhone: job.supplierPhone || '-',
    customerName: job.customerName || job.customerCompany || '-',
    customerAddress: job.customerAddress || '-',
    customerPhone: job.customerPhone || '-',
    pickedUp: job.status === 'picked_up' || job.status === 'delivered',
    pickedUpAt: null,
    delivered: job.status === 'delivered',
    deliveredAt: null,
  }));
}

export async function markJobPickedUp(jobId: number, courierId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update supplier_jobs status to picked_up
  await db.execute(sql`
    UPDATE supplier_jobs 
    SET status = 'picked_up'
    WHERE id = ${jobId}
  `);

  await logActivity(courierId, "job_picked_up", { jobId });

  return { success: true };
}

export async function markJobDelivered(jobId: number, courierId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update supplier_jobs status to delivered
  await db.execute(sql`
    UPDATE supplier_jobs 
    SET status = 'delivered'
    WHERE id = ${jobId}
  `);

  await logActivity(courierId, "job_delivered", { jobId });

  return { success: true };
}

export async function getCourierStats(courierId?: number) {
  const db = await getDb();
  if (!db) return { pending: 0, pickedUp: 0, delivered: 0 };

  // Get stats from supplier_jobs
  const result = await db.execute(sql`
    SELECT 
      status,
      COUNT(*) as count
    FROM supplier_jobs
    WHERE status IN ('ready', 'picked_up', 'delivered')
    GROUP BY status
  `);

  const stats = { pending: 0, pickedUp: 0, delivered: 0 };
  
  for (const row of (result.rows || []) as any[]) {
    const count = Number(row.count);
    if (row.status === 'ready') stats.pending = count;
    else if (row.status === 'picked_up') stats.pickedUp = count;
    else if (row.status === 'delivered') stats.delivered = count;
  }

  return stats;
}

// ==================== INTERNAL NOTES API ====================

export async function createNote(input: {
  userId: number;
  targetType: 'customer' | 'quote';
  targetId: number;
  content: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(internalNotes).values({
    authorId: input.userId,
    entityType: input.targetType,
    entityId: input.targetId,
    content: input.content,
  }).returning({ id: internalNotes.id });

  await logActivity(input.userId, "note_created", { 
    targetType: input.targetType, 
    targetId: input.targetId 
  });

  return { id: result[0]?.id };
}

export async function getNotes(targetType: 'customer' | 'quote', targetId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select({
    id: internalNotes.id,
    content: internalNotes.content,
    createdAt: internalNotes.createdAt,
    authorId: internalNotes.authorId,
    authorName: users.name,
  })
    .from(internalNotes)
    .leftJoin(users, eq(internalNotes.authorId, users.id))
    .where(and(
      eq(internalNotes.entityType, targetType),
      eq(internalNotes.entityId, targetId)
    ))
    .orderBy(desc(internalNotes.createdAt));
}

// OWNERSHIP CHECK FIX: Verify user owns the note or is admin before deletion
export async function deleteNote(noteId: number, userId: number, userRole: string = 'employee') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate noteId
  if (!Number.isInteger(noteId) || noteId <= 0) {
    throw new Error("Invalid note ID");
  }

  // First, fetch the note to verify it exists and check ownership
  const [existingNote] = await db.select({
    id: internalNotes.id,
    authorId: internalNotes.authorId,
  })
    .from(internalNotes)
    .where(eq(internalNotes.id, noteId))
    .limit(1);

  if (!existingNote) {
    throw new Error("Note not found");
  }

  // Security check: Only the author or admin can delete the note
  const isAuthor = existingNote.authorId === userId;
  const isAdmin = userRole === 'admin';

  if (!isAuthor && !isAdmin) {
    throw new Error("Not authorized to delete this note. Only the author or admin can delete notes.");
  }

  // Safe to delete
  await db.delete(internalNotes)
    .where(eq(internalNotes.id, noteId));

  await logActivity(userId, "note_deleted", { 
    noteId, 
    deletedBy: userId,
    wasAuthor: isAuthor,
    originalAuthorId: existingNote.authorId 
  });

  return { success: true };
}

// ==================== ANALYTICS API ====================

export async function getProductPerformance(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
  const end = endDate || new Date();

  const results = await db.select({
    productId: baseProducts.id,
    productName: baseProducts.name,
    category: baseProducts.category,
    totalQuotes: sql<number>`count(DISTINCT ${quoteItems.quoteId})`,
    totalQuantity: sql<number>`COALESCE(SUM(${quoteItems.quantity}), 0)`,
    totalRevenue: sql<number>`COALESCE(SUM(${quoteItems.priceAtTimeOfQuote} * ${quoteItems.quantity}), 0)`,
    avgUnitPrice: sql<number>`COALESCE(AVG(${quoteItems.priceAtTimeOfQuote}), 0)`,
  })
    .from(baseProducts)
    .leftJoin(productSizes, eq(productSizes.productId, baseProducts.id))
    .leftJoin(sizeQuantities, eq(sizeQuantities.sizeId, productSizes.id))
    .leftJoin(quoteItems, eq(quoteItems.sizeQuantityId, sizeQuantities.id))
    .leftJoin(quotes, and(
      eq(quoteItems.quoteId, quotes.id),
      sql`${quotes.createdAt} BETWEEN ${start} AND ${end}`
    ))
    .where(eq(baseProducts.isActive, true))
    .groupBy(baseProducts.id, baseProducts.name, baseProducts.category);

  // Sort in JS to avoid SQL alias issues
  return results.sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue));
}

export async function getSupplierPerformance(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const results = await db.select({
    supplierId: users.id,
    supplierName: users.name,
    supplierCompany: users.companyName,
    totalJobs: sql<number>`count(DISTINCT ${quoteItems.id})`,
    totalRevenue: sql<number>`COALESCE(SUM(${quoteItems.supplierCost} * ${quoteItems.quantity}), 0)`,
    avgDeliveryDays: sql<number>`COALESCE(AVG(${quoteItems.deliveryDays}), 0)`,
    completedJobs: sql<number>`count(DISTINCT ${quoteItems.id})`,
    onTimeDelivery: sql<number>`100`,  // Placeholder - needs delivery tracking
  })
    .from(users)
    .leftJoin(quoteItems, eq(quoteItems.supplierId, users.id))
    .leftJoin(quotes, and(
      eq(quoteItems.quoteId, quotes.id),
      sql`${quotes.createdAt} BETWEEN ${start} AND ${end}`
    ))
    .where(eq(users.role, 'supplier'))
    .groupBy(users.id, users.name, users.companyName);

  // Sort in JS to avoid SQL alias issues
  return results.sort((a, b) => Number(b.totalJobs) - Number(a.totalJobs));
}

export async function getCustomerAnalytics(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  // Use subquery approach to calculate revenue from quote_items
  const results = await db.select({
    customerId: users.id,
    customerName: users.name,
    customerCompany: users.companyName,
    totalQuotes: sql<number>`count(DISTINCT ${quotes.id})`,
    approvedQuotes: sql<number>`SUM(CASE WHEN ${quotes.status} IN ('approved', 'in_production', 'ready') THEN 1 ELSE 0 END)`,
    conversionRate: sql<number>`COALESCE(
      SUM(CASE WHEN ${quotes.status} IN ('approved', 'in_production', 'ready') THEN 1 ELSE 0 END) * 100.0 / 
      NULLIF(count(DISTINCT ${quotes.id}), 0), 0
    )`,
  })
    .from(users)
    .leftJoin(quotes, and(
      eq(quotes.customerId, users.id),
      sql`${quotes.createdAt} BETWEEN ${start} AND ${end}`
    ))
    .where(eq(users.role, 'customer'))
    .groupBy(users.id, users.name, users.companyName);

  // Calculate revenue from quote_items for each customer
  const customerRevenue = await db.select({
    customerId: quotes.customerId,
    totalRevenue: sql<number>`COALESCE(SUM(${quoteItems.priceAtTimeOfQuote} * ${quoteItems.quantity}), 0)`,
    avgQuoteValue: sql<number>`COALESCE(AVG(${quoteItems.priceAtTimeOfQuote} * ${quoteItems.quantity}), 0)`,
  })
    .from(quoteItems)
    .innerJoin(quotes, eq(quoteItems.quoteId, quotes.id))
    .where(and(
      sql`${quotes.createdAt} BETWEEN ${start} AND ${end}`,
      inArray(quotes.status, ['approved', 'in_production', 'ready'])
    ))
    .groupBy(quotes.customerId);

  const revenueMap = new Map(customerRevenue.map(r => [r.customerId, r]));

  // Merge results and sort by revenue
  return results
    .map(r => ({
      ...r,
      totalRevenue: Number(revenueMap.get(r.customerId)?.totalRevenue || 0),
      avgQuoteValue: Number(revenueMap.get(r.customerId)?.avgQuoteValue || 0),
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export async function getRevenueReport(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, totalCost: 0, profit: 0, margin: 0, byMonth: [] };

  const start = startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // Last year
  const end = endDate || new Date();

  // Total summary - calculate from quote items
  const summary = await db.select({
    totalRevenue: sql<number>`COALESCE(SUM(${quoteItems.priceAtTimeOfQuote} * ${quoteItems.quantity}), 0)`,
    totalCost: sql<number>`COALESCE(SUM(${quoteItems.supplierCost} * ${quoteItems.quantity}), 0)`,
  })
    .from(quoteItems)
    .innerJoin(quotes, eq(quoteItems.quoteId, quotes.id))
    .where(and(
      sql`${quotes.createdAt} BETWEEN ${start} AND ${end}`,
      inArray(quotes.status, ['approved', 'in_production', 'ready'])
    ));

  const totalRevenue = Number(summary[0]?.totalRevenue || 0);
  const totalCost = Number(summary[0]?.totalCost || 0);
  const profit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  // By month - calculate from quote items with proper column reference
  const monthCol = sql<string>`DATE_FORMAT(${quotes.createdAt}, '%Y-%m')`;
  const byMonthResults = await db.select({
    month: monthCol,
    revenue: sql<number>`COALESCE(SUM(${quoteItems.priceAtTimeOfQuote} * ${quoteItems.quantity}), 0)`,
    cost: sql<number>`COALESCE(SUM(${quoteItems.supplierCost} * ${quoteItems.quantity}), 0)`,
    quoteCount: sql<number>`count(DISTINCT ${quotes.id})`,
  })
    .from(quoteItems)
    .innerJoin(quotes, eq(quoteItems.quoteId, quotes.id))
    .where(and(
      sql`${quotes.createdAt} BETWEEN ${start} AND ${end}`,
      inArray(quotes.status, ['approved', 'in_production', 'ready'])
    ))
    .groupBy(monthCol);

  // Sort by month in JS to avoid alias issues
  const byMonth = byMonthResults.sort((a, b) => (a.month || '').localeCompare(b.month || ''));

  return {
    totalRevenue,
    totalCost,
    profit,
    margin: Math.round(margin * 100) / 100,
    byMonth: byMonth.map(m => ({
      month: m.month,
      revenue: Number(m.revenue),
      cost: Number(m.cost),
      profit: Number(m.revenue) - Number(m.cost),
      quoteCount: Number(m.quoteCount),
    })),
  };
}

export async function getAnalyticsSummary() {
  const db = await getDb();
  if (!db) return {
    totalCustomers: 0,
    totalSuppliers: 0,
    totalProducts: 0,
    totalQuotes: 0,
    totalRevenue: 0,
    avgConversionRate: 0,
  };

  const [customers, suppliers, products, quotesData] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, 'customer'), eq(users.status, 'active'))),
    db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, 'supplier'), eq(users.status, 'active'))),
    db.select({ count: sql<number>`count(*)` })
      .from(baseProducts)
      .where(eq(baseProducts.isActive, true)),
    db.select({
      total: sql<number>`count(*)`,
      approved: sql<number>`SUM(CASE WHEN quote_status IN ('approved', 'in_production', 'ready') THEN 1 ELSE 0 END)`,
    }).from(quotes),
  ]);

  const totalQuotes = Number(quotesData[0]?.total || 0);
  const approvedQuotes = Number(quotesData[0]?.approved || 0);

  return {
    totalCustomers: Number(customers[0]?.count || 0),
    totalSuppliers: Number(suppliers[0]?.count || 0),
    totalProducts: Number(products[0]?.count || 0),
    totalQuotes,
    totalRevenue: 0, // Calculated separately via getRevenueReport
    avgConversionRate: totalQuotes > 0 ? Math.round((approvedQuotes / totalQuotes) * 100) : 0,
  };
}


// ============================================
// FILE VALIDATION FUNCTIONS
// ============================================

// Helper function to safely parse JSON arrays
function safeParseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  }
  return [];
}

// Validation Profiles
export async function getValidationProfiles() {
  const db = await getDb();
  if (!db) return [];
  
  const profiles = await db.select().from(validationProfiles).orderBy(desc(validationProfiles.createdAt));
  return profiles.map(p => ({
    ...p,
    allowedColorspaces: safeParseJsonArray(p.allowedColorspaces),
    allowedFormats: safeParseJsonArray(p.allowedFormats),
  }));
}

export async function getValidationProfileById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(validationProfiles).where(eq(validationProfiles.id, id)).limit(1);
  if (!result[0]) return null;
  
  const p = result[0];
  return {
    ...p,
    allowedColorspaces: safeParseJsonArray(p.allowedColorspaces),
    allowedFormats: safeParseJsonArray(p.allowedFormats),
  };
}

export async function createValidationProfile(data: {
  name: string;
  description?: string;
  minDpi: number;
  maxDpi?: number;
  allowedColorspaces: string[];
  requiredBleedMm: number;
  maxFileSizeMb: number;
  allowedFormats: string[];
  isDefault?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  
  // If this is set as default, unset other defaults
  if (data.isDefault) {
    await db.update(validationProfiles).set({ isDefault: false }).where(eq(validationProfiles.isDefault, true));
  }
  
  const result = await db.insert(validationProfiles).values({
    name: data.name,
    description: data.description || null,
    minDpi: data.minDpi,
    maxDpi: data.maxDpi || null,
    allowedColorspaces: JSON.stringify(data.allowedColorspaces),
    requiredBleedMm: data.requiredBleedMm,
    maxFileSizeMb: data.maxFileSizeMb,
    allowedFormats: JSON.stringify(data.allowedFormats),
    isDefault: data.isDefault || false,
  }).returning({ id: validationProfiles.id });
  
  return { id: result[0]?.id };
}

export async function updateValidationProfile(id: number, data: {
  name?: string;
  description?: string;
  minDpi?: number;
  maxDpi?: number;
  allowedColorspaces?: string[];
  requiredBleedMm?: number;
  maxFileSizeMb?: number;
  allowedFormats?: string[];
  isDefault?: boolean;
}) {
  const db = await getDb();
  if (!db) return { success: false };
  
  // If this is set as default, unset other defaults
  if (data.isDefault) {
    await db.update(validationProfiles).set({ isDefault: false }).where(eq(validationProfiles.isDefault, true));
  }
  
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.minDpi !== undefined) updateData.minDpi = data.minDpi;
  if (data.maxDpi !== undefined) updateData.maxDpi = data.maxDpi;
  if (data.allowedColorspaces !== undefined) updateData.allowedColorspaces = JSON.stringify(data.allowedColorspaces);
  if (data.requiredBleedMm !== undefined) updateData.requiredBleedMm = data.requiredBleedMm;
  if (data.maxFileSizeMb !== undefined) updateData.maxFileSizeMb = data.maxFileSizeMb;
  if (data.allowedFormats !== undefined) updateData.allowedFormats = JSON.stringify(data.allowedFormats);
  if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
  
  await db.update(validationProfiles).set(updateData).where(eq(validationProfiles.id, id));
  return { success: true };
}

export async function deleteValidationProfile(id: number) {
  const db = await getDb();
  if (!db) return { success: false };
  
  await db.delete(validationProfiles).where(eq(validationProfiles.id, id));
  return { success: true };
}

export async function getDefaultValidationProfile() {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(validationProfiles).where(eq(validationProfiles.isDefault, true)).limit(1);
  return result[0] || null;
}

// File Validation Logic
export interface FileValidationResult {
  isValid: boolean;
  warnings: FileWarning[];
  errors: FileWarning[];
}

export interface FileWarning {
  type: 'dpi' | 'colorspace' | 'bleed' | 'format' | 'filesize';
  severity: 'warning' | 'error';
  message: string;
  details?: string;
  currentValue?: string;
  requiredValue?: string;
}

export async function validateFile(
  fileMetadata: {
    filename: string;
    fileSizeMb: number;
    format: string;
    dpi?: number;
    colorspace?: string;
    hasBleed?: boolean;
    bleedMm?: number;
    width?: number;
    height?: number;
  },
  profileId?: number
): Promise<FileValidationResult> {
  // Get validation profile
  let profile;
  if (profileId) {
    profile = await getValidationProfileById(profileId);
  } else {
    profile = await getDefaultValidationProfile();
  }
  
  // If no profile, return valid (no validation)
  if (!profile) {
    return { isValid: true, warnings: [], errors: [] };
  }
  
  const warnings: FileWarning[] = [];
  const errors: FileWarning[] = [];
  
  // Parse JSON fields
  const allowedColorspaces = JSON.parse(profile.allowedColorspaces as string || '[]');
  const allowedFormats = JSON.parse(profile.allowedFormats as string || '[]');
  
  // Check file format
  const fileFormat = fileMetadata.format.toLowerCase();
  if (allowedFormats.length > 0 && !allowedFormats.includes(fileFormat)) {
    errors.push({
      type: 'format',
      severity: 'error',
      message: 'פורמט קובץ לא נתמך',
      details: `הפורמט ${fileFormat} אינו מותר להדפסה`,
      currentValue: fileFormat,
      requiredValue: allowedFormats.join(', '),
    });
  }
  
  // Check file size
  if (fileMetadata.fileSizeMb > profile.maxFileSizeMb) {
    errors.push({
      type: 'filesize',
      severity: 'error',
      message: 'קובץ גדול מדי',
      details: `גודל הקובץ ${fileMetadata.fileSizeMb.toFixed(1)}MB חורג מהמקסימום המותר`,
      currentValue: `${fileMetadata.fileSizeMb.toFixed(1)}MB`,
      requiredValue: `עד ${profile.maxFileSizeMb}MB`,
    });
  }
  
  // Check DPI
  if (fileMetadata.dpi !== undefined) {
    if (fileMetadata.dpi < profile.minDpi) {
      errors.push({
        type: 'dpi',
        severity: 'error',
        message: 'רזולוציה נמוכה מדי',
        details: `רזולוציית הקובץ ${fileMetadata.dpi} DPI נמוכה מהמינימום הנדרש להדפסה איכותית`,
        currentValue: `${fileMetadata.dpi} DPI`,
        requiredValue: `מינימום ${profile.minDpi} DPI`,
      });
    } else if (fileMetadata.dpi < profile.minDpi * 1.2) {
      // Warning if close to minimum
      warnings.push({
        type: 'dpi',
        severity: 'warning',
        message: 'רזולוציה נמוכה',
        details: `רזולוציית הקובץ ${fileMetadata.dpi} DPI קרובה למינימום הנדרש. מומלץ רזולוציה גבוהה יותר`,
        currentValue: `${fileMetadata.dpi} DPI`,
        requiredValue: `מומלץ ${Math.round(profile.minDpi * 1.5)} DPI`,
      });
    }
    
    if (profile.maxDpi && fileMetadata.dpi > profile.maxDpi) {
      warnings.push({
        type: 'dpi',
        severity: 'warning',
        message: 'רזולוציה גבוהה מדי',
        details: `רזולוציית הקובץ ${fileMetadata.dpi} DPI גבוהה מהנדרש. הקובץ יהיה גדול ללא שיפור באיכות`,
        currentValue: `${fileMetadata.dpi} DPI`,
        requiredValue: `עד ${profile.maxDpi} DPI`,
      });
    }
  }
  
  // Check colorspace
  if (fileMetadata.colorspace && allowedColorspaces.length > 0) {
    const colorspace = fileMetadata.colorspace.toUpperCase();
    if (!allowedColorspaces.map((c: string) => c.toUpperCase()).includes(colorspace)) {
      if (colorspace === 'RGB' && allowedColorspaces.includes('CMYK')) {
        errors.push({
          type: 'colorspace',
          severity: 'error',
          message: 'מרחב צבע לא מתאים להדפסה',
          details: 'הקובץ במרחב צבע RGB. להדפסה נדרש CMYK',
          currentValue: colorspace,
          requiredValue: 'CMYK',
        });
      } else {
        warnings.push({
          type: 'colorspace',
          severity: 'warning',
          message: 'מרחב צבע לא סטנדרטי',
          details: `הקובץ במרחב צבע ${colorspace}. מומלץ להמיר ל-${allowedColorspaces[0]}`,
          currentValue: colorspace,
          requiredValue: allowedColorspaces.join(' או '),
        });
      }
    }
  }
  
  // Check bleed
  if (profile.requiredBleedMm > 0) {
    if (!fileMetadata.hasBleed) {
      errors.push({
        type: 'bleed',
        severity: 'error',
        message: 'חסר שטח גלישה (Bleed)',
        details: `הקובץ חייב לכלול שטח גלישה של ${profile.requiredBleedMm}מ"מ מכל צד`,
        currentValue: 'ללא גלישה',
        requiredValue: `${profile.requiredBleedMm}מ"מ מכל צד`,
      });
    } else if (fileMetadata.bleedMm !== undefined && fileMetadata.bleedMm < profile.requiredBleedMm) {
      warnings.push({
        type: 'bleed',
        severity: 'warning',
        message: 'שטח גלישה קטן',
        details: `שטח הגלישה ${fileMetadata.bleedMm}מ"מ קטן מהנדרש`,
        currentValue: `${fileMetadata.bleedMm}מ"מ`,
        requiredValue: `${profile.requiredBleedMm}מ"מ`,
      });
    }
  }
  
  const isValid = errors.length === 0;
  
  return { isValid, warnings, errors };
}

// Quote File Warnings
export async function saveFileWarnings(
  quoteId: number,
  attachmentId: number,
  warnings: FileWarning[]
) {
  const db = await getDb();
  if (!db) return { success: false };
  
  // Delete existing warnings for this attachment
  await db.delete(quoteFileWarnings).where(eq(quoteFileWarnings.attachmentId, attachmentId));
  
  // Insert new warnings
  if (warnings.length > 0) {
    await db.insert(quoteFileWarnings).values(
      warnings.map(w => ({
        quoteId,
        attachmentId,
        warningType: w.type,
        severity: w.severity,
        message: w.message,
        details: w.details || null,
        currentValue: w.currentValue || null,
        requiredValue: w.requiredValue || null,
        isAcknowledged: false,
      }))
    );
  }
  
  return { success: true };
}

export async function getFileWarnings(quoteId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(quoteFileWarnings)
    .where(eq(quoteFileWarnings.quoteId, quoteId))
    .orderBy(desc(quoteFileWarnings.createdAt));
}

export async function getFileWarningsByAttachment(attachmentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(quoteFileWarnings)
    .where(eq(quoteFileWarnings.attachmentId, attachmentId))
    .orderBy(desc(quoteFileWarnings.createdAt));
}

export async function acknowledgeWarning(warningId: number, acknowledgedBy: number) {
  const db = await getDb();
  if (!db) return { success: false };
  
  await db.update(quoteFileWarnings)
    .set({ 
      isAcknowledged: true, 
      acknowledgedAt: new Date(),
      acknowledgedBy 
    })
    .where(eq(quoteFileWarnings.id, warningId));
  
  return { success: true };
}

export async function acknowledgeAllWarnings(quoteId: number, acknowledgedBy: number) {
  const db = await getDb();
  if (!db) return { success: false };
  
  await db.update(quoteFileWarnings)
    .set({ 
      isAcknowledged: true, 
      acknowledgedAt: new Date(),
      acknowledgedBy 
    })
    .where(and(
      eq(quoteFileWarnings.quoteId, quoteId),
      eq(quoteFileWarnings.isAcknowledged, false)
    ));
  
  return { success: true };
}


// ==================== SYSTEM SETTINGS ====================

export interface SupplierWeights {
  price: number;
  rating: number;
  deliveryTime: number;
  reliability: number;
}

const DEFAULT_SUPPLIER_WEIGHTS: SupplierWeights = {
  price: 40,
  rating: 30,
  deliveryTime: 20,
  reliability: 10
};

export async function getSupplierWeights(): Promise<SupplierWeights> {
  const db = await getDb();
  if (!db) return DEFAULT_SUPPLIER_WEIGHTS;

  const result = await db.select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'supplier_recommendation_weights'))
    .limit(1);

  if (result.length === 0) {
    return DEFAULT_SUPPLIER_WEIGHTS;
  }

  const value = result[0].value as SupplierWeights;
  return {
    price: value.price ?? DEFAULT_SUPPLIER_WEIGHTS.price,
    rating: value.rating ?? DEFAULT_SUPPLIER_WEIGHTS.rating,
    deliveryTime: value.deliveryTime ?? DEFAULT_SUPPLIER_WEIGHTS.deliveryTime,
    reliability: value.reliability ?? DEFAULT_SUPPLIER_WEIGHTS.reliability,
  };
}

export async function updateSupplierWeights(weights: SupplierWeights, updatedBy: number) {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };

  // Validate weights sum to 100
  const sum = weights.price + weights.rating + weights.deliveryTime + weights.reliability;
  if (sum !== 100) {
    return { success: false, error: `סכום המשקלים חייב להיות 100% (כרגע: ${sum}%)` };
  }

  // Validate each weight is between 0 and 100
  for (const [key, value] of Object.entries(weights)) {
    if (value < 0 || value > 100) {
      return { success: false, error: `משקל ${key} חייב להיות בין 0 ל-100` };
    }
  }

  // Check if setting exists
  const existing = await db.select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'supplier_recommendation_weights'))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(systemSettings).values({
      key: 'supplier_recommendation_weights',
      value: weights,
      description: 'משקלים להמלצות ספקים באחוזים',
      updatedBy,
    });
  } else {
    await db.update(systemSettings)
      .set({ 
        value: weights,
        updatedBy,
      })
      .where(eq(systemSettings.key, 'supplier_recommendation_weights'));
  }

  await logActivity(updatedBy, 'supplier_weights_updated', { weights });

  return { success: true };
}


// ==================== CUSTOMER SIGNUP REQUESTS ====================

import { customerSignupRequests } from "../drizzle/schema";

interface SignupRequestFile {
  originalName: string;
  storedName: string;
  size: number;
  mimeType: string;
  path: string;
}

export async function createCustomerSignupRequest(data: {
  name: string;
  email: string;
  phone: string;
  companyName: string | null;
  description: string;
  requestId: string;
  files: SignupRequestFile[];
  productId?: number | null;
  fileValidationWarnings?: any[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Try to insert with fileValidationWarnings, fallback without it if column doesn't exist
  try {
    const [result] = await db.insert(customerSignupRequests).values({
      requestId: data.requestId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      companyName: data.companyName,
      description: data.description,
      files: data.files,
      fileValidationWarnings: data.fileValidationWarnings || [],
      status: 'pending',
      productId: data.productId || null,
    }).returning();
    return result;
  } catch (error: any) {
    // If column doesn't exist, try without it
    if (error.message?.includes('fileValidationWarnings') || error.code === '42703') {
      console.log('[createCustomerSignupRequest] Falling back without fileValidationWarnings column');
      const [result] = await db.insert(customerSignupRequests).values({
        requestId: data.requestId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        companyName: data.companyName,
        description: data.description,
        files: data.files,
        status: 'pending',
        productId: data.productId || null,
      } as any).returning();

      await logActivity(null, 'customer_signup_request', {
        requestId: data.requestId,
        name: data.name,
        email: data.email,
        filesCount: data.files.length,
      });

      return result;
    }
    throw error;
  }
}

export async function getCustomerSignupRequests(status?: string) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(customerSignupRequests);
  
  if (status) {
    query = query.where(eq(customerSignupRequests.status, status)) as any;
  }

  return await query.orderBy(desc(customerSignupRequests.createdAt));
}

export async function getCustomerSignupRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.select()
    .from(customerSignupRequests)
    .where(eq(customerSignupRequests.id, id))
    .limit(1);

  return result || null;
}

export async function approveCustomerSignupRequest(requestId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the request
  const request = await getCustomerSignupRequestById(requestId);
  if (!request) throw new Error("Request not found");

  // Create user from request
  const openId = `customer-${crypto.randomUUID()}`;
  await db.insert(users).values({
    openId,
    name: request.name,
    email: request.email,
    phone: request.phone,
    companyName: request.companyName,
    role: 'customer',
    status: 'active',
  });

  // Update request status
  await db.update(customerSignupRequests)
    .set({
      status: 'approved',
      processedAt: new Date(),
      processedBy: userId,
    })
    .where(eq(customerSignupRequests.id, requestId));

  await logActivity(userId, 'customer_signup_approved', { requestId, email: request.email });

  return { success: true };
}

export async function rejectCustomerSignupRequest(requestId: number, userId: number, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(customerSignupRequests)
    .set({
      status: 'rejected',
      processedAt: new Date(),
      processedBy: userId,
      notes,
    })
    .where(eq(customerSignupRequests.id, requestId));

  await logActivity(userId, 'customer_signup_rejected', { requestId, notes });

  return { success: true };
}

// ==================== USER MANAGEMENT (SUPPLIERS/COURIERS) ====================

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result || null;
}

export async function getPendingUsers(role?: string) {
  const db = await getDb();
  if (!db) return [];

  let conditions = [eq(users.status, 'pending_approval')];
  if (role) {
    conditions.push(eq(users.role, role as any));
  }

  return await db.select()
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.id));
}

export async function getSuppliersList() {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(users)
    .where(eq(users.role, 'supplier'))
    .orderBy(desc(users.id));
}

export async function getCouriersList() {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(users)
    .where(eq(users.role, 'courier'))
    .orderBy(desc(users.id));
}

export async function approveUser(userId: number, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ status: 'active' })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'user_approved', { userId });

  return { success: true };
}

export async function rejectUser(userId: number, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ status: 'rejected' })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'user_rejected', { userId });

  return { success: true };
}

export async function deactivateUser(userId: number, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ status: 'deactivated' })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'user_deactivated', { userId });

  return { success: true };
}

export async function reactivateUser(userId: number, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ status: 'active' })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'user_reactivated', { userId });

  return { success: true };
}

// ==================== STAFF MANAGEMENT (EMPLOYEES/SUPPLIERS/COURIERS) ====================

// Default permissions for different roles
export const DEFAULT_PERMISSIONS = {
  employee: {
    canViewDashboard: true,
    canManageQuotes: true,
    canViewCustomers: true,
    canEditCustomers: false,
    canViewSuppliers: true,
    canEditSuppliers: false,
    canViewProducts: true,
    canEditProducts: false,
    canViewAnalytics: false,
    canManageSettings: false,
  },
  admin: {
    canViewDashboard: true,
    canManageQuotes: true,
    canViewCustomers: true,
    canEditCustomers: true,
    canViewSuppliers: true,
    canEditSuppliers: true,
    canViewProducts: true,
    canEditProducts: true,
    canViewAnalytics: true,
    canManageSettings: true,
  },
  supplier: {},
  courier: {},
  customer: {},
};

export interface UserPermissions {
  canViewDashboard?: boolean;
  canManageQuotes?: boolean;
  canViewCustomers?: boolean;
  canEditCustomers?: boolean;
  canViewSuppliers?: boolean;
  canEditSuppliers?: boolean;
  canViewProducts?: boolean;
  canEditProducts?: boolean;
  canViewAnalytics?: boolean;
  canManageSettings?: boolean;
}

export async function getAllStaff() {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(users)
    .where(
      inArray(users.role, ['admin', 'employee', 'supplier', 'courier'])
    )
    .orderBy(users.role, users.name);
}

export async function createStaffUser(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  companyName?: string;
  role: 'employee' | 'supplier' | 'courier';
  permissions?: UserPermissions;
}, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if email already exists
  const existing = await getUserByEmail(data.email);
  if (existing) {
    throw new Error("כתובת המייל כבר קיימת במערכת");
  }

  // Hash the password
  const bcrypt = await import('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(data.password, salt);

  const openId = `${data.role}-${crypto.randomUUID()}`;
  const defaultPerms = DEFAULT_PERMISSIONS[data.role] || {};
  
  const [newUser] = await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    password: hashedPassword,
    phone: data.phone || null,
    companyName: data.companyName || null,
    role: data.role,
    status: 'active', // Staff created by admin are active immediately
    permissions: data.permissions || defaultPerms,
    loginMethod: 'email',
  }).returning();

  await logActivity(adminId, 'staff_user_created', { 
    userId: newUser.id, 
    role: data.role,
    email: data.email 
  });

  return newUser;
}

export async function updateUserPermissions(userId: number, permissions: UserPermissions, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ 
      permissions,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'user_permissions_updated', { userId, permissions });

  return { success: true };
}

export async function updateUserRole(userId: number, role: string, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get default permissions for new role
  const defaultPerms = DEFAULT_PERMISSIONS[role as keyof typeof DEFAULT_PERMISSIONS] || {};

  await db.update(users)
    .set({ 
      role: role as any,
      permissions: defaultPerms,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'user_role_updated', { userId, role });

  return { success: true };
}

export async function updateStaffUser(userId: number, data: {
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
}, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // If email is being changed, check it doesn't exist
  if (data.email) {
    const existing = await getUserByEmail(data.email);
    if (existing && existing.id !== userId) {
      throw new Error("כתובת המייל כבר קיימת במערכת");
    }
  }

  await db.update(users)
    .set({ 
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'staff_user_updated', { userId, ...data });

  return { success: true };
}

export async function deleteStaffUser(userId: number, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Don't allow deleting yourself
  if (userId === adminId) {
    throw new Error("לא ניתן למחוק את המשתמש שלך");
  }

  // Soft delete - just deactivate
  await db.update(users)
    .set({ 
      status: 'deactivated',
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'staff_user_deleted', { userId });

  return { success: true };
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result || null;
}


// ==================== JOBS API ====================

export async function getActiveJobs() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      sj.id,
      sj."quoteId",
      sj."supplierId",
      sj."customerId",
      sj."sizeQuantityId",
      sj.quantity,
      sj."pricePerUnit",
      sj.status,
      sj."supplierMarkedReady",
      sj."supplierReadyAt",
      sj."createdAt",
      sj."fileValidationWarnings",
      supplier.name as "supplierName",
      supplier."companyName" as "supplierCompany",
      customer.name as "customerName",
      customer."companyName" as "customerCompany",
      ps.name as "sizeName",
      ps.dimensions as "dimensions",
      bp.name as "productName"
    FROM supplier_jobs sj
    LEFT JOIN users supplier ON sj."supplierId" = supplier.id
    LEFT JOIN users customer ON sj."customerId" = customer.id
    LEFT JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
    LEFT JOIN product_sizes ps ON sq.size_id = ps.id
    LEFT JOIN base_products bp ON ps.product_id = bp.id
    ORDER BY sj.id DESC
  `);

  return result.rows.map((row: any) => ({
    id: row.id,
    quoteId: row.quoteId,
    supplierId: row.supplierId,
    customerId: row.customerId,
    sizeQuantityId: row.sizeQuantityId,
    quantity: row.quantity,
    pricePerUnit: row.pricePerUnit,
    status: row.status,
    supplierMarkedReady: row.supplierMarkedReady,
    supplierReadyAt: row.supplierReadyAt,
    createdAt: row.createdAt,
    fileValidationWarnings: row.fileValidationWarnings || [],
    supplierName: row.supplierName || 'ספק לא מזוהה',
    supplierCompany: row.supplierCompany,
    customerName: row.customerName || 'לקוח לא מזוהה',
    customerCompany: row.customerCompany,
    productName: row.productName ? `${row.productName} - ${row.sizeName}` : 'מוצר לא מזוהה',
    sizeName: row.sizeName,
    dimensions: row.dimensions,
  }));
}

export async function getJobsReadyForPickup() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      sj.id,
      sj."supplierId",
      sj."customerId",
      sj."sizeQuantityId",
      sj.quantity,
      sj."supplierReadyAt",
      supplier.name as "supplierName",
      supplier."companyName" as "supplierCompany",
      supplier.address as "supplierAddress",
      customer.name as "customerName",
      customer."companyName" as "customerCompany",
      customer.address as "customerAddress",
      ps.name as "sizeName",
      ps.dimensions as "dimensions",
      bp.name as "productName"
    FROM supplier_jobs sj
    LEFT JOIN users supplier ON sj."supplierId" = supplier.id
    LEFT JOIN users customer ON sj."customerId" = customer.id
    LEFT JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
    LEFT JOIN product_sizes ps ON sq.size_id = ps.id
    LEFT JOIN base_products bp ON ps.product_id = bp.id
    WHERE sj.status = 'ready'
    ORDER BY sj."supplierReadyAt" ASC
  `);

  return result.rows.map((row: any) => ({
    id: row.id,
    supplierId: row.supplierId,
    customerId: row.customerId,
    sizeQuantityId: row.sizeQuantityId,
    quantity: row.quantity,
    supplierReadyAt: row.supplierReadyAt,
    supplierName: row.supplierName || 'ספק לא מזוהה',
    supplierCompany: row.supplierCompany,
    supplierAddress: row.supplierAddress,
    customerName: row.customerName || 'לקוח לא מזוהה',
    customerCompany: row.customerCompany,
    customerAddress: row.customerAddress,
    productName: row.productName ? `${row.productName} - ${row.sizeName}` : 'מוצר לא מזוהה',
    sizeName: row.sizeName,
    dimensions: row.dimensions,
  }));
}

export async function updateJobStatus(jobId: number, status: string, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status };
  
  // Set timestamps based on status
  if (status === 'ready') {
    updateData.supplierMarkedReady = true;
    updateData.supplierReadyAt = new Date();
  } else if (status === 'picked_up') {
    updateData.pickedUpAt = new Date();
    if (userId) updateData.courierId = userId;
  } else if (status === 'delivered') {
    updateData.deliveredAt = new Date();
    updateData.actualDeliveryDate = new Date();
  }

  await db.execute(sql`
    UPDATE supplier_jobs 
    SET 
      status = ${status},
      ${status === 'ready' ? sql`"supplierMarkedReady" = true, "supplierReadyAt" = NOW(),` : sql``}
      ${status === 'picked_up' ? sql`"pickedUpAt" = NOW(),` : sql``}
      ${status === 'delivered' ? sql`"deliveredAt" = NOW(), "actualDeliveryDate" = CURRENT_DATE,` : sql``}
      "updatedAt" = NOW()
    WHERE id = ${jobId}
  `);

  return { success: true };
}


// ==================== PRODUCT SIZES, QUANTITIES, ADDONS ====================

// productSizes and sizeQuantities already imported at top

// Get product with all details (sizes, quantities, addons)
export async function getProductWithDetails(productId: number) {
  const db = await getDb();
  if (!db) return null;

  const [product] = await db.select()
    .from(baseProducts)
    .where(eq(baseProducts.id, productId))
    .limit(1);

  if (!product) return null;

  const sizes = await db.select()
    .from(productSizes)
    .where(and(eq(productSizes.productId, productId), eq(productSizes.isActive, true)))
    .orderBy(productSizes.displayOrder);

  // Get all size quantities for all sizes of this product
  const sizeIds = sizes.map(s => s.id);
  const quantities = sizeIds.length > 0 ? await db.select()
    .from(sizeQuantities)
    .where(inArray(sizeQuantities.sizeId, sizeIds))
    .orderBy(sizeQuantities.displayOrder) : [];

  const addons = await db.select()
    .from(productAddons)
    .where(and(
      sql`(${productAddons.productId} = ${productId} OR ${productAddons.productId} IS NULL)`,
      eq(productAddons.isActive, true)
    ))
    .orderBy(productAddons.name);

  return {
    ...product,
    sizes,
    quantities,
    addons,
  };
}

// Get all products with their sizes, quantities, and addons
export async function getProductsWithDetails(categoryId?: number) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select()
    .from(baseProducts)
    .where(eq(baseProducts.isActive, true))
    .orderBy(baseProducts.categoryId, baseProducts.name);

  const products = categoryId 
    ? await db.select().from(baseProducts).where(and(eq(baseProducts.isActive, true), eq(baseProducts.categoryId, categoryId))).orderBy(baseProducts.name)
    : await db.select().from(baseProducts).where(eq(baseProducts.isActive, true)).orderBy(baseProducts.categoryId, baseProducts.name);

  const productsWithDetails = await Promise.all(products.map(async (product) => {
    const sizes = await db.select()
      .from(productSizes)
      .where(and(eq(productSizes.productId, product.id), eq(productSizes.isActive, true)))
      .orderBy(productSizes.displayOrder);

    // Get quantities for all sizes of this product
    const sizeIds = sizes.map(s => s.id);
    const quantities = sizeIds.length > 0 ? await db.select()
      .from(sizeQuantities)
      .where(inArray(sizeQuantities.sizeId, sizeIds))
      .orderBy(sizeQuantities.displayOrder) : [];

    const addons = await db.select()
      .from(productAddons)
      .where(and(
        sql`(${productAddons.productId} = ${product.id} OR ${productAddons.categoryId} = ${product.categoryId} OR (${productAddons.productId} IS NULL AND ${productAddons.categoryId} IS NULL))`,
        eq(productAddons.isActive, true)
      ))
      .orderBy(productAddons.name);

    return {
      ...product,
      sizes,
      quantities,
      addons,
    };
  }));

  return productsWithDetails;
}

// ===== SIZES =====
export async function createProductSize(input: {
  productId: number;
  name: string;
  dimensions?: string;
  basePrice: number;
  displayOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(productSizes).values({
    productId: input.productId,
    name: input.name,
    dimensions: input.dimensions || null,
    basePrice: input.basePrice.toString(),
    displayOrder: input.displayOrder || 0,
    isActive: true,
  });

  return { success: true };
}

export async function updateProductSize(input: {
  id: number;
  name?: string;
  dimensions?: string;
  basePrice?: number;
  displayOrder?: number;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.dimensions !== undefined) updateData.dimensions = input.dimensions;
  if (input.basePrice !== undefined) updateData.basePrice = input.basePrice.toString();
  if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  await db.update(productSizes)
    .set(updateData)
    .where(eq(productSizes.id, input.id));

  return { success: true };
}

export async function deleteProductSize(sizeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(productSizes)
    .set({ isActive: false })
    .where(eq(productSizes.id, sizeId));

  return { success: true };
}

// ===== SIZE QUANTITIES =====
export async function createProductQuantity(input: {
  productId: number; // actually sizeId now
  quantity: number;
  priceMultiplier: number; // actually price now
  displayOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Note: productId is actually sizeId in the new schema
  await db.insert(sizeQuantities).values({
    sizeId: input.productId,
    quantity: input.quantity,
    price: input.priceMultiplier.toString(),
    displayOrder: input.displayOrder || 0,
    isActive: true,
  });

  return { success: true };
}

export async function updateProductQuantity(input: {
  id: number;
  quantity?: number;
  priceMultiplier?: number; // actually price
  displayOrder?: number;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.quantity !== undefined) updateData.quantity = input.quantity;
  if (input.priceMultiplier !== undefined) updateData.price = input.priceMultiplier.toString();
  if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  await db.update(sizeQuantities)
    .set(updateData)
    .where(eq(sizeQuantities.id, input.id));

  return { success: true };
}

export async function deleteProductQuantity(quantityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(sizeQuantities)
    .set({ isActive: false })
    .where(eq(sizeQuantities.id, quantityId));

  return { success: true };
}

// ===== ADDONS =====
export async function createProductAddon(input: {
  productId?: number;
  categoryId?: number;
  name: string;
  description?: string;
  priceType: 'fixed' | 'percentage' | 'per_unit';
  price: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(productAddons).values({
    productId: input.productId || null,
    categoryId: input.categoryId || null,
    name: input.name,
    description: input.description || null,
    priceType: input.priceType,
    price: input.price.toString(),
    isActive: true,
  });

  return { success: true };
}

export async function updateProductAddon(input: {
  id: number;
  name?: string;
  description?: string;
  priceType?: 'fixed' | 'percentage' | 'per_unit';
  price?: number;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.priceType !== undefined) updateData.priceType = input.priceType;
  if (input.price !== undefined) updateData.price = input.price.toString();
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  await db.update(productAddons)
    .set(updateData)
    .where(eq(productAddons.id, input.id));

  return { success: true };
}

export async function deleteProductAddon(addonId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(productAddons)
    .set({ isActive: false })
    .where(eq(productAddons.id, addonId));

  return { success: true };
}

// ===== PRICE CALCULATION =====
export async function calculateProductPrice(input: {
  productId: number;
  sizeId: number;
  quantityId?: number;
  customQuantity?: number;
  addonIds?: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get size base price
  const [size] = await db.select()
    .from(productSizes)
    .where(eq(productSizes.id, input.sizeId))
    .limit(1);

  if (!size) throw new Error("Size not found");

  let basePrice = parseFloat(size.basePrice || '0');
  let multiplier = 1;
  let isCustomQuantity = false;

  // Get quantity price from sizeQuantities
  if (input.quantityId) {
    const [quantity] = await db.select()
      .from(sizeQuantities)
      .where(eq(sizeQuantities.id, input.quantityId))
      .limit(1);

    if (quantity) {
      // In new schema, price is direct not multiplier
      basePrice = parseFloat(quantity.price || '0');
      multiplier = 1;
    }
  } else if (input.customQuantity) {
    isCustomQuantity = true;
    // For custom quantity, return null price (manual pricing required)
  }

  let subtotal = basePrice * multiplier;
  let addonsTotal = 0;

  // Calculate addons
  if (input.addonIds && input.addonIds.length > 0) {
    const addons = await db.select()
      .from(productAddons)
      .where(sql`${productAddons.id} IN (${input.addonIds.join(',')})`);

    for (const addon of addons) {
      const addonPrice = parseFloat(addon.price || '0');
      if (addon.priceType === 'fixed') {
        addonsTotal += addonPrice;
      } else if (addon.priceType === 'percentage') {
        addonsTotal += subtotal * (addonPrice / 100);
      } else if (addon.priceType === 'per_unit' && input.customQuantity) {
        addonsTotal += addonPrice * input.customQuantity;
      }
    }
  }

  const totalPrice = isCustomQuantity ? null : subtotal + addonsTotal;

  return {
    basePrice,
    multiplier,
    subtotal,
    addonsTotal,
    totalPrice,
    isCustomQuantity,
    requiresManualPricing: isCustomQuantity,
  };
}


// ==================== EMAIL SETTINGS ====================

export type EmailOnStatusChange = 'ask' | 'auto' | 'never';

export async function getEmailOnStatusChangeSetting(): Promise<EmailOnStatusChange> {
  const db = await getDb();
  if (!db) return 'ask';

  const result = await db.select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'email_on_status_change'))
    .limit(1);

  if (result.length === 0) {
    return 'ask';
  }

  const value = result[0].value as string;
  if (value === 'auto' || value === 'never' || value === 'ask') {
    return value;
  }
  return 'ask';
}

export async function setEmailOnStatusChangeSetting(value: EmailOnStatusChange, updatedBy?: number): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'email_on_status_change'))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(systemSettings).values({
      key: 'email_on_status_change',
      value: value,
      description: 'התנהגות שליחת מייל בשינוי סטטוס: ask (לשאול), auto (אוטומטי), never (לא לשלוח)',
      updatedBy,
    });
  } else {
    await db.update(systemSettings)
      .set({ 
        value: value,
        updatedBy,
      })
      .where(eq(systemSettings.key, 'email_on_status_change'));
  }

  return { success: true };
}


// ==================== SUPPLIER JOBS DATA & SCORING ====================

import { supplierJobs } from "../drizzle/schema";

// Get all jobs history for a specific supplier
export async function getSupplierJobsHistory(supplierId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      sj.id,
      sj."quoteId",
      sj."customerId",
      sj."sizeQuantityId",
      sj.quantity,
      sj."pricePerUnit",
      sj.status,
      sj."supplierMarkedReady",
      sj."supplierReadyAt",
      sj."courierConfirmedReady",
      sj."supplierRating",
      sj."promisedDeliveryDays",
      sj."createdAt",
      customer.name as "customerName",
      customer."companyName" as "customerCompany",
      ps.name as "sizeName",
      bp.name as "productName",
      CASE 
        WHEN sj."supplierReadyAt" IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (sj."supplierReadyAt" - sj."createdAt")) / 86400
        ELSE NULL
      END as "actualDeliveryDays"
    FROM supplier_jobs sj
    LEFT JOIN users customer ON sj."customerId" = customer.id
    LEFT JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
    LEFT JOIN product_sizes ps ON sq.size_id = ps.id
    LEFT JOIN base_products bp ON ps.product_id = bp.id
    WHERE sj."supplierId" = ${supplierId}
    ORDER BY sj.id DESC
  `);

  return result.rows.map((row: any) => ({
    id: row.id,
    quoteId: row.quoteId,
    customerId: row.customerId,
    sizeQuantityId: row.sizeQuantityId,
    quantity: row.quantity,
    pricePerUnit: row.pricePerUnit,
    status: row.status,
    supplierMarkedReady: row.supplierMarkedReady,
    supplierReadyAt: row.supplierReadyAt,
    courierConfirmedReady: row.courierConfirmedReady,
    supplierRating: row.supplierRating ? parseFloat(row.supplierRating) : null,
    promisedDeliveryDays: row.promisedDeliveryDays,
    createdAt: row.createdAt,
    customerName: row.customerName || 'לקוח לא מזוהה',
    customerCompany: row.customerCompany,
    productName: row.productName ? `${row.productName} - ${row.sizeName}` : 'מוצר לא מזוהה',
    actualDeliveryDays: row.actualDeliveryDays ? parseFloat(row.actualDeliveryDays) : null,
  }));
}

// Update supplier job data (admin only)
// SQL INJECTION FIX: Using Drizzle ORM instead of raw SQL string concatenation
export async function updateSupplierJobData(
  jobId: number, 
  data: {
    supplierRating?: number;
    courierConfirmedReady?: boolean;
    promisedDeliveryDays?: number;
    supplierReadyAt?: Date | null;
  },
  adminId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate jobId is a positive integer to prevent any injection attempts
  if (!Number.isInteger(jobId) || jobId <= 0) {
    throw new Error("Invalid job ID");
  }

  // Build update object safely - only include defined fields
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.supplierRating !== undefined) {
    // Validate rating is a reasonable number
    if (typeof data.supplierRating !== 'number' || data.supplierRating < 0 || data.supplierRating > 10) {
      throw new Error("Invalid supplier rating - must be between 0 and 10");
    }
    updateData.supplierRating = data.supplierRating.toString();
  }
  
  if (data.courierConfirmedReady !== undefined) {
    if (typeof data.courierConfirmedReady !== 'boolean') {
      throw new Error("Invalid courierConfirmedReady value - must be boolean");
    }
    updateData.courierConfirmedReady = data.courierConfirmedReady;
  }
  
  if (data.promisedDeliveryDays !== undefined) {
    if (!Number.isInteger(data.promisedDeliveryDays) || data.promisedDeliveryDays < 0 || data.promisedDeliveryDays > 365) {
      throw new Error("Invalid promisedDeliveryDays - must be integer between 0 and 365");
    }
    updateData.promisedDeliveryDays = data.promisedDeliveryDays;
  }
  
  if (data.supplierReadyAt !== undefined) {
    if (data.supplierReadyAt !== null && !(data.supplierReadyAt instanceof Date)) {
      throw new Error("Invalid supplierReadyAt - must be Date or null");
    }
    updateData.supplierReadyAt = data.supplierReadyAt;
  }

  // Check if there are any fields to update (besides updatedAt)
  if (Object.keys(updateData).length <= 1) {
    return { success: false, error: 'No fields to update' };
  }

  // Use Drizzle ORM for safe parameterized query
  await db.update(supplierJobs)
    .set(updateData)
    .where(eq(supplierJobs.id, jobId));

  await logActivity(adminId, 'supplier_job_data_updated', { jobId, ...data });

  return { success: true };
}

// Get detailed score breakdown for a supplier (using the new algorithm)
export async function getSupplierScoreDetails(supplierId: number) {
  const db = await getDb();
  if (!db) return null;

  // Get all completed jobs for this supplier
  const jobsResult = await db.execute(sql`
    SELECT 
      id,
      "supplierRating",
      "courierConfirmedReady",
      "promisedDeliveryDays",
      "createdAt",
      "supplierReadyAt",
      status
    FROM supplier_jobs
    WHERE "supplierId" = ${supplierId}
  `);

  const jobs = jobsResult.rows as any[];
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.supplierReadyAt !== null);

  // Calculate base score based on experience
  let baseScore: number;
  if (totalJobs === 0) {
    baseScore = 70;
  } else if (totalJobs < 5) {
    baseScore = 80;
  } else if (totalJobs < 10) {
    baseScore = 90;
  } else {
    baseScore = 100;
  }

  // Calculate price score
  const priceResult = await db.execute(sql`
    WITH supplier_avg AS (
      SELECT AVG(CAST("pricePerUnit" AS DECIMAL)) as avg_price
      FROM supplier_prices
      WHERE "supplierId" = ${supplierId}
    ),
    market_avg AS (
      SELECT AVG(CAST("pricePerUnit" AS DECIMAL)) as avg_price
      FROM supplier_prices
    )
    SELECT 
      supplier_avg.avg_price as supplier_price,
      market_avg.avg_price as market_price
    FROM supplier_avg, market_avg
  `);

  const priceRow = priceResult.rows[0] as any;
  const supplierPrice = parseFloat(priceRow?.supplier_price) || 0;
  const marketPrice = parseFloat(priceRow?.market_price) || 0;

  let priceScore = 0;
  let priceDiff = 0;
  if (marketPrice > 0 && supplierPrice > 0) {
    priceDiff = ((marketPrice - supplierPrice) / marketPrice) * 100;
    priceScore = Math.max(-10, Math.min(10, priceDiff * 0.5));
  }

  // Calculate promise keeping score
  let promiseScore = 0;
  let promiseRate = 0;
  const jobsWithPromise = completedJobs.filter(j => j.promisedDeliveryDays !== null);
  if (jobsWithPromise.length > 0) {
    const onTimeJobs = jobsWithPromise.filter(j => {
      const actualDays = (new Date(j.supplierReadyAt).getTime() - new Date(j.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return actualDays <= j.promisedDeliveryDays;
    });
    promiseRate = (onTimeJobs.length / jobsWithPromise.length) * 100;
    promiseScore = Math.max(-8, Math.min(8, (promiseRate - 80) * 0.4));
  }

  // Calculate courier confirmation score
  let courierScore = 0;
  let courierRate = 0;
  const jobsWithCourierData = completedJobs.filter(j => j.courierConfirmedReady !== null);
  if (jobsWithCourierData.length > 0) {
    const confirmedJobs = jobsWithCourierData.filter(j => j.courierConfirmedReady === true);
    courierRate = (confirmedJobs.length / jobsWithCourierData.length) * 100;
    courierScore = Math.max(-6, Math.min(6, (courierRate - 80) * 0.3));
  }

  // Calculate early completion bonus
  let earlyBonus = 0;
  let avgEarlyDays = 0;
  if (jobsWithPromise.length > 0) {
    const earlyDays = jobsWithPromise.map(j => {
      const actualDays = (new Date(j.supplierReadyAt).getTime() - new Date(j.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return j.promisedDeliveryDays - actualDays;
    }).filter(d => d > 0);
    
    if (earlyDays.length > 0) {
      avgEarlyDays = earlyDays.reduce((a, b) => a + b, 0) / earlyDays.length;
      earlyBonus = Math.min(3, avgEarlyDays);
    }
  }

  // Calculate current workload penalty
  const openJobsResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM supplier_jobs
    WHERE "supplierId" = ${supplierId} AND status IN ('pending', 'in_progress')
  `);
  const openJobs = parseInt((openJobsResult.rows[0] as any)?.count) || 0;
  const workloadPenalty = Math.min(3, openJobs * 0.5);

  // Calculate consistency score (stability)
  let consistencyScore = 0;
  if (completedJobs.length >= 3) {
    const deliveryTimes = completedJobs.map(j => {
      return (new Date(j.supplierReadyAt).getTime() - new Date(j.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    });
    const avgTime = deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length;
    const variance = deliveryTimes.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / deliveryTimes.length;
    const stdDev = Math.sqrt(variance);
    const cv = avgTime > 0 ? (stdDev / avgTime) * 100 : 0;
    consistencyScore = Math.max(0, Math.min(2, 2 - cv * 0.1));
  }

  // Calculate total score
  const totalScore = baseScore + priceScore + promiseScore + courierScore + earlyBonus - workloadPenalty + consistencyScore;

  return {
    supplierId,
    totalJobs,
    completedJobs: completedJobs.length,
    scores: {
      base: {
        value: baseScore,
        description: totalJobs === 0 ? 'ספק חדש' : 
                     totalJobs < 5 ? '1-4 עבודות' :
                     totalJobs < 10 ? '5-9 עבודות' : '10+ עבודות'
      },
      price: {
        value: Math.round(priceScore * 10) / 10,
        diff: Math.round(priceDiff * 10) / 10,
        supplierAvg: Math.round(supplierPrice),
        marketAvg: Math.round(marketPrice),
        description: priceDiff > 0 ? `זול ב-${Math.round(priceDiff)}%` : 
                     priceDiff < 0 ? `יקר ב-${Math.round(Math.abs(priceDiff))}%` : 'ממוצע'
      },
      promise: {
        value: Math.round(promiseScore * 10) / 10,
        rate: Math.round(promiseRate),
        description: `${Math.round(promiseRate)}% עמידה בהבטחות`
      },
      courier: {
        value: Math.round(courierScore * 10) / 10,
        rate: Math.round(courierRate),
        description: `${Math.round(courierRate)}% אישור שליח`
      },
      early: {
        value: Math.round(earlyBonus * 10) / 10,
        avgDays: Math.round(avgEarlyDays * 10) / 10,
        description: avgEarlyDays > 0 ? `ממוצע ${Math.round(avgEarlyDays * 10) / 10} ימים מוקדם` : 'ללא סיום מוקדם'
      },
      workload: {
        value: -Math.round(workloadPenalty * 10) / 10,
        openJobs,
        description: `${openJobs} עבודות פתוחות`
      },
      consistency: {
        value: Math.round(consistencyScore * 10) / 10,
        description: consistencyScore > 1.5 ? 'עקבי מאוד' :
                     consistencyScore > 0.5 ? 'עקבי' : 'משתנה'
      }
    },
    totalScore: Math.round(totalScore * 10) / 10
  };
}
