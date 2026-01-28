/**
 * Supplier Recommendations by Item
 * 
 * Gets supplier recommendations for each individual quote item.
 * Each item shows suppliers who can fulfill that specific item.
 * Uses the NEW enhanced scoring algorithm with all criteria.
 */

import { eq, sql, and, inArray } from "drizzle-orm";
import { users, supplierPrices, baseProducts, productSizes, sizeQuantities, categories } from "../drizzle/schema";
import { getDb } from "./db";
import { 
  getSupplierCompletedJobsCount,
  getMarketAveragePrice,
  getSupplierPrice,
  getPromiseKeepingData,
  getCourierConfirmData,
  getEarlyFinishData,
  getCategoryExpertiseData,
  getCurrentLoadData,
  getConsistencyData,
  getCancellationData,
} from "./supplierRecommendations";

// Scoring configuration - same as main algorithm
const SCORING_CONFIG = {
  baseScore: {
    noJobs: 70,
    fewJobs: 80,
    someJobs: 90,
    manyJobs: 100,
  },
  criteria: {
    price: { max: 10, min: -10 },
    promiseKeeping: { max: 8, min: -8 },
    courierConfirm: { max: 6, min: -6 },
    earlyFinish: { max: 3, min: 0 },
    categoryExpert: { max: 2, min: 0 },
    currentLoad: { max: 0, min: -3 },
    consistency: { max: 2, min: 0 },
    cancellations: { max: 0, min: -2 },
    multiItem: { max: 5, min: 0 }, // Bonus for multi-item capability
  },
};

export interface QuoteItemForRecommendation {
  quoteItemId: number;
  sizeQuantityId: number;
  quantity: number;
  productName?: string;
}

export interface SupplierForItem {
  supplierId: number;
  supplierName: string;
  supplierCompany: string | null;
  avgRating: number;
  pricePerUnit: number;
  deliveryDays: number;
  reliabilityPct: number;
  totalScore: number;
  rank: number;
  canFulfillOtherItems: number;
  multiItemBonus: number;
  isNewSupplier: boolean;
  // Score breakdown for transparency
  scoreBreakdown?: {
    baseScore: number;
    priceScore: number;
    promiseKeepingScore: number;
    courierConfirmScore: number;
    earlyFinishScore: number;
    categoryExpertScore: number;
    currentLoadScore: number;
    consistencyScore: number;
    cancellationScore: number;
    multiItemScore: number;
  };
}

export interface ItemSupplierRecommendation {
  quoteItemId: number;
  sizeQuantityId: number;
  productName: string;
  categoryName: string;
  quantity: number;
  suppliers: SupplierForItem[];
  selectedSupplierId?: number;
}

// ============================================
// SCORING CALCULATION FUNCTIONS
// ============================================

function calculateBaseScore(completedJobs: number): number {
  if (completedJobs >= 10) return SCORING_CONFIG.baseScore.manyJobs;
  if (completedJobs >= 5) return SCORING_CONFIG.baseScore.someJobs;
  if (completedJobs >= 1) return SCORING_CONFIG.baseScore.fewJobs;
  return SCORING_CONFIG.baseScore.noJobs;
}

function calculatePriceScore(supplierPrice: number, marketAverage: number): number {
  if (marketAverage === 0 || supplierPrice === 0) return 0;
  const priceDiffPercent = ((marketAverage - supplierPrice) / marketAverage) * 100;
  let score = priceDiffPercent * 0.5;
  return Math.max(SCORING_CONFIG.criteria.price.min, 
                  Math.min(SCORING_CONFIG.criteria.price.max, score));
}

function calculatePromiseKeepingScore(percentage: number): number {
  const score = (percentage - 80) * 0.4;
  return Math.max(SCORING_CONFIG.criteria.promiseKeeping.min,
                  Math.min(SCORING_CONFIG.criteria.promiseKeeping.max, score));
}

function calculateCourierConfirmScore(percentage: number): number {
  const score = (percentage - 80) * 0.3;
  return Math.max(SCORING_CONFIG.criteria.courierConfirm.min,
                  Math.min(SCORING_CONFIG.criteria.courierConfirm.max, score));
}

