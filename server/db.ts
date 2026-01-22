import { eq, desc, sql, and, count, inArray, like, gte, lte, SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
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
      // Add SSL/TLS support for Render PostgreSQL
      const dbUrl = new URL(process.env.DATABASE_URL);
      if (!dbUrl.searchParams.has('sslmode')) {
        dbUrl.searchParams.set('sslmode', 'require');
      }
      _db = drizzle(dbUrl.toString());
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
  .orderBy(desc(quotes.createdAt))
  .limit(limit);

  return recentQuotes;
}

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
    customerName: users.name,
    customerEmail: users.email,
  })
  .from(quotes)
  .leftJoin(users, eq(quotes.customerId, users.id))
  .where(eq(quotes.id, quoteId));

  return quote || null;
}

export async function getQuoteItems(quoteId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select({
    id: quoteItems.id,
    quoteId: quoteItems.quoteId,
    productId: quoteItems.productId,
    quantity: quoteItems.quantity,
    unitPrice: quoteItems.unitPrice,
    discount: quoteItems.discount,
    total: quoteItems.total,
    productName: baseProducts.name,
    productCode: baseProducts.code,
  })
  .from(quoteItems)
  .leftJoin(baseProducts, eq(quoteItems.productId, baseProducts.id))
  .where(eq(quoteItems.quoteId, quoteId));
}

export async function updateQuote(quoteId: number, updates: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return null;

  await db.update(quotes).set(updates).where(eq(quotes.id, quoteId));

  return getQuoteById(quoteId);
}

export async function getCustomers(filters?: { search?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(users).where(eq(users.role, "customer"));

  if (filters?.search) {
    query = query.where(
      or(
        like(users.name, `%${filters.search}%`),
        like(users.email, `%${filters.search}%`)
      )
    );
  }

  return query.limit(filters?.limit || 50);
}

export async function getCustomerById(customerId: number) {
  const db = await getDb();
  if (!db) return null;

  const [customer] = await db.select().from(users).where(eq(users.id, customerId));

  return customer || null;
}

export async function updateCustomer(customerId: number, updates: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return null;

  await db.update(users).set(updates).where(eq(users.id, customerId));

  return getCustomerById(customerId);
}

export async function getProducts(filters?: { search?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(baseProducts);

  if (filters?.search) {
    query = query.where(
      or(
        like(baseProducts.name, `%${filters.search}%`),
        like(baseProducts.code, `%${filters.search}%`)
      )
    );
  }

  return query.limit(filters?.limit || 50);
}

export async function getProductById(productId: number) {
  const db = await getDb();
  if (!db) return null;

  const [product] = await db.select().from(baseProducts).where(eq(baseProducts.id, productId));

  return product || null;
}

export async function getSuppliers(filters?: { search?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(users).where(eq(users.role, "supplier"));

  if (filters?.search) {
    query = query.where(
      or(
        like(users.name, `%${filters.search}%`),
        like(users.email, `%${filters.search}%`)
      )
    );
  }

  return query.limit(filters?.limit || 50);
}

export async function getSupplierById(supplierId: number) {
  const db = await getDb();
  if (!db) return null;

  const [supplier] = await db.select().from(users).where(eq(users.id, supplierId));

  return supplier || null;
}

export async function getPricelists(supplierId?: number) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(pricelists);

  if (supplierId) {
    query = query.where(eq(pricelists.supplierId, supplierId));
  }

  return query;
}

export async function getPricelistById(pricelistId: number) {
  const db = await getDb();
  if (!db) return null;

  const [pricelist] = await db.select().from(pricelists).where(eq(pricelists.id, pricelistId));

  return pricelist || null;
}

// Helper function for OR conditions
function or(...conditions: SQL[]) {
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return sql`${conditions.join(sql` OR `)}`;
}
