import { eq, desc, sql, and, count, inArray, like, gte, lte, SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import crypto from "crypto";
import { 
  InsertUser, 
  users, 
  quotes, 
  activityLog,
  baseProducts,
  productVariants,
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
    .orderBy(desc(users.createdAt))
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
    .orderBy(desc(users.createdAt))
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
  .orderBy(desc(quotes.createdAt))
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
    productVariantId: quoteItems.productVariantId,
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
    productVariantId: number;
    quantity: number;
  }[];
}

export async function createQuoteRequest(data: CreateQuoteRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get next quote number from sequence
  const [seqResult] = await db.execute(sql`SELECT nextval('quote_number_seq') as next_num`);
  const quoteNumber = Number((seqResult as any).next_num);

  const [result] = await db.insert(quotes).values({
    customerId: data.customerId,
    status: "draft",
    version: 1,
    quoteNumber: quoteNumber,
  });

  const quoteId = result.insertId;

  if (data.items && data.items.length > 0) {
    for (const item of data.items) {
      await db.insert(quoteItems).values({
        quoteId: Number(quoteId),
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        priceAtTimeOfQuote: "0",
      });
    }
  }

  await db.insert(activityLog).values({
    userId: data.customerId,
    actionType: "QUOTE_REQUESTED",
    details: { quoteId: Number(quoteId) },
  });

  return { id: Number(quoteId), success: true };
}

export interface UpdateQuoteRequest {
  quoteId: number;
  employeeId: number;
  items?: {
    productVariantId: number;
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
        productVariantId: item.productVariantId,
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
      productVariantId: item.productVariantId,
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

export interface CreateVariantInput {
  baseProductId: number;
  sku: string;
  name: string;
  price?: number;
  pricingType?: string;
  attributes?: Record<string, unknown>;
  validationProfileId?: number;
}

export interface UpdateVariantInput {
  id: number;
  sku?: string;
  name?: string;
  price?: number;
  pricingType?: string;
  attributes?: Record<string, unknown>;
  validationProfileId?: number;
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

  // Get variants for each product
  const productsWithVariants = await Promise.all(
    filtered.map(async (product) => {
      const variants = await db.select({
        id: productVariants.id,
        sku: productVariants.sku,
        name: productVariants.name,
        price: productVariants.price,
        pricingType: productVariants.pricingType,
        attributes: productVariants.attributes,
        validationProfileId: productVariants.validationProfileId,
        isActive: productVariants.isActive,
        createdAt: productVariants.createdAt,
      })
      .from(productVariants)
      .where(eq(productVariants.baseProductId, product.id));

      return {
        ...product,
        variants,
        variantCount: variants.length,
      };
    })
  );

  return productsWithVariants;
}

export async function getProductById(productId: number) {
  const db = await getDb();
  if (!db) return null;

  const [product] = await db.select()
    .from(baseProducts)
    .where(eq(baseProducts.id, productId))
    .limit(1);

  if (!product) return null;

  const variants = await db.select()
    .from(productVariants)
    .where(eq(productVariants.baseProductId, productId));

  return {
    ...product,
    variants,
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
  });

  const insertId = result[0].insertId;
  
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

  // Also deactivate all variants
  await db.update(productVariants)
    .set({ isActive: false })
    .where(eq(productVariants.baseProductId, productId));

  await logActivity(null, "product_deleted", { productId });

  return { success: true };
}

export async function createVariant(input: CreateVariantInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if product exists
  const [product] = await db.select()
    .from(baseProducts)
    .where(eq(baseProducts.id, input.baseProductId))
    .limit(1);

  if (!product) {
    throw new Error("Base product not found");
  }

  // Check if SKU is unique
  const [existingSku] = await db.select()
    .from(productVariants)
    .where(eq(productVariants.sku, input.sku))
    .limit(1);

  if (existingSku) {
    throw new Error("SKU already exists");
  }

  const result = await db.insert(productVariants).values({
    baseProductId: input.baseProductId,
    sku: input.sku,
    name: input.name,
    price: input.price?.toString() || null,
    pricingType: input.pricingType || 'fixed',
    attributes: input.attributes || null,
    validationProfileId: input.validationProfileId || null,
    isActive: true,
  });

  const insertId = result[0].insertId;

  await logActivity(null, "variant_created", { 
    variantId: insertId, 
    productId: input.baseProductId,
    sku: input.sku 
  });

  return { id: insertId, ...input };
}

export async function updateVariant(input: UpdateVariantInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.sku !== undefined) {
    // Check if new SKU is unique
    const [existingSku] = await db.select()
      .from(productVariants)
      .where(and(
        eq(productVariants.sku, input.sku),
        sql`${productVariants.id} != ${input.id}`
      ))
      .limit(1);

    if (existingSku) {
      throw new Error("SKU already exists");
    }
    updateData.sku = input.sku;
  }
  if (input.name !== undefined) updateData.name = input.name;
  if (input.price !== undefined) updateData.price = input.price.toString();
  if (input.pricingType !== undefined) updateData.pricingType = input.pricingType;
  if (input.attributes !== undefined) updateData.attributes = input.attributes;
  if (input.validationProfileId !== undefined) updateData.validationProfileId = input.validationProfileId;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields to update");
  }

  await db.update(productVariants)
    .set(updateData)
    .where(eq(productVariants.id, input.id));

  await logActivity(null, "variant_updated", { variantId: input.id, changes: updateData });

  const [updated] = await db.select()
    .from(productVariants)
    .where(eq(productVariants.id, input.id))
    .limit(1);

  return updated;
}