function calculateEarlyFinishScore(avgDaysEarly: number): number {
  const score = Math.min(avgDaysEarly, SCORING_CONFIG.criteria.earlyFinish.max);
  return Math.max(0, score);
}

function calculateCategoryExpertScore(jobsInCategory: number): number {
  if (jobsInCategory >= 10) return SCORING_CONFIG.criteria.categoryExpert.max;
  if (jobsInCategory >= 5) return 1;
  return 0;
}

function calculateCurrentLoadScore(openJobs: number): number {
  const score = -Math.floor(openJobs / 3);
  return Math.max(SCORING_CONFIG.criteria.currentLoad.min, score);
}

function calculateConsistencyScore(isConsistent: boolean, stdDev: number, avgDays: number): number {
  if (avgDays === 0) return 0;
  const ratio = stdDev / avgDays;
  if (ratio < 0.2) return SCORING_CONFIG.criteria.consistency.max;
  if (ratio < 0.3) return 1;
  return 0;
}

function calculateCancellationScore(percentage: number): number {
  const score = -Math.floor(percentage / 5);
  return Math.max(SCORING_CONFIG.criteria.cancellations.min, score);
}

function calculateMultiItemScore(otherItemsCanFulfill: number): number {
  // 1 point per additional item, max 5
  return Math.min(otherItemsCanFulfill, SCORING_CONFIG.criteria.multiItem.max);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getSuppliersForSizeQuantities(sizeQuantityIds: number[]): Promise<Map<number, { supplierId: number; pricePerUnit: number; deliveryDays: number }[]>> {
  const db = await getDb();
  if (!db) return new Map();

  const result = new Map<number, { supplierId: number; pricePerUnit: number; deliveryDays: number }[]>();

  try {
    const pricesResult = await db
      .select({
        supplierId: supplierPrices.supplierId,
        sizeQuantityId: supplierPrices.sizeQuantityId,
        pricePerUnit: supplierPrices.pricePerUnit,
        deliveryDays: supplierPrices.deliveryDays,
      })
      .from(supplierPrices)
      .innerJoin(users, eq(supplierPrices.supplierId, users.id))
      .where(
        and(
          inArray(supplierPrices.sizeQuantityId, sizeQuantityIds),
          eq(users.status, 'active'),
          eq(users.role, 'supplier')
        )
      );

    for (const row of pricesResult) {
      const sqId = row.sizeQuantityId;
      if (!result.has(sqId)) {
        result.set(sqId, []);
      }
      result.get(sqId)!.push({
        supplierId: row.supplierId,
        pricePerUnit: parseFloat(row.pricePerUnit) || 0,
        deliveryDays: row.deliveryDays || 3,
      });
    }
  } catch (error) {
    console.error('[GetSuppliersForSizeQuantities] Error:', error);
  }

  return result;
}

async function getItemInfo(item: QuoteItemForRecommendation): Promise<{
  categoryId: number;
  categoryName: string;
  productName: string;
} | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const queryResult = await db.execute(sql`
      SELECT 
        bp.id as product_id,
        bp.name as product_name,
        bp."categoryId" as category_id,
        COALESCE(c.name, bp.category, 'כללי') as category_name,
        ps.name as size_name
      FROM size_quantities sq
      JOIN product_sizes ps ON sq.size_id = ps.id
      JOIN base_products bp ON ps.product_id = bp.id
      LEFT JOIN categories c ON bp."categoryId" = c.id
      WHERE sq.id = ${item.sizeQuantityId}
    `);

    if (queryResult.rows && queryResult.rows.length > 0) {
      const row = queryResult.rows[0] as any;
      return {
        categoryId: row.category_id || 0,
        categoryName: row.category_name || 'כללי',
        productName: item.productName || `${row.product_name} - ${row.size_name}`,
      };
    }
  } catch (error) {
    console.error('[GetItemInfo] Error for item:', item, error);
  }

  return null;
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Get recommendations for each individual quote item
 * Uses the NEW enhanced scoring algorithm with all criteria
 */
