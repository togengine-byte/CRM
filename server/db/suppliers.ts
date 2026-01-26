/**
 * Suppliers Module
 * 
 * Supplier management functions including CRUD operations,
 * pricing, recommendations, and performance tracking.
 */

import { getDb, eq, and, desc, sql, inArray } from "./connection";
import { 
  users, 
  supplierPrices, 
  sizeQuantities, 
  productSizes, 
  baseProducts, 
  quoteItems, 
  quotes,
  systemSettings,
  supplierJobs
} from "../../drizzle/schema";
import { logActivity } from "./activity";
import { SupplierWeights, DEFAULT_SUPPLIER_WEIGHTS } from "./types";

// ==================== SUPPLIER CRUD ====================

/**
 * Get suppliers with optional filters
 */
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

/**
 * Get supplier by ID with detailed information
 */
export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const supplier = await db.select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, 'supplier')))
    .limit(1);

  if (supplier.length === 0) return null;

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

  const openJobsResult = await db.select({
    count: sql<number>`count(*)`,
  })
    .from(quoteItems)
    .where(eq(quoteItems.supplierId, id));

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

  const avgRating = parseFloat(ratingsRow.avg_rating) || 3;
  const totalRatings = parseInt(ratingsRow.total_ratings) || 0;
  const reliableJobs = parseInt(ratingsRow.reliable_jobs) || 0;
  const totalReadyJobs = parseInt(ratingsRow.total_ready_jobs) || 0;
  const avgDeliveryDays = parseFloat(ratingsRow.avg_delivery_days) || 3;
  const supplierPrice = parseFloat(priceRow.supplier_price) || 0;
  const marketPrice = parseFloat(priceRow.market_price) || 0;

  const qualityScore = Math.round((avgRating / 5) * 100);
  const reliabilityScore = totalReadyJobs > 0 ? Math.round((reliableJobs / totalReadyJobs) * 100) : 50;
  const speedScore = Math.round(Math.max(0, Math.min(100, 100 - (avgDeliveryDays - 1) * 20)));
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

/**
 * Create new supplier
 */
export async function createSupplier(input: {
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  address?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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

/**
 * Update supplier
 */
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

/**
 * Get suppliers list (simple)
 */
export async function getSuppliersList() {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(users)
    .where(eq(users.role, 'supplier'))
    .orderBy(desc(users.id));
}

// ==================== SUPPLIER PRICES ====================

/**
 * Get supplier prices
 */
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

/**
 * Upsert supplier price
 */
export async function upsertSupplierPrice(input: {
  supplierId: number;
  sizeQuantityId: number;
  price: number;
  deliveryDays?: number;
  isPreferred?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select()
    .from(supplierPrices)
    .where(and(
      eq(supplierPrices.supplierId, input.supplierId),
      eq(supplierPrices.sizeQuantityId, input.sizeQuantityId)
    ))
    .limit(1);

  if (existing.length > 0) {
    await db.update(supplierPrices)
      .set({
        pricePerUnit: input.price.toString(),
        deliveryDays: input.deliveryDays ?? existing[0].deliveryDays,
        isPreferred: input.isPreferred ?? existing[0].isPreferred,
      })
      .where(eq(supplierPrices.id, existing[0].id));
  } else {
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

/**
 * Delete supplier price
 */
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

/**
 * Get supplier open jobs
 */
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

// ==================== SUPPLIER RECOMMENDATIONS ====================

/**
 * Get supplier weights from settings
 */
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

/**
 * Update supplier weights
 */
export async function updateSupplierWeights(weights: SupplierWeights, updatedBy: number) {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };

  const sum = weights.price + weights.rating + weights.deliveryTime + weights.reliability;
  if (sum !== 100) {
    return { success: false, error: `סכום המשקלים חייב להיות 100% (כרגע: ${sum}%)` };
  }

  for (const [key, value] of Object.entries(weights)) {
    if (value < 0 || value > 100) {
      return { success: false, error: `משקל ${key} חייב להיות בין 0 ל-100` };
    }
  }

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

/**
 * Get supplier recommendations for a size+quantity
 */
export async function getSupplierRecommendations(sizeQuantityId: number, quantity: number) {
  const db = await getDb();
  if (!db) return [];

  const weights = await getSupplierWeights();

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

  const minPrice = Math.min(...suppliers.map(s => Number(s.price)));
  const maxPrice = Math.max(...suppliers.map(s => Number(s.price)));
  const minDelivery = Math.min(...suppliers.map(s => s.deliveryDays || 3));
  const maxDelivery = Math.max(...suppliers.map(s => s.deliveryDays || 3));

  const recommendations = suppliers.map(supplier => {
    const price = Number(supplier.price);
    const delivery = supplier.deliveryDays || 3;
    const quality = Number(supplier.qualityRating || 3);
    
    const avgRating = supplier.ratedDealsCount && supplier.ratedDealsCount > 0
      ? (supplier.totalRatingPoints || 0) / supplier.ratedDealsCount
      : 3;
    
    const reliability = quality;
    
    const priceScore = maxPrice === minPrice ? 100 : 
      ((maxPrice - price) / (maxPrice - minPrice)) * 100;
    const deliveryScore = maxDelivery === minDelivery ? 100 : 
      ((maxDelivery - delivery) / (maxDelivery - minDelivery)) * 100;
    const ratingScore = (avgRating / 5) * 100;
    const reliabilityScore = (reliability / 5) * 100;

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
      weights: weights,
      totalCost: price * quantity,
    };
  });

  return recommendations.sort((a, b) => b.scores.total - a.scores.total);
}

/**
 * Get supplier statistics
 */
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

/**
 * Assign supplier to quote item
 */
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
