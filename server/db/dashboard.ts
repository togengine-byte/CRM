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

// ==================== URGENT ALERTS ====================

export interface UrgentAlert {
  id: string;
  type: 'overdue_job' | 'pending_quote' | 'supplier_not_accepted';
  severity: 'high' | 'medium';
  title: string;
  description: string;
  itemId: number;
  itemName: string;
  customerName?: string;
  supplierName?: string;
  createdAt: Date;
  hoursOverdue?: number;
  currentStatus?: string;
  issue?: string;
}

/**
 * Get urgent alerts for dashboard
 * 1. Overdue jobs - passed promised delivery date (high severity - red)
 * 2. Pending quotes - waiting for customer approval > 3 hours (medium severity - orange)
 * 3. Supplier not accepted - jobs sent to supplier not accepted within 24 hours (medium severity - orange)
 */
export async function getUrgentAlerts(): Promise<UrgentAlert[]> {
  const db = await getDb();
  if (!db) return [];

  const alerts: UrgentAlert[] = [];
  const now = new Date();

  // 1. Overdue jobs - jobs that passed their promised delivery date
  const overdueJobsResult = await db.execute(sql`
    SELECT 
      sj.id,
      sj."createdAt",
      sj."promisedDeliveryDays",
      sj.status,
      bp.name as "productName",
      customer.name as "customerName",
      supplier.name as "supplierName",
      EXTRACT(EPOCH FROM (NOW() - (sj."createdAt" + (sj."promisedDeliveryDays" || ' days')::interval))) / 3600 as "hoursOverdue"
    FROM supplier_jobs sj
    LEFT JOIN users customer ON sj."customerId" = customer.id
    LEFT JOIN users supplier ON sj."supplierId" = supplier.id
    LEFT JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
    LEFT JOIN product_sizes ps ON sq.size_id = ps.id
    LEFT JOIN base_products bp ON ps.product_id = bp.id
    WHERE sj.status NOT IN ('delivered', 'cancelled')
      AND sj."createdAt" + (sj."promisedDeliveryDays" || ' days')::interval < NOW()
    ORDER BY "hoursOverdue" DESC
  `);

  // Helper function to translate status to Hebrew
  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      'pending': 'ממתין לאישור ספק',
      'in_progress': 'בייצור',
      'ready': 'מוכן לאיסוף',
      'picked_up': 'נאסף',
      'in_transit': 'בדרך ללקוח',
      'delivered': 'נמסר',
      'cancelled': 'בוטל'
    };
    return statusMap[status] || status;
  };

  for (const row of overdueJobsResult.rows as any[]) {
    alerts.push({
      id: `overdue_${row.id}`,
      type: 'overdue_job',
      severity: 'high',
      title: 'עבודה באיחור',
      description: `${row.productName || 'עבודה'}`,
      itemId: row.id,
      itemName: row.productName || 'עבודה',
      customerName: row.customerName,
      supplierName: row.supplierName,
      createdAt: new Date(row.createdAt),
      hoursOverdue: Math.round(Number(row.hoursOverdue) || 0),
      currentStatus: getStatusLabel(row.status),
      issue: 'עדיין לא נמסר'
    });
  }

  // 2. Pending quotes - waiting for customer approval > 3 hours
  const pendingQuotesResult = await db.execute(sql`
    SELECT 
      q.id,
      q."createdAt",
      q."finalValue",
      customer.name as "customerName",
      EXTRACT(EPOCH FROM (NOW() - q."createdAt")) / 3600 as "hoursWaiting"
    FROM quotes q
    LEFT JOIN users customer ON q."customerId" = customer.id
    WHERE q.status = 'sent'
      AND q."createdAt" < NOW() - INTERVAL '3 hours'
    ORDER BY q."createdAt" ASC
  `);

  for (const row of pendingQuotesResult.rows as any[]) {
    alerts.push({
      id: `pending_quote_${row.id}`,
      type: 'pending_quote',
      severity: 'medium',
      title: 'הצעה ממתינה לאישור',
      description: `הצעה #${row.id} ל${row.customerName || 'לקוח'} - ממתינה ${Math.round(Number(row.hoursWaiting))} שעות`,
      itemId: row.id,
      itemName: `הצעה #${row.id}`,
      customerName: row.customerName,
      createdAt: new Date(row.createdAt),
      hoursOverdue: Math.round(Number(row.hoursWaiting) || 0)
    });
  }

  // 3. Supplier not accepted - jobs sent to supplier not accepted within 24 hours
  const notAcceptedResult = await db.execute(sql`
    SELECT 
      sj.id,
      sj."createdAt",
      bp.name as "productName",
      customer.name as "customerName",
      supplier.name as "supplierName",
      EXTRACT(EPOCH FROM (NOW() - sj."createdAt")) / 3600 as "hoursWaiting"
    FROM supplier_jobs sj
    LEFT JOIN users customer ON sj."customerId" = customer.id
    LEFT JOIN users supplier ON sj."supplierId" = supplier.id
    LEFT JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
    LEFT JOIN product_sizes ps ON sq.size_id = ps.id
    LEFT JOIN base_products bp ON ps.product_id = bp.id
    WHERE sj.status = 'pending'
      AND sj."createdAt" < NOW() - INTERVAL '24 hours'
    ORDER BY sj."createdAt" ASC
  `);

  for (const row of notAcceptedResult.rows as any[]) {
    alerts.push({
      id: `not_accepted_${row.id}`,
      type: 'supplier_not_accepted',
      severity: 'medium',
      title: 'ספק לא אישר עבודה',
      description: `${row.productName || 'עבודה'} - ${row.supplierName || 'ספק'} לא אישר כבר ${Math.round(Number(row.hoursWaiting))} שעות`,
      itemId: row.id,
      itemName: row.productName || 'עבודה',
      customerName: row.customerName,
      supplierName: row.supplierName,
      createdAt: new Date(row.createdAt),
      hoursOverdue: Math.round(Number(row.hoursWaiting) || 0)
    });
  }

  // Sort by severity (high first) then by hours overdue
  alerts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'high' ? -1 : 1;
    }
    return (b.hoursOverdue || 0) - (a.hoursOverdue || 0);
  });

  return alerts;
}