export async function getRecommendationsByItem(
  quoteItems: QuoteItemForRecommendation[]
): Promise<ItemSupplierRecommendation[]> {
  const db = await getDb();
  if (!db) return [];

  // Step 1: Get all sizeQuantityIds and their suppliers
  const allSizeQuantityIds = quoteItems.map(i => i.sizeQuantityId);
  const supplierPricesMap = await getSuppliersForSizeQuantities(allSizeQuantityIds);

  // Step 2: Calculate how many items each supplier can fulfill (for bonus calculation)
  const supplierItemCount = new Map<number, number>();
  for (const [sqId, suppliers] of Array.from(supplierPricesMap)) {
    for (const sp of suppliers) {
      supplierItemCount.set(sp.supplierId, (supplierItemCount.get(sp.supplierId) || 0) + 1);
    }
  }

  // Step 3: Build recommendations for each item
  const recommendations: ItemSupplierRecommendation[] = [];

  for (const item of quoteItems) {
    const itemInfo = await getItemInfo(item);
    if (!itemInfo) continue;

    const suppliersForItem = supplierPricesMap.get(item.sizeQuantityId) || [];
    
    if (suppliersForItem.length === 0) {
      recommendations.push({
        quoteItemId: item.quoteItemId,
        sizeQuantityId: item.sizeQuantityId,
        productName: itemInfo.productName,
        categoryName: itemInfo.categoryName,
        quantity: item.quantity,
        suppliers: [],
      });
      continue;
    }

    // Get market average price for this item
    const marketAveragePrice = await getMarketAveragePrice(item.sizeQuantityId);

    // Get supplier details and calculate scores using the NEW algorithm
    const supplierScores: SupplierForItem[] = [];

    for (const sp of suppliersForItem) {
      // Get supplier info
      const [supplierInfo] = await db.select({
        id: users.id,
        name: users.name,
        companyName: users.companyName,
      })
        .from(users)
        .where(eq(users.id, sp.supplierId))
        .limit(1);

      if (!supplierInfo) continue;

      // Fetch all metrics in parallel
      const [
        completedJobs,
        promiseKeeping,
        courierConfirm,
        earlyFinish,
        categoryExpertise,
        currentLoad,
        consistency,
        cancellations,
      ] = await Promise.all([
        getSupplierCompletedJobsCount(sp.supplierId),
        getPromiseKeepingData(sp.supplierId),
        getCourierConfirmData(sp.supplierId),
        getEarlyFinishData(sp.supplierId),
        getCategoryExpertiseData(sp.supplierId, itemInfo.categoryId),
        getCurrentLoadData(sp.supplierId),
        getConsistencyData(sp.supplierId),
        getCancellationData(sp.supplierId),
      ]);

      // Calculate multi-item bonus
      const totalItemsCanFulfill = supplierItemCount.get(sp.supplierId) || 1;
      const otherItemsCanFulfill = totalItemsCanFulfill - 1;

      // Calculate all scores using the NEW algorithm
      const baseScore = calculateBaseScore(completedJobs);
      const priceScore = calculatePriceScore(sp.pricePerUnit, marketAveragePrice);
      const promiseKeepingScore = calculatePromiseKeepingScore(promiseKeeping.percentage);
      const courierConfirmScore = calculateCourierConfirmScore(courierConfirm.percentage);
      const earlyFinishScore = calculateEarlyFinishScore(earlyFinish.avgDaysEarly);
      const categoryExpertScore = calculateCategoryExpertScore(categoryExpertise.jobsInCategory);
      const currentLoadScore = calculateCurrentLoadScore(currentLoad);
      const consistencyScore = calculateConsistencyScore(consistency.isConsistent, consistency.stdDev, consistency.avgDays);
      const cancellationScore = calculateCancellationScore(cancellations.percentage);
      const multiItemScore = calculateMultiItemScore(otherItemsCanFulfill);

      // Calculate total score
      const totalScore = baseScore + priceScore + promiseKeepingScore + courierConfirmScore +
                         earlyFinishScore + categoryExpertScore + currentLoadScore +
                         consistencyScore + cancellationScore + multiItemScore;

      supplierScores.push({
        supplierId: supplierInfo.id,
        supplierName: supplierInfo.name || 'ספק',
        supplierCompany: supplierInfo.companyName,
        avgRating: Math.round((promiseKeeping.percentage / 20) * 10) / 10, // Convert to 5-star scale
        pricePerUnit: sp.pricePerUnit,
        deliveryDays: sp.deliveryDays,
        reliabilityPct: Math.round(courierConfirm.percentage),
        totalScore: Math.round(totalScore * 10) / 10,
        rank: 0,
        canFulfillOtherItems: otherItemsCanFulfill,
        multiItemBonus: multiItemScore,
        isNewSupplier: completedJobs < 5,
        scoreBreakdown: {
          baseScore: Math.round(baseScore * 10) / 10,
          priceScore: Math.round(priceScore * 10) / 10,
          promiseKeepingScore: Math.round(promiseKeepingScore * 10) / 10,
          courierConfirmScore: Math.round(courierConfirmScore * 10) / 10,
          earlyFinishScore: Math.round(earlyFinishScore * 10) / 10,
          categoryExpertScore: Math.round(categoryExpertScore * 10) / 10,
          currentLoadScore: Math.round(currentLoadScore * 10) / 10,
          consistencyScore: Math.round(consistencyScore * 10) / 10,
          cancellationScore: Math.round(cancellationScore * 10) / 10,
          multiItemScore: Math.round(multiItemScore * 10) / 10,
        },
      });
    }

    if (supplierScores.length === 0) {
      recommendations.push({
        quoteItemId: item.quoteItemId,
        sizeQuantityId: item.sizeQuantityId,
        productName: itemInfo.productName,
        categoryName: itemInfo.categoryName,
        quantity: item.quantity,
        suppliers: [],
      });
      continue;
    }

    // Sort by score and assign ranks
    supplierScores.sort((a, b) => b.totalScore - a.totalScore);
    supplierScores.forEach((s, index) => {
      s.rank = index + 1;
    });

    recommendations.push({
      quoteItemId: item.quoteItemId,
      sizeQuantityId: item.sizeQuantityId,
      productName: itemInfo.productName,
      categoryName: itemInfo.categoryName,
      quantity: item.quantity,
      suppliers: supplierScores.slice(0, 5), // Top 5 per item
    });
  }

  return recommendations;
}

