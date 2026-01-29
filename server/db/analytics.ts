/**
 * Analytics Module
 * 
 * Analytics and reporting functions including revenue,
 * customer insights, and performance metrics.
 */

import { getDb, eq, and, desc, sql, gte, lte } from "./connection";
import { 
  quotes, 
  users, 
  quoteItems,
  supplierJobs
} from "../../drizzle/schema";

// ==================== REVENUE ANALYTICS ====================

/**
 * Get revenue analytics
 */
export async function getRevenueAnalytics(filters?: {
  startDate?: Date;
  endDate?: Date;
  customerId?: number;
}) {
  const db = await getDb();
  if (!db) return {
    totalRevenue: 0,
    quotesCount: 0,
    averageOrderValue: 0,
    byStatus: {},
    byMonth: [],
  };

  const conditions = [];
  if (filters?.startDate) {
    conditions.push(gte(quotes.createdAt, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(quotes.createdAt, filters.endDate));
  }
  if (filters?.customerId) {
    conditions.push(eq(quotes.customerId, filters.customerId));
  }

  const result = await db.select({
    status: quotes.status,
    count: sql<number>`count(*)`,
    revenue: sql<number>`COALESCE(SUM(CAST(${quotes.finalValue} AS DECIMAL)), 0)`,
  })
    .from(quotes)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(quotes.status);

  const byStatus: Record<string, { count: number; revenue: number }> = {};
  let totalRevenue = 0;
  let quotesCount = 0;

  for (const row of result) {
    byStatus[row.status] = {
      count: Number(row.count),
      revenue: Number(row.revenue),
    };
    if (['approved', 'in_production', 'ready', 'delivered'].includes(row.status)) {
      totalRevenue += Number(row.revenue);
    }
    quotesCount += Number(row.count);
  }

  const monthlyResult = await db.execute(sql`
    SELECT 
      DATE_TRUNC('month', "createdAt") as month,
      COUNT(*) as count,
      COALESCE(SUM(CAST("finalValue" AS DECIMAL)), 0) as revenue
    FROM quotes
    WHERE status IN ('approved', 'in_production', 'ready', 'delivered')
    ${filters?.startDate ? sql`AND "createdAt" >= ${filters.startDate}` : sql``}
    ${filters?.endDate ? sql`AND "createdAt" <= ${filters.endDate}` : sql``}
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY month DESC
    LIMIT 12
  `);

  const byMonth = (monthlyResult.rows as any[]).map(row => ({
    month: row.month,
    count: Number(row.count),
    revenue: Number(row.revenue),
  }));

  return {
    totalRevenue,
    quotesCount,
    averageOrderValue: quotesCount > 0 ? totalRevenue / quotesCount : 0,
    byStatus,
    byMonth,
  };
}

/**
 * Get customer analytics
 */
export async function getCustomerAnalytics(customerId: number) {
  const db = await getDb();
  if (!db) return null;

  const [customer] = await db.select()
    .from(users)
    .where(eq(users.id, customerId))
    .limit(1);

  if (!customer) return null;

  const quotesResult = await db.select({
    status: quotes.status,
    count: sql<number>`count(*)`,
    revenue: sql<number>`COALESCE(SUM(CAST(${quotes.finalValue} AS DECIMAL)), 0)`,
  })
    .from(quotes)
    .where(eq(quotes.customerId, customerId))
    .groupBy(quotes.status);

  let totalQuotes = 0;
  let totalRevenue = 0;
  let approvedQuotes = 0;
  let rejectedQuotes = 0;

  for (const row of quotesResult) {
    totalQuotes += Number(row.count);
    if (['approved', 'in_production', 'ready', 'delivered'].includes(row.status)) {
      totalRevenue += Number(row.revenue);
      approvedQuotes += Number(row.count);
    }
    if (row.status === 'rejected') {
      rejectedQuotes += Number(row.count);
    }
  }

  const recentQuotes = await db.select({
    id: quotes.id,
    status: quotes.status,
    finalValue: quotes.finalValue,
    createdAt: quotes.createdAt,
  })
    .from(quotes)
    .where(eq(quotes.customerId, customerId))
    .orderBy(desc(quotes.createdAt))
    .limit(10);

  return {
    customer,
    stats: {
      totalQuotes,
      totalRevenue,
      approvedQuotes,
      rejectedQuotes,
      conversionRate: totalQuotes > 0 ? (approvedQuotes / totalQuotes) * 100 : 0,
      averageOrderValue: approvedQuotes > 0 ? totalRevenue / approvedQuotes : 0,
    },
    recentQuotes,
  };
}

/**
 * Get all customers analytics (for analytics page)
 */
export async function getAllCustomersAnalytics(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  try {
    // Default to last month if no dates provided
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const results = await db.execute(sql`
      SELECT 
        u.id as customer_id,
        u.name as customer_name,
        u."companyName" as company_name,
        COUNT(DISTINCT q.id) as total_quotes,
        COALESCE(SUM(
          CASE WHEN q.status IN ('approved', 'in_production', 'ready', 'delivered') 
          THEN COALESCE(NULLIF(q."finalValue", '')::numeric, 0) 
          ELSE 0 END
        ), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN q.status IN ('approved', 'in_production', 'ready', 'delivered') THEN 1 ELSE 0 END), 0) as approved_quotes,
        CASE 
          WHEN COUNT(q.id) > 0 
          THEN ROUND((COALESCE(SUM(CASE WHEN q.status IN ('approved', 'in_production', 'ready', 'delivered') THEN 1 ELSE 0 END), 0)::numeric / COUNT(q.id)::numeric) * 100, 1)
          ELSE 0 
        END as conversion_rate
      FROM users u
      LEFT JOIN quotes q ON q."customerId" = u.id AND q."createdAt" >= ${start} AND q."createdAt" <= ${end}
      WHERE u.role = 'customer' AND u.status = 'active'
      GROUP BY u.id, u.name, u."companyName"
      ORDER BY total_revenue DESC
    `);

    return (results.rows as any[]).map(row => ({
      customerId: row.customer_id,
      customerName: row.customer_name || row.company_name || 'לא ידוע',
      companyName: row.company_name,
      totalQuotes: Number(row.total_quotes) || 0,
      totalRevenue: Number(row.total_revenue) || 0,
      approvedQuotes: Number(row.approved_quotes) || 0,
      conversionRate: Number(row.conversion_rate) || 0,
    }));
  } catch (error) {
    console.error('[Analytics] Error in getAllCustomersAnalytics:', error);
    return [];
  }
}

/**
 * Get supplier analytics
 */
export async function getSupplierAnalytics(supplierId: number) {
  const db = await getDb();
  if (!db) return null;

  const [supplier] = await db.select()
    .from(users)
    .where(and(eq(users.id, supplierId), eq(users.role, 'supplier')))
    .limit(1);

  if (!supplier) return null;

  const jobsResult = await db.execute(sql`
    SELECT 
      status,
      COUNT(*) as count,
      COALESCE(SUM(CAST("pricePerUnit" AS DECIMAL) * quantity), 0) as revenue,
      AVG("supplierRating") as avg_rating,
      AVG(EXTRACT(EPOCH FROM ("supplierReadyAt" - "createdAt")) / 86400) as avg_delivery_days
    FROM supplier_jobs
    WHERE "supplierId" = ${supplierId}
    GROUP BY status
  `);

  let totalJobs = 0;
  let totalRevenue = 0;
  let completedJobs = 0;
  let avgRating = 0;
  let avgDeliveryDays = 0;
  let ratingCount = 0;

  for (const row of jobsResult.rows as any[]) {
    totalJobs += Number(row.count);
    totalRevenue += Number(row.revenue);
    if (['ready', 'delivered', 'completed'].includes(row.status)) {
      completedJobs += Number(row.count);
      if (row.avg_rating) {
        avgRating += Number(row.avg_rating) * Number(row.count);
        ratingCount += Number(row.count);
      }
      if (row.avg_delivery_days) {
        avgDeliveryDays += Number(row.avg_delivery_days) * Number(row.count);
      }
    }
  }

  if (ratingCount > 0) {
    avgRating = avgRating / ratingCount;
  }
  if (completedJobs > 0) {
    avgDeliveryDays = avgDeliveryDays / completedJobs;
  }

  const monthlyResult = await db.execute(sql`
    SELECT 
      DATE_TRUNC('month', "createdAt") as month,
      COUNT(*) as count,
      COALESCE(SUM(CAST("pricePerUnit" AS DECIMAL) * quantity), 0) as revenue
    FROM supplier_jobs
    WHERE "supplierId" = ${supplierId}
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY month DESC
    LIMIT 12
  `);

  const byMonth = (monthlyResult.rows as any[]).map(row => ({
    month: row.month,
    count: Number(row.count),
    revenue: Number(row.revenue),
  }));

  return {
    supplier,
    stats: {
      totalJobs,
      completedJobs,
      totalRevenue,
      avgRating: Math.round(avgRating * 10) / 10,
      avgDeliveryDays: Math.round(avgDeliveryDays * 10) / 10,
      completionRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0,
    },
    byMonth,
  };
}

/**
 * Get dashboard analytics
 */
export async function getDashboardAnalytics() {
  const db = await getDb();
  if (!db) return {
    quotes: { total: 0, pending: 0, approved: 0, rejected: 0 },
    revenue: { total: 0, thisMonth: 0, lastMonth: 0 },
    customers: { total: 0, active: 0, new: 0 },
    suppliers: { total: 0, active: 0 },
  };

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const quotesStats = await db.select({
    status: quotes.status,
    count: sql<number>`count(*)`,
    revenue: sql<number>`COALESCE(SUM(CAST(${quotes.finalValue} AS DECIMAL)), 0)`,
  })
    .from(quotes)
    .groupBy(quotes.status);

  let totalQuotes = 0;
  let pendingQuotes = 0;
  let approvedQuotes = 0;
  let rejectedQuotes = 0;
  let totalRevenue = 0;

  for (const row of quotesStats) {
    totalQuotes += Number(row.count);
    if (row.status === 'draft' || row.status === 'sent') {
      pendingQuotes += Number(row.count);
    }
    if (['approved', 'in_production', 'ready', 'delivered'].includes(row.status)) {
      approvedQuotes += Number(row.count);
      totalRevenue += Number(row.revenue);
    }
    if (row.status === 'rejected') {
      rejectedQuotes += Number(row.count);
    }
  }

  const thisMonthRevenue = await db.select({
    revenue: sql<number>`COALESCE(SUM(CAST(${quotes.finalValue} AS DECIMAL)), 0)`,
  })
    .from(quotes)
    .where(and(
      gte(quotes.createdAt, thisMonthStart),
      sql`${quotes.status} IN ('approved', 'in_production', 'ready', 'delivered')`
    ));

  const lastMonthRevenue = await db.select({
    revenue: sql<number>`COALESCE(SUM(CAST(${quotes.finalValue} AS DECIMAL)), 0)`,
  })
    .from(quotes)
    .where(and(
      gte(quotes.createdAt, lastMonthStart),
      lte(quotes.createdAt, lastMonthEnd),
      sql`${quotes.status} IN ('approved', 'in_production', 'ready', 'delivered')`
    ));

  const customersStats = await db.select({
    status: users.status,
    count: sql<number>`count(*)`,
  })
    .from(users)
    .where(eq(users.role, 'customer'))
    .groupBy(users.status);

  let totalCustomers = 0;
  let activeCustomers = 0;

  for (const row of customersStats) {
    totalCustomers += Number(row.count);
    if (row.status === 'active') {
      activeCustomers += Number(row.count);
    }
  }

  const newCustomers = await db.select({
    count: sql<number>`count(*)`,
  })
    .from(users)
    .where(and(
      eq(users.role, 'customer'),
      gte(users.createdAt, thisMonthStart)
    ));

  const suppliersStats = await db.select({
    status: users.status,
    count: sql<number>`count(*)`,
  })
    .from(users)
    .where(eq(users.role, 'supplier'))
    .groupBy(users.status);

  let totalSuppliers = 0;
  let activeSuppliers = 0;

  for (const row of suppliersStats) {
    totalSuppliers += Number(row.count);
    if (row.status === 'active') {
      activeSuppliers += Number(row.count);
    }
  }

  return {
    quotes: {
      total: totalQuotes,
      pending: pendingQuotes,
      approved: approvedQuotes,
      rejected: rejectedQuotes,
    },
    revenue: {
      total: totalRevenue,
      thisMonth: Number(thisMonthRevenue[0]?.revenue || 0),
      lastMonth: Number(lastMonthRevenue[0]?.revenue || 0),
    },
    customers: {
      total: totalCustomers,
      active: activeCustomers,
      new: Number(newCustomers[0]?.count || 0),
    },
    suppliers: {
      total: totalSuppliers,
      active: activeSuppliers,
    },
  };
}

/**
 * Get product analytics
 */
export async function getProductAnalytics(productId?: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      bp.id as product_id,
      bp.name as product_name,
      COUNT(qi.id) as order_count,
      SUM(qi.quantity) as total_quantity,
      COALESCE(SUM(CAST(qi."priceAtTimeOfQuote" AS DECIMAL) * qi.quantity), 0) as total_revenue
    FROM quote_items qi
    INNER JOIN size_quantities sq ON qi."sizeQuantityId" = sq.id
    INNER JOIN product_sizes ps ON sq.size_id = ps.id
    INNER JOIN base_products bp ON ps.product_id = bp.id
    INNER JOIN quotes q ON qi."quoteId" = q.id
    WHERE q.status IN ('approved', 'in_production', 'ready', 'delivered')
    ${productId ? sql`AND bp.id = ${productId}` : sql``}
    GROUP BY bp.id, bp.name
    ORDER BY total_revenue DESC
    LIMIT 20
  `);

  return (result.rows as any[]).map(row => ({
    productId: row.product_id,
    productName: row.product_name,
    orderCount: Number(row.order_count),
    totalQuantity: Number(row.total_quantity),
    totalRevenue: Number(row.total_revenue),
  }));
}

/**
 * Get conversion funnel analytics
 */
export async function getConversionFunnel(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return {
    draft: 0,
    sent: 0,
    approved: 0,
    rejected: 0,
    delivered: 0,
    conversionRate: 0,
  };

  const conditions = [];
  if (startDate) {
    conditions.push(gte(quotes.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(quotes.createdAt, endDate));
  }

  const result = await db.select({
    status: quotes.status,
    count: sql<number>`count(*)`,
  })
    .from(quotes)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(quotes.status);

  const funnel = {
    draft: 0,
    sent: 0,
    approved: 0,
    rejected: 0,
    delivered: 0,
    conversionRate: 0,
  };

  let total = 0;
  let converted = 0;

  for (const row of result) {
    const count = Number(row.count);
    total += count;
    
    if (row.status === 'draft') funnel.draft = count;
    if (row.status === 'sent') funnel.sent = count;
    if (row.status === 'approved' || row.status === 'in_production' || row.status === 'ready') {
      funnel.approved += count;
      converted += count;
    }
    if (row.status === 'rejected') funnel.rejected = count;
    if (row.status === 'delivered') {
      funnel.delivered = count;
      converted += count;
    }
  }

  funnel.conversionRate = total > 0 ? (converted / total) * 100 : 0;

  return funnel;
}


// ==================== ADDITIONAL ANALYTICS ====================

import { 
  baseProducts,
  productSizes,
  sizeQuantities,
  quoteItems
} from "../../drizzle/schema";
import { inArray } from "./connection";

/**
 * Get analytics summary
 */
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
      approved: sql<number>`SUM(CASE WHEN status IN ('approved', 'in_production', 'ready') THEN 1 ELSE 0 END)`,
    }).from(quotes),
  ]);

  const totalQuotes = Number(quotesData[0]?.total || 0);
  const approvedQuotes = Number(quotesData[0]?.approved || 0);

  return {
    totalCustomers: Number(customers[0]?.count || 0),
    totalSuppliers: Number(suppliers[0]?.count || 0),
    totalProducts: Number(products[0]?.count || 0),
    totalQuotes,
    totalRevenue: 0,
    avgConversionRate: totalQuotes > 0 ? Math.round((approvedQuotes / totalQuotes) * 100) : 0,
  };
}

/**
 * Get product performance
 */
export async function getProductPerformance(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const results = await db.select({
    productId: baseProducts.id,
    productName: baseProducts.name,
    category: baseProducts.category,
    totalQuotes: sql<number>`count(DISTINCT ${quoteItems.quoteId})`,
    totalQuantity: sql<number>`COALESCE(SUM(${quoteItems.quantity}), 0)`,
    totalRevenue: sql<number>`COALESCE(SUM(CAST(${quoteItems.priceAtTimeOfQuote} AS DECIMAL) * ${quoteItems.quantity}), 0)`,
    avgUnitPrice: sql<number>`COALESCE(AVG(CAST(${quoteItems.priceAtTimeOfQuote} AS DECIMAL)), 0)`,
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

  return results.sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue));
}

/**
 * Get supplier performance
 */
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
    totalRevenue: sql<number>`COALESCE(SUM(CAST(${quoteItems.supplierCost} AS DECIMAL) * ${quoteItems.quantity}), 0)`,
    avgDeliveryDays: sql<number>`COALESCE(AVG(${quoteItems.deliveryDays}), 0)`,
    completedJobs: sql<number>`count(DISTINCT ${quoteItems.id})`,
    onTimeDelivery: sql<number>`100`,
  })
    .from(users)
    .leftJoin(quoteItems, eq(quoteItems.supplierId, users.id))
    .leftJoin(quotes, and(
      eq(quoteItems.quoteId, quotes.id),
      sql`${quotes.createdAt} BETWEEN ${start} AND ${end}`
    ))
    .where(eq(users.role, 'supplier'))
    .groupBy(users.id, users.name, users.companyName);

  return results.sort((a, b) => Number(b.totalJobs) - Number(a.totalJobs));
}

/**
 * Get revenue report
 */
export async function getRevenueReport(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, totalCost: 0, profit: 0, margin: 0, byMonth: [] };

  // Default to last month if no dates provided
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const summary = await db.select({
    totalRevenue: sql<number>`COALESCE(SUM(CAST(${quoteItems.priceAtTimeOfQuote} AS DECIMAL) * ${quoteItems.quantity}), 0)`,
    totalCost: sql<number>`COALESCE(SUM(CAST(${quoteItems.supplierCost} AS DECIMAL) * ${quoteItems.quantity}), 0)`,
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

  const byMonthResults = await db.execute(sql`
    SELECT 
      TO_CHAR(q."createdAt", 'YYYY-MM') as month,
      COALESCE(SUM(CAST(qi."priceAtTimeOfQuote" AS DECIMAL) * qi.quantity), 0) as revenue,
      COALESCE(SUM(CAST(qi."supplierCost" AS DECIMAL) * qi.quantity), 0) as cost,
      count(DISTINCT q.id) as "quoteCount"
    FROM quote_items qi
    INNER JOIN quotes q ON qi."quoteId" = q.id
    WHERE q."createdAt" BETWEEN ${start} AND ${end}
    AND q.status IN ('approved', 'in_production', 'ready')
    GROUP BY TO_CHAR(q."createdAt", 'YYYY-MM')
    ORDER BY month
  `);

  const byMonth = (byMonthResults.rows as any[]).map(m => ({
    month: m.month,
    revenue: Number(m.revenue),
    cost: Number(m.cost),
    profit: Number(m.revenue) - Number(m.cost),
    quoteCount: Number(m.quoteCount),
  }));

  return {
    totalRevenue,
    totalCost,
    profit,
    margin: Math.round(margin * 100) / 100,
    byMonth,
  };
}
