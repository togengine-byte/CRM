/**
 * Supplier Recommendation Engine
 * 
 * Calculates weighted scores for suppliers based on:
 * 1. Price - Lower price = higher score
 * 2. Rating - Average rating from past transactions
 * 3. Delivery Speed - Faster completion time = higher score
 * 4. Reliability - Percentage of times work was actually ready when supplier marked it ready
 *                  (verified by courier confirmation)
 */

import { eq, and, sql, desc } from "drizzle-orm";
import { users, supplierPrices, baseProducts } from "../drizzle/schema";
import { getDb } from "./db";

// Get supplier scoring weights from settings
export async function getSupplierWeights() {
  const db = await getDb();
  if (!db) {
    return { price: 30, rating: 25, deliveryTime: 25, reliability: 20 };
  }

  try {
    const result = await db.execute(sql`
      SELECT value FROM system_settings WHERE key = 'supplier_weights' LIMIT 1
    `);
    
    if (result.rows && result.rows.length > 0) {
      const value = result.rows[0].value as any;
      return {
        price: value.price || 30,
        rating: value.rating || 25,
        deliveryTime: value.deliveryTime || 25,
        reliability: value.reliability || 20,
      };
    }
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting weights:', error);
  }

  return { price: 30, rating: 25, deliveryTime: 25, reliability: 20 };
}