export async function deleteVariant(variantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete
  await db.update(productVariants)
    .set({ isActive: false })
    .where(eq(productVariants.id, variantId));

  await logActivity(null, "variant_deleted", { variantId });

  return { success: true };
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
    .orderBy(desc(users.createdAt));

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
    .orderBy(desc(users.createdAt));

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

  // Get supplier prices
  const prices = await db.select({
    id: supplierPrices.id,
    variantId: supplierPrices.productVariantId,
    price: supplierPrices.pricePerUnit,
    deliveryDays: supplierPrices.deliveryDays,
    minQuantity: supplierPrices.minQuantity,
    qualityRating: supplierPrices.qualityRating,
    updatedAt: supplierPrices.updatedAt,
  })
    .from(supplierPrices)
    .where(eq(supplierPrices.supplierId, id));

  // Get open jobs count
  const openJobsResult = await db.select({
    count: sql<number>`count(*)`,
  })
    .from(quoteItems)
    .where(eq(quoteItems.supplierId, id));

  return {
    ...supplier[0],
    prices,
    openJobsCount: Number(openJobsResult[0]?.count || 0),
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
  const [seqResult] = await db.execute(sql`SELECT nextval('supplier_number_seq') as next_num`);
  const supplierNumber = Number((seqResult as any).next_num);

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
    variantId: supplierPrices.productVariantId,
    variantName: productVariants.name,
    variantSku: productVariants.sku,
    productName: baseProducts.name,
    price: supplierPrices.pricePerUnit,
    deliveryDays: supplierPrices.deliveryDays,
    minQuantity: supplierPrices.minQuantity,
    qualityRating: supplierPrices.qualityRating,
    updatedAt: supplierPrices.updatedAt,
  })
    .from(supplierPrices)
    .innerJoin(productVariants, eq(supplierPrices.productVariantId, productVariants.id))
    .innerJoin(baseProducts, eq(productVariants.baseProductId, baseProducts.id))
    .where(eq(supplierPrices.supplierId, supplierId))
    .orderBy(baseProducts.name, productVariants.name);
}

export async function updateSupplierPrice(input: {
  supplierId: number;
  variantId: number;
  price: number;
  deliveryDays?: number;
  minQuantity?: number;
  isPreferred?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if price exists
  const existing = await db.select()
    .from(supplierPrices)
    .where(and(
      eq(supplierPrices.supplierId, input.supplierId),
      eq(supplierPrices.productVariantId, input.variantId)
    ))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db.update(supplierPrices)
      .set({
        pricePerUnit: input.price.toString(),
        deliveryDays: input.deliveryDays ?? existing[0].deliveryDays,
        minQuantity: input.minQuantity ?? existing[0].minQuantity,
      })
      .where(eq(supplierPrices.id, existing[0].id));
  } else {
    // Create new
    await db.insert(supplierPrices).values({
      supplierId: input.supplierId,
      productVariantId: input.variantId,
      pricePerUnit: input.price.toString(),
      deliveryDays: input.deliveryDays ?? 3,
      minQuantity: input.minQuantity ?? 1,
    });
  }

  await logActivity(null, "supplier_price_updated", { 
    supplierId: input.supplierId, 
    variantId: input.variantId, 
    price: input.price 
  });

  return { success: true };
}