// ==================== DASHBOARD KPIs ====================

/**
 * Get dashboard KPIs - Based on supplier_jobs with status 'delivered'
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

  // Total quotes count
  const [quotesCount] = await db.select({ count: count() }).from(quotes);
  
  // Active customers - customers with at least one delivered job
  const activeCustomersResult = await db.execute(sql`
    SELECT COUNT(DISTINCT "customerId") as count
    FROM supplier_jobs
    WHERE status = 'delivered' AND "customerId" IS NOT NULL
  `);
  const activeCustomers = Number((activeCustomersResult.rows[0] as any)?.count || 0);

  // Pending approvals
  const [pendingCount] = await db.select({ count: count() })
    .from(users)
    .where(eq(users.status, "pending_approval"));

  // Total revenue from delivered jobs
  const revenueResult = await db.execute(sql`
    SELECT 
      COALESCE(SUM(CAST("pricePerUnit" AS DECIMAL) * quantity), 0) as total_revenue,
      COUNT(*) as total_jobs
    FROM supplier_jobs
    WHERE status = 'delivered'
  `);
  const totalRevenue = Number((revenueResult.rows[0] as any)?.total_revenue || 0);
  const totalDeliveredJobs = Number((revenueResult.rows[0] as any)?.total_jobs || 0);

  // This month's stats
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyResult = await db.execute(sql`
    SELECT 
      COALESCE(SUM(CAST("pricePerUnit" AS DECIMAL) * quantity), 0) as revenue,
      COUNT(*) as count
    FROM supplier_jobs
    WHERE status = 'delivered'
      AND "createdAt" >= ${startOfMonth}
  `);
  const revenueThisMonth = Number((monthlyResult.rows[0] as any)?.revenue || 0);
  const jobsThisMonth = Number((monthlyResult.rows[0] as any)?.count || 0);

  // Conversion rate: delivered jobs / total jobs (excluding cancelled)
  const totalJobsResult = await db.execute(sql`
    SELECT COUNT(*) as count FROM supplier_jobs WHERE status != 'cancelled'
  `);
  const totalJobs = Number((totalJobsResult.rows[0] as any)?.count || 0);
  const conversionRate = totalJobs > 0 ? Math.round((totalDeliveredJobs / totalJobs) * 100) : 0;

  return {
    totalQuotes: Number(quotesCount?.count || 0),
    activeCustomers: activeCustomers,
    totalRevenue: totalRevenue,
    conversionRate: conversionRate,
    pendingApprovals: Number(pendingCount?.count || 0),
    quotesThisMonth: jobsThisMonth,
    revenueThisMonth: revenueThisMonth,
    avgDealValue: totalDeliveredJobs > 0 ? Math.round(totalRevenue / totalDeliveredJobs) : 0
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
    WHERE sj.status IN ('pending', 'in_progress', 'ready', 'picked_up')
    AND sj."isCancelled" IS NOT TRUE
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