// Get supplier reliability data from supplier_jobs table
export async function getSupplierReliabilityData(supplierId: number) {
  const db = await getDb();
  if (!db) return { reliabilityPct: 50, totalJobs: 0, reliableJobs: 0 };

  try {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN "courierConfirmedReady" = TRUE THEN 1 ELSE 0 END) as reliable_jobs
      FROM supplier_jobs
      WHERE "supplierId" = ${supplierId}
        AND "courierConfirmedReady" IS NOT NULL
    `);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      const totalJobs = parseInt(row.total_jobs) || 0;
      const reliableJobs = parseInt(row.reliable_jobs) || 0;
      const reliabilityPct = totalJobs > 0 ? (reliableJobs / totalJobs) * 100 : 50;
      
      return { reliabilityPct, totalJobs, reliableJobs };
    }
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting reliability:', error);
  }

  return { reliabilityPct: 50, totalJobs: 0, reliableJobs: 0 };
}

// Get supplier average rating from supplier_jobs
export async function getSupplierRatingData(supplierId: number) {
  const db = await getDb();
  if (!db) return { avgRating: 3, totalRatings: 0 };

  try {
    const result = await db.execute(sql`
      SELECT 
        AVG("supplierRating") as avg_rating,
        COUNT("supplierRating") as total_ratings
      FROM supplier_jobs
      WHERE "supplierId" = ${supplierId}
        AND "supplierRating" IS NOT NULL
    `);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      const avgRating = parseFloat(row.avg_rating) || 3;
      const totalRatings = parseInt(row.total_ratings) || 0;
      
      return { avgRating, totalRatings };
    }
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting rating:', error);
  }

  return { avgRating: 3, totalRatings: 0 };
}

// Get supplier average delivery speed (time from job creation to marked ready)
export async function getSupplierSpeedData(supplierId: number) {
  const db = await getDb();
  if (!db) return { avgDeliveryDays: 3, totalDeliveries: 0 };

  try {
    const result = await db.execute(sql`
      SELECT 
        AVG(EXTRACT(EPOCH FROM ("supplierReadyAt" - "createdAt")) / 86400) as avg_days,
        COUNT(*) as total_deliveries
      FROM supplier_jobs
      WHERE "supplierId" = ${supplierId}
        AND "supplierReadyAt" IS NOT NULL
    `);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      const avgDeliveryDays = parseFloat(row.avg_days) || 3;
      const totalDeliveries = parseInt(row.total_deliveries) || 0;
      
      return { avgDeliveryDays, totalDeliveries };
    }
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting speed:', error);
  }

  return { avgDeliveryDays: 3, totalDeliveries: 0 };
}

// Get supplier average price from past jobs
export async function getSupplierPriceData(supplierId: number, productId?: number) {
  const db = await getDb();
  if (!db) return { avgPrice: 0, totalPriceJobs: 0 };

  try {
    let query;
    if (productId) {
      // Get average price for specific product
      query = sql`
        SELECT 
          AVG("pricePerUnit") as avg_price,
          COUNT(*) as total_jobs
        FROM supplier_jobs sj
        JOIN product_variants pv ON sj."productVariantId" = pv.id
        WHERE sj."supplierId" = ${supplierId}
          AND pv."baseProductId" = ${productId}
          AND sj."pricePerUnit" IS NOT NULL
      `;
    } else {
      // Get overall average price
      query = sql`
        SELECT 
          AVG("pricePerUnit") as avg_price,
          COUNT(*) as total_jobs
        FROM supplier_jobs
        WHERE "supplierId" = ${supplierId}
          AND "pricePerUnit" IS NOT NULL
      `;
    }

    const result = await db.execute(query);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      const avgPrice = parseFloat(row.avg_price) || 0;
      const totalPriceJobs = parseInt(row.total_jobs) || 0;
      
      return { avgPrice, totalPriceJobs };
    }
  } catch (error) {
    console.error('[SupplierRecommendations] Error getting price:', error);
  }

  return { avgPrice: 0, totalPriceJobs: 0 };
}

// Main recommendation function
export interface SupplierRecommendation {
  supplierId: number;
  supplierNumber: number;
  supplierName: string;
  supplierCompany: string | null;
  metrics: {
    avgPrice: number;
    avgRating: number;
    avgDeliveryDays: number;
    reliabilityPct: number;
    totalJobs: number;
  };
  scores: {
    price: number;
    rating: number;
    delivery: number;
    reliability: number;
    total: number;
  };
  weights: {
    price: number;
    rating: number;
    deliveryTime: number;
    reliability: number;
  };
  rank: number;
}

export async function getEnhancedSupplierRecommendations(productId?: number): Promise<SupplierRecommendation[]> {
  const db = await getDb();
  if (!db) return [];

  // Get weights from settings
  const weights = await getSupplierWeights();

  // Get all active suppliers
  const suppliers = await db.select({
    id: users.id,
    name: users.name,
    companyName: users.companyName,
    supplierNumber: users.supplierNumber,
  })
    .from(users)
    .where(and(
      eq(users.role, 'supplier'),
      eq(users.status, 'active')
    ));

  if (suppliers.length === 0) return [];

  // Gather data for each supplier
  const supplierData = await Promise.all(suppliers.map(async (supplier) => {
    const [reliability, rating, speed, price] = await Promise.all([
      getSupplierReliabilityData(supplier.id),
      getSupplierRatingData(supplier.id),
      getSupplierSpeedData(supplier.id),
      getSupplierPriceData(supplier.id, productId),
    ]);

    return {
      ...supplier,
      reliability,
      rating,
      speed,
      price,
    };
  }));

  // Filter suppliers with at least some data
  const suppliersWithData = supplierData.filter(s => 
    s.reliability.totalJobs > 0 || s.rating.totalRatings > 0 || s.speed.totalDeliveries > 0
  );

  if (suppliersWithData.length === 0) {
    // Return all suppliers with default scores if no historical data
    return suppliers.map((s, index) => ({
      supplierId: s.id,
      supplierNumber: s.supplierNumber || 1001 + index,
      supplierName: s.name || 'ספק',
      supplierCompany: s.companyName,
      metrics: {
        avgPrice: 0,
        avgRating: 3,
        avgDeliveryDays: 3,
        reliabilityPct: 50,
        totalJobs: 0,
      },
      scores: {
        price: 50,
        rating: 60,
        delivery: 50,
        reliability: 50,
        total: 50,
      },
      weights,
      rank: index + 1,
    }));
  }

  // Calculate min/max for normalization
  const prices = suppliersWithData.map(s => s.price.avgPrice).filter(p => p > 0);
  const deliveries = suppliersWithData.map(s => s.speed.avgDeliveryDays).filter(d => d > 0);
  
  const minPrice = prices.length > 0 ? Math.min(...prices) : 1;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 10;
  const minDelivery = deliveries.length > 0 ? Math.min(...deliveries) : 1;
  const maxDelivery = deliveries.length > 0 ? Math.max(...deliveries) : 7;

  // Calculate scores for each supplier
  const recommendations = suppliersWithData.map(supplier => {
    const avgPrice = supplier.price.avgPrice || ((minPrice + maxPrice) / 2);
    const avgRating = supplier.rating.avgRating || 3;
    const avgDeliveryDays = supplier.speed.avgDeliveryDays || 3;
    const reliabilityPct = supplier.reliability.reliabilityPct;
    const totalJobs = supplier.reliability.totalJobs;

    // Normalize scores (0-100, higher is better)
    // Price: lower is better
    const priceScore = maxPrice === minPrice ? 50 : 
      ((maxPrice - avgPrice) / (maxPrice - minPrice)) * 100;
    
    // Rating: higher is better (1-5 scale)
    const ratingScore = (avgRating / 5) * 100;
    
    // Delivery: faster is better
    const deliveryScore = maxDelivery === minDelivery ? 50 : 
      ((maxDelivery - avgDeliveryDays) / (maxDelivery - minDelivery)) * 100;
    
    // Reliability: higher percentage is better
    const reliabilityScore = reliabilityPct;

    // Weighted total using configurable weights
    const totalScore = 
      (priceScore * weights.price / 100) + 
      (ratingScore * weights.rating / 100) + 
      (deliveryScore * weights.deliveryTime / 100) + 
      (reliabilityScore * weights.reliability / 100);

    return {
      supplierId: supplier.id,
      supplierNumber: supplier.supplierNumber || 1001,
      supplierName: supplier.name || 'ספק',
      supplierCompany: supplier.companyName,
      metrics: {
        avgPrice: Math.round(avgPrice * 100) / 100,
        avgRating: Math.round(avgRating * 10) / 10,
        avgDeliveryDays: Math.round(avgDeliveryDays * 10) / 10,
        reliabilityPct: Math.round(reliabilityPct),
        totalJobs,
      },
      scores: {
        price: Math.round(priceScore),
        rating: Math.round(ratingScore),
        delivery: Math.round(deliveryScore),
        reliability: Math.round(reliabilityScore),
        total: Math.round(totalScore),
      },
      weights,
      rank: 0, // Will be set after sorting
    };
  });

  // Sort by total score descending and assign ranks
  recommendations.sort((a, b) => b.scores.total - a.scores.total);
  recommendations.forEach((rec, index) => {
    rec.rank = index + 1;
  });

  return recommendations;
}

// Get top N supplier recommendations
export async function getTopSupplierRecommendations(productId?: number, limit: number = 3): Promise<SupplierRecommendation[]> {
  const recommendations = await getEnhancedSupplierRecommendations(productId);
  return recommendations.slice(0, limit);
}
