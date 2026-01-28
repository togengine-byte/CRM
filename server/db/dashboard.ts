/**
 * Dashboard Module
 * 
 * Dashboard-specific functions for KPIs, recent data, and overview.
 */

import { getDb, eq, and, desc, sql, or, count } from "./connection";
import { 
  quotes, 
  users, 
  customerSignupRequests,
  supplierJobs,
  sizeQuantities,
  productSizes,
  baseProducts
} from "../../drizzle/schema";

// ==================== DASHBOARD KPIs ====================

/**
 * Get dashboard KPIs
 */
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
  })
    .from(quotes)
    .where(eq(quotes.status, "approved"));

  // This month's stats
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [monthlyStats] = await db.select({
    count: count(),
    revenue: sql<string>`COALESCE(SUM(${quotes.finalValue}), 0)`
  })
    .from(quotes)
    .where(and(
      eq(quotes.status, "approved"),
      sql`${quotes.createdAt} >= ${startOfMonth}`
    ));

  const totalQuotesNum = Number(quotesCount?.count || 0);
  const approvedQuotesNum = Number(approvedQuotes?.count || 0);
  const totalRevenue = parseFloat(revenueResult?.total || '0');
  
  return {
    totalQuotes: totalQuotesNum,
    activeCustomers: Number(customersCount?.count || 0),
    totalRevenue: totalRevenue,
    conversionRate: totalQuotesNum > 0 ? Math.round((approvedQuotesNum / totalQuotesNum) * 100) : 0,
    pendingApprovals: Number(pendingCount?.count || 0),
    quotesThisMonth: Number(monthlyStats?.count || 0),
    revenueThisMonth: parseFloat(monthlyStats?.revenue || '0'),
    avgDealValue: approvedQuotesNum > 0 ? Math.round(totalRevenue / approvedQuotesNum) : 0
  };
}

/**
 * Get recent quotes (pending)
 */
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

/**
 * Get pending customer signup requests
 */
export async function getPendingSignups(limit: number = 5) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
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

    return pending;
  }
}

/**
 * Get pending customer approvals (existing users)
 */
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

/**
 * Get pending customers (legacy - kept for backwards compatibility)
 */
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

// ==================== JOBS ====================

/**
 * Get active jobs
 */
export async function getActiveJobs() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      sj.id,
      sj."quoteId",
      sj."supplierId",
      COALESCE(sj."customerId", q."customerId") as "customerId",
      sj."sizeQuantityId",
      sj.quantity,
      sj."pricePerUnit",
      sj.status,
      sj."supplierMarkedReady",
      sj."supplierReadyAt",
      sj."promisedDeliveryDays",
      sj."createdAt",
      sj."updatedAt",
      sj."fileValidationWarnings",
      sj."isAccepted",
      sj."acceptedAt",
      sj."isCancelled",
      sj."cancelledAt",
      sj."pickedUpAt",
      sj."deliveredAt",
      supplier.name as "supplierName",
      supplier."companyName" as "supplierCompany",
      supplier.phone as "supplierPhone",
      supplier.email as "supplierEmail",
      supplier.address as "supplierAddress",
      COALESCE(customer.name, q_customer.name) as "customerName",
      COALESCE(customer."companyName", q_customer."companyName") as "customerCompany",
      COALESCE(customer.phone, q_customer.phone) as "customerPhone",
      COALESCE(customer.email, q_customer.email) as "customerEmail",
      COALESCE(customer.address, q_customer.address) as "customerAddress",
      ps.name as "sizeName",
      ps.dimensions as "dimensions",
      ps.base_price as "sizeBasePrice",
      sq.price as "sizeQuantityPrice",
      sq.quantity as "sizeQuantityAmount",
      bp.name as "productName",
      bp.description as "productDescription",
      bp.category as "productCategory",
      q."finalValue" as "quoteTotal",
      q."totalSupplierCost" as "totalSupplierCost",
      q.status as "quoteStatus",
      (sj.quantity * sj."pricePerUnit") as "totalJobPrice"
    FROM supplier_jobs sj
    LEFT JOIN quotes q ON sj."quoteId" = q.id
    LEFT JOIN users supplier ON sj."supplierId" = supplier.id
    LEFT JOIN users customer ON sj."customerId" = customer.id
    LEFT JOIN users q_customer ON q."customerId" = q_customer.id
    LEFT JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
    LEFT JOIN product_sizes ps ON sq.size_id = ps.id
    LEFT JOIN base_products bp ON ps.product_id = bp.id
    WHERE sj.status IN ('pending', 'in_progress', 'ready', 'picked_up', 'delivered')
    ORDER BY sj."createdAt" DESC
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
    promisedDeliveryDays: row.promisedDeliveryDays,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    fileValidationWarnings: row.fileValidationWarnings,
    isAccepted: row.isAccepted,
    acceptedAt: row.acceptedAt,
    isCancelled: row.isCancelled,
    cancelledAt: row.cancelledAt,
    pickedUpAt: row.pickedUpAt,
    deliveredAt: row.deliveredAt,
    supplierName: row.supplierName,
    supplierCompany: row.supplierCompany,
    supplierPhone: row.supplierPhone,
    supplierEmail: row.supplierEmail,
    supplierAddress: row.supplierAddress,
    customerName: row.customerName,
    customerCompany: row.customerCompany,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    customerAddress: row.customerAddress,
    sizeName: row.sizeName,
    dimensions: row.dimensions,
    sizeBasePrice: row.sizeBasePrice,
    sizeQuantityPrice: row.sizeQuantityPrice,
    sizeQuantityAmount: row.sizeQuantityAmount,
    productName: row.productName,
    productDescription: row.productDescription,
    productCategory: row.productCategory,
    quoteTotal: row.quoteTotal,
    totalSupplierCost: row.totalSupplierCost,
    quoteStatus: row.quoteStatus,
    totalJobPrice: row.totalJobPrice,
  }));
}

/**
 * Get jobs ready for pickup
 */
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
    supplierName: row.supplierName,
    supplierCompany: row.supplierCompany,
    supplierAddress: row.supplierAddress,
    customerName: row.customerName,
    customerCompany: row.customerCompany,
    customerAddress: row.customerAddress,
    sizeName: row.sizeName,
    dimensions: row.dimensions,
    productName: row.productName,
  }));
}