/**
 * Select supplier for a single item
 */
export async function selectSupplierForItem(
  quoteId: number,
  quoteItemId: number,
  supplierId: number,
  pricePerUnit: number,
  deliveryDays: number,
  markupPercentage: number = 0
): Promise<{ success: boolean; updatedItem: any }> {
  const db = await getDb();
  if (!db) return { success: false, updatedItem: null };

  try {
    const supplierCost = pricePerUnit;
    const customerPrice = Math.round(supplierCost * (1 + markupPercentage / 100));

    const [supplierInfo] = await db.select({
      name: users.name,
      companyName: users.companyName,
    })
      .from(users)
      .where(eq(users.id, supplierId))
      .limit(1);

    const supplierName = supplierInfo?.companyName || supplierInfo?.name || 'ספק';

    await db.execute(sql`
      UPDATE quote_items
      SET "supplierId" = ${supplierId},
          "supplierCost" = ${supplierCost.toString()},
          "priceAtTimeOfQuote" = ${customerPrice.toString()},
          "deliveryDays" = ${deliveryDays},
          "isManualPrice" = false
      WHERE id = ${quoteItemId}
    `);

    const totalsResult = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CAST("supplierCost" AS DECIMAL)), 0) as total_supplier_cost,
        COALESCE(SUM(CAST("priceAtTimeOfQuote" AS DECIMAL)), 0) as total_customer_price
      FROM quote_items
      WHERE "quoteId" = ${quoteId}
    `);

    const totals = totalsResult.rows[0] as any;
    const totalSupplierCost = parseFloat(totals.total_supplier_cost) || 0;
    const totalCustomerPrice = parseFloat(totals.total_customer_price) || 0;

    await db.execute(sql`
      UPDATE quotes
      SET "totalSupplierCost" = ${totalSupplierCost.toString()},
          "finalValue" = ${totalCustomerPrice.toString()},
          "updatedAt" = NOW()
      WHERE id = ${quoteId}
    `);

    return {
      success: true,
      updatedItem: {
        quoteItemId,
        supplierId,
        supplierName,
        supplierCost,
        customerPrice,
        deliveryDays,
      },
    };
  } catch (error) {
    console.error('[SelectSupplierForItem] Error:', error);
    return { success: false, updatedItem: null };
  }
}
