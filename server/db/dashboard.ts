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
  baseProducts,
  quoteItems,
  quoteAttachments,
  productAddons
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


/**
 * Get delivered jobs (for Delivered page)
 */
export async function getDeliveredJobs() {
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
      bp.name as "productName",
      bp.description as "productDescription",
      (sj.quantity * sj."pricePerUnit") as "totalJobPrice"
    FROM supplier_jobs sj
    LEFT JOIN quotes q ON sj."quoteId" = q.id
    LEFT JOIN users supplier ON sj."supplierId" = supplier.id
    LEFT JOIN users customer ON sj."customerId" = customer.id
    LEFT JOIN users q_customer ON q."customerId" = q_customer.id
    LEFT JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
    LEFT JOIN product_sizes ps ON sq.size_id = ps.id
    LEFT JOIN base_products bp ON ps.product_id = bp.id
    WHERE sj.status = 'delivered'
    AND sj."isCancelled" IS NOT TRUE
    ORDER BY sj."deliveredAt" DESC
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
    productName: row.productName,
    productDescription: row.productDescription,
    totalJobPrice: row.totalJobPrice,
  }));
}


// ==================== NEW QUOTE REQUESTS ====================

export interface NewQuoteRequest {
  id: number;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany?: string | null;
  status: string;
  createdAt: Date;
  items: Array<{
    id: number;
    productName: string;
    sizeName: string;
    dimensions?: string | null;
    quantity: number;
    addonIds?: number[];
    addonNames?: string[];
  }>;
  attachments: Array<{
    id: number;
    fileName: string;
    fileUrl: string;
    fileSize?: number | null;
    mimeType?: string | null;
    quoteItemId?: number | null;
  }>;
  notes?: string | null;
}

/**
 * Get new quote requests from NEW CUSTOMERS (pending_approval status)
 * These are requests from the landing page waiting for customer approval
 */
export async function getNewQuoteRequests(limit: number = 10): Promise<NewQuoteRequest[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Get new customers with pending_approval status and their request data from activity_log
    const customersResult = await db.execute(sql`
      SELECT 
        u.id,
        u.name as "customerName",
        u.email as "customerEmail",
        u.phone as "customerPhone",
        u."companyName" as "customerCompany",
        u.status,
        u."createdAt",
        al.details as "requestDetails"
      FROM users u
      LEFT JOIN activity_log al ON al."userId" = u.id 
        AND al."actionType" = 'pending_quote_request_data'
      WHERE u.status = 'pending_approval'
        AND u.role = 'customer'
      ORDER BY u."createdAt" DESC
      LIMIT ${limit}
    `);

    const customersList = customersResult.rows as any[];
    if (customersList.length === 0) return [];

    // Get all addon names for addon IDs
    const addonsResult = await db.execute(sql`
      SELECT id, name FROM product_addons
    `);
    const addonsMap = new Map((addonsResult.rows as any[]).map(a => [a.id, a.name]));

    // Get product info for sizeQuantityIds
    const getProductInfo = async (sizeQuantityId: number) => {
      const result = await db.execute(sql`
        SELECT 
          sq.id,
          sq.quantity,
          ps.name as "sizeName",
          ps.dimensions,
          bp.name as "productName"
        FROM size_quantities sq
        LEFT JOIN product_sizes ps ON sq."sizeId" = ps.id
        LEFT JOIN base_products bp ON ps."productId" = bp.id
        WHERE sq.id = ${sizeQuantityId}
      `);
      return result.rows[0] as any;
    };

    // Build the response from activity log data
    const result: NewQuoteRequest[] = [];
    
    for (const customer of customersList) {
      // Parse requestDetails - might be string or object
      let requestDetails = customer.requestDetails;
      if (typeof requestDetails === 'string') {
        try {
          requestDetails = JSON.parse(requestDetails);
        } catch (e) {
          requestDetails = null;
        }
      }
      
      // Parse items from request details
      const items: NewQuoteRequest['items'] = [];
      if (requestDetails?.quoteItems) {
        for (let i = 0; i < requestDetails.quoteItems.length; i++) {
          const item = requestDetails.quoteItems[i];
          const productInfo = await getProductInfo(item.sizeQuantityId);
          const addonIds = item.addonIds || [];
          
          items.push({
            id: i + 1,
            productName: productInfo?.productName || 'מוצר לא ידוע',
            sizeName: productInfo?.sizeName || 'גודל לא ידוע',
            dimensions: productInfo?.dimensions,
            quantity: item.quantity,
            addonIds,
            addonNames: addonIds.map((id: number) => addonsMap.get(id) || `תוספת ${id}`),
          });
        }
      }

      // Parse attachments from request details
      const attachments: NewQuoteRequest['attachments'] = [];
      if (requestDetails?.attachments) {
        requestDetails.attachments.forEach((att: any, i: number) => {
          attachments.push({
            id: i + 1,
            fileName: att.fileName || 'קובץ',
            fileUrl: att.fileUrl || '',
            fileSize: att.fileSize,
            mimeType: att.mimeType,
            quoteItemId: null,
          });
        });
      }

      result.push({
        id: customer.id,
        customerId: customer.id,
        customerName: customer.customerName || 'לקוח חדש',
        customerEmail: customer.customerEmail || '',
        customerPhone: customer.customerPhone || '',
        customerCompany: customer.customerCompany,
        status: customer.status,
        createdAt: customer.createdAt,
        items,
        attachments,
        notes: requestDetails?.notes || null,
      });
    }

    return result;
  } catch (error) {
    console.error('[getNewQuoteRequests] Error:', error);
    return [];
  }
}