export async function deleteSupplierPrice(supplierId: number, variantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(supplierPrices)
    .where(and(
      eq(supplierPrices.supplierId, supplierId),
      eq(supplierPrices.productVariantId, variantId)
    ));

  return { success: true };
}

export async function getSupplierOpenJobs(supplierId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select({
    quoteItemId: quoteItems.id,
    quoteId: quoteItems.quoteId,
    variantId: quoteItems.productVariantId,
    variantName: productVariants.name,
    productName: baseProducts.name,
    quantity: quoteItems.quantity,
    supplierCost: quoteItems.supplierCost,
    deliveryDays: quoteItems.deliveryDays,
    quoteStatus: quotes.status,
    quoteCreatedAt: quotes.createdAt,
  })
    .from(quoteItems)
    .innerJoin(quotes, eq(quoteItems.quoteId, quotes.id))
    .innerJoin(productVariants, eq(quoteItems.productVariantId, productVariants.id))
    .innerJoin(baseProducts, eq(productVariants.baseProductId, baseProducts.id))
    .where(and(
      eq(quoteItems.supplierId, supplierId),
      inArray(quotes.status, ['approved', 'in_production'])
    ))
    .orderBy(desc(quotes.createdAt));
}

// Weighted Supplier Recommendation Engine
export async function getSupplierRecommendations(variantId: number, quantity: number) {
  const db = await getDb();
  if (!db) return [];

  // Get weights from settings
  const weights = await getSupplierWeights();

  // Get all suppliers with prices for this variant
  const suppliers = await db.select({
    supplierId: supplierPrices.supplierId,
    supplierName: users.name,
    supplierCompany: users.companyName,
    price: supplierPrices.pricePerUnit,
    deliveryDays: supplierPrices.deliveryDays,
    minQuantity: supplierPrices.minQuantity,
    qualityRating: supplierPrices.qualityRating,
    totalRatingPoints: users.totalRatingPoints,
    ratedDealsCount: users.ratedDealsCount,
  })
    .from(supplierPrices)
    .innerJoin(users, eq(supplierPrices.supplierId, users.id))
    .where(and(
      eq(supplierPrices.productVariantId, variantId),
      eq(users.status, 'active'),
      sql`${supplierPrices.minQuantity} <= ${quantity}`
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

  // Get quote items that are ready for pickup (quote status = 'ready')
  const results = await db.select({
    id: quoteItems.id,
    quoteId: quoteItems.quoteId,
    productName: baseProducts.name,
    variantName: productVariants.name,
    quantity: quoteItems.quantity,
    supplierId: quoteItems.supplierId,
    supplierName: users.name,
    supplierCompany: users.companyName,
    supplierAddress: users.address,
    supplierPhone: users.phone,
    customerId: quotes.customerId,
    pickedUp: quoteItems.pickedUp,
    pickedUpAt: quoteItems.pickedUpAt,
    delivered: quoteItems.delivered,
    deliveredAt: quoteItems.deliveredAt,
    readyAt: quotes.updatedAt,
  })
    .from(quoteItems)
    .innerJoin(quotes, eq(quoteItems.quoteId, quotes.id))
    .innerJoin(productVariants, eq(quoteItems.productVariantId, productVariants.id))
    .innerJoin(baseProducts, eq(productVariants.baseProductId, baseProducts.id))
    .leftJoin(users, eq(quoteItems.supplierId, users.id))
    .where(and(
      eq(quotes.status, 'ready'),
      sql`${quoteItems.supplierId} IS NOT NULL`
    ))
    .orderBy(desc(quotes.updatedAt));

  // Get customer details for each job
  const jobsWithCustomers = await Promise.all(results.map(async (job) => {
    const customerResult = await db.select({
      name: users.name,
      address: users.address,
      phone: users.phone,
    }).from(users).where(eq(users.id, job.customerId));
    
    const customer = customerResult[0];
    return {
      ...job,
      customerName: customer?.name || null,
      customerAddress: customer?.address || null,
      customerPhone: customer?.phone || null,
    };
  }));

  return jobsWithCustomers;
}

export async function markJobPickedUp(quoteItemId: number, courierId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(quoteItems)
    .set({
      pickedUp: true,
      pickedUpAt: new Date(),
      pickedUpBy: courierId,
    })
    .where(eq(quoteItems.id, quoteItemId));

  await logActivity(courierId, "job_picked_up", { quoteItemId });

  return { success: true };
}

export async function markJobDelivered(quoteItemId: number, courierId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(quoteItems)
    .set({
      delivered: true,
      deliveredAt: new Date(),
      deliveredBy: courierId,
    })
    .where(eq(quoteItems.id, quoteItemId));

  await logActivity(courierId, "job_delivered", { quoteItemId });

  return { success: true };
}

export async function getCourierStats(courierId?: number) {
  const db = await getDb();
  if (!db) return { pending: 0, pickedUp: 0, delivered: 0 };

  const baseQuery = db.select({
    pickedUp: quoteItems.pickedUp,
    delivered: quoteItems.delivered,
    count: sql<number>`count(*)`,
  })
    .from(quoteItems)
    .innerJoin(quotes, eq(quoteItems.quoteId, quotes.id))
    .where(and(
      eq(quotes.status, 'ready'),
      sql`${quoteItems.supplierId} IS NOT NULL`
    ))
    .groupBy(quoteItems.pickedUp, quoteItems.delivered);

  const result = await baseQuery;

  const stats = { pending: 0, pickedUp: 0, delivered: 0 };
  
  for (const row of result) {
    const count = Number(row.count);
    if (!row.pickedUp && !row.delivered) stats.pending += count;
    else if (row.pickedUp && !row.delivered) stats.pickedUp += count;
    else if (row.delivered) stats.delivered += count;
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
  });

  await logActivity(input.userId, "note_created", { 
    targetType: input.targetType, 
    targetId: input.targetId 
  });

  return { id: Number(result[0].insertId) };
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

export async function deleteNote(noteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(internalNotes)
    .where(eq(internalNotes.id, noteId));

  await logActivity(userId, "note_deleted", { noteId });

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
    .leftJoin(productVariants, eq(productVariants.baseProductId, baseProducts.id))
    .leftJoin(quoteItems, eq(quoteItems.productVariantId, productVariants.id))
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
  });
  
  return { id: result[0].insertId };
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

  await logActivity(null, 'customer_signup_request', {
    requestId: data.requestId,
    name: data.name,
    email: data.email,
    filesCount: data.files.length,
  });

  return result;
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
    .orderBy(desc(users.createdAt));
}

export async function getSuppliersList() {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(users)
    .where(eq(users.role, 'supplier'))
    .orderBy(users.name);
}

export async function getCouriersList() {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(users)
    .where(eq(users.role, 'courier'))
    .orderBy(users.name);
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
      sj."productVariantId",
      sj.quantity,
      sj."pricePerUnit",
      sj."totalPrice",
      sj.status,
      sj."supplierMarkedReady",
      sj."supplierReadyAt",
      sj."expectedDeliveryDate",
      sj."actualDeliveryDate",
      sj."createdAt",
      sj.notes,
      sj."fileValidationWarnings",
      supplier.name as "supplierName",
      supplier."companyName" as "supplierCompany",
      customer.name as "customerName",
      customer."companyName" as "customerCompany",
      pv.name as "variantName",
      bp.name as "productName"
    FROM supplier_jobs sj
    LEFT JOIN users supplier ON sj."supplierId" = supplier.id
    LEFT JOIN users customer ON sj."customerId" = customer.id
    LEFT JOIN product_variants pv ON sj."productVariantId" = pv.id
    LEFT JOIN base_products bp ON pv."baseProductId" = bp.id
    ORDER BY 
      CASE sj.status 
        WHEN 'ready' THEN 1
        WHEN 'in_production' THEN 2
        WHEN 'picked_up' THEN 3
        WHEN 'delivered' THEN 4
        ELSE 5
      END,
      sj."createdAt" DESC
  `);

  return result.rows.map((row: any) => ({
    id: row.id,
    quoteId: row.quoteId,
    supplierId: row.supplierId,
    customerId: row.customerId,
    productVariantId: row.productVariantId,
    quantity: row.quantity,
    pricePerUnit: row.pricePerUnit,
    totalPrice: row.totalPrice,
    status: row.status,
    supplierMarkedReady: row.supplierMarkedReady,
    supplierReadyAt: row.supplierReadyAt,
    expectedDeliveryDate: row.expectedDeliveryDate,
    actualDeliveryDate: row.actualDeliveryDate,
    createdAt: row.createdAt,
    notes: row.notes,
    fileValidationWarnings: row.fileValidationWarnings || [],
    supplierName: row.supplierName || 'ספק לא מזוהה',
    supplierCompany: row.supplierCompany,
    customerName: row.customerName || 'לקוח לא מזוהה',
    customerCompany: row.customerCompany,
    productName: row.productName ? `${row.productName} - ${row.variantName}` : 'מוצר לא מזוהה',
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
      sj."productVariantId",
      sj.quantity,
      sj."supplierReadyAt",
      sj.notes,
      supplier.name as "supplierName",
      supplier."companyName" as "supplierCompany",
      supplier.address as "supplierAddress",
      customer.name as "customerName",
      customer."companyName" as "customerCompany",
      customer.address as "customerAddress",
      pv.name as "variantName",
      bp.name as "productName"
    FROM supplier_jobs sj
    LEFT JOIN users supplier ON sj."supplierId" = supplier.id
    LEFT JOIN users customer ON sj."customerId" = customer.id
    LEFT JOIN product_variants pv ON sj."productVariantId" = pv.id
    LEFT JOIN base_products bp ON pv."baseProductId" = bp.id
    WHERE sj.status = 'ready'
    ORDER BY sj."supplierReadyAt" ASC
  `);

  return result.rows.map((row: any) => ({
    id: row.id,
    supplierId: row.supplierId,
    customerId: row.customerId,
    productVariantId: row.productVariantId,
    quantity: row.quantity,
    supplierReadyAt: row.supplierReadyAt,
    notes: row.notes,
    supplierName: row.supplierName || 'ספק לא מזוהה',
    supplierCompany: row.supplierCompany,
    supplierAddress: row.supplierAddress,
    customerName: row.customerName || 'לקוח לא מזוהה',
    customerCompany: row.customerCompany,
    customerAddress: row.customerAddress,
    productName: row.productName ? `${row.productName} - ${row.variantName}` : 'מוצר לא מזוהה',
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

import { productSizes, productQuantities, productAddons } from '../drizzle/schema';

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

  const quantities = await db.select()
    .from(productQuantities)
    .where(and(eq(productQuantities.productId, productId), eq(productQuantities.isActive, true)))
    .orderBy(productQuantities.displayOrder);

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

    const quantities = await db.select()
      .from(productQuantities)
      .where(and(eq(productQuantities.productId, product.id), eq(productQuantities.isActive, true)))
      .orderBy(productQuantities.displayOrder);

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

// ===== QUANTITIES =====
export async function createProductQuantity(input: {
  productId: number;
  quantity: number;
  priceMultiplier: number;
  displayOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(productQuantities).values({
    productId: input.productId,
    quantity: input.quantity,
    priceMultiplier: input.priceMultiplier.toString(),
    displayOrder: input.displayOrder || 0,
    isActive: true,
  });

  return { success: true };
}

export async function updateProductQuantity(input: {
  id: number;
  quantity?: number;
  priceMultiplier?: number;
  displayOrder?: number;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.quantity !== undefined) updateData.quantity = input.quantity;
  if (input.priceMultiplier !== undefined) updateData.priceMultiplier = input.priceMultiplier.toString();
  if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  await db.update(productQuantities)
    .set(updateData)
    .where(eq(productQuantities.id, input.id));

  return { success: true };
}

export async function deleteProductQuantity(quantityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(productQuantities)
    .set({ isActive: false })
    .where(eq(productQuantities.id, quantityId));

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

  // Get quantity multiplier
  if (input.quantityId) {
    const [quantity] = await db.select()
      .from(productQuantities)
      .where(eq(productQuantities.id, input.quantityId))
      .limit(1);

    if (quantity) {
      multiplier = parseFloat(quantity.priceMultiplier || '1');
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
