/**
 * Supplier Recommendations by Category
 * 
 * Gets supplier recommendations grouped by product category for a quote.
 * Each category shows suppliers who have priced the EXACT sizeQuantityId in that category.
 */

import { eq, and, sql, inArray } from "drizzle-orm";
import { users, supplierPrices, baseProducts, productSizes, sizeQuantities, categories } from "../drizzle/schema";
import { getDb } from "./db";
import { getSupplierWeights, getSupplierReliabilityData, getSupplierRatingData, getSupplierSpeedData } from "./supplierRecommendations";

export interface QuoteItemForRecommendation {
  quoteItemId: number;
  sizeQuantityId: number;
  quantity: number;
  productName?: string;
}

export interface SupplierForCategory {
  supplierId: number;
  supplierName: string;
  supplierCompany: string | null;
  avgRating: number;
  totalPrice: number; // Total price for all items in this category
  avgDeliveryDays: number;
  reliabilityPct: number;
  totalScore: number;
  rank: number;
  // Which items this supplier can fulfill
  canFulfill: {
    quoteItemId: number;
    sizeQuantityId: number;
    pricePerUnit: number;
    deliveryDays: number;
  }[];
}

export interface CategorySupplierRecommendation {
  categoryId: number;
  categoryName: string;
  items: {
    quoteItemId: number;
    sizeQuantityId: number;
    productName: string;
    quantity: number;
  }[];
  suppliers: SupplierForCategory[];
}

/**
 * Get suppliers who have priced specific sizeQuantityIds
 */
async function getSuppliersForSizeQuantities(sizeQuantityIds: number[]): Promise<Map<number, { supplierId: number; pricePerUnit: number; deliveryDays: number }[]>> {
  const db = await getDb();
  if (!db) return new Map();

  const result = new Map<number, { supplierId: number; pricePerUnit: number; deliveryDays: number }[]>();

  try {
    // Build the IN clause dynamically to avoid ANY() issues with Drizzle
    const sqIdList = sizeQuantityIds.join(',');
    const pricesResult = await db.execute(sql`
      SELECT 
        sp."supplierId",
        sp."sizeQuantityId",
        sp."pricePerUnit",
        sp."deliveryDays"
      FROM supplier_prices sp
      JOIN users u ON sp."supplierId" = u.id
      WHERE sp."sizeQuantityId" IN (${sql.raw(sqIdList)})
        AND u.status = 'active'
        AND u.role = 'supplier'
    `);

    for (const row of pricesResult.rows as any[]) {
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

/**
 * Get category info for sizeQuantityIds
 */
async function getCategoryInfoForItems(items: QuoteItemForRecommendation[]): Promise<Map<number, {
  categoryId: number;
  categoryName: string;
  productName: string;
  quoteItemId: number;
  sizeQuantityId: number;
  quantity: number;
}>> {
  const db = await getDb();
  if (!db) return new Map();

  const result = new Map();

  for (const item of items) {
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
        const productName = item.productName || `${row.product_name} - ${row.size_name}`;
        
        result.set(item.sizeQuantityId, {
          categoryId: row.category_id || 0,
          categoryName: row.category_name || 'כללי',
          productName,
          quoteItemId: item.quoteItemId,
          sizeQuantityId: item.sizeQuantityId,
          quantity: item.quantity,
        });
      }
    } catch (error) {
      console.error('[GetCategoryInfo] Error for item:', item, error);
    }
  }

  return result;
}

/**
 * Get recommendations grouped by category for quote items
 * Only shows suppliers who can fulfill ALL items in a category
 */
export async function getRecommendationsByCategory(
  quoteItems: QuoteItemForRecommendation[]
): Promise<CategorySupplierRecommendation[]> {
  const db = await getDb();
  if (!db) return [];

  // Step 1: Get category info for all items
  const itemCategoryInfo = await getCategoryInfoForItems(quoteItems);
  
  // Step 2: Group items by category
  const categoryGroups = new Map<number, {
    categoryName: string;
    items: {
      quoteItemId: number;
      sizeQuantityId: number;
      productName: string;
      quantity: number;
    }[];
  }>();

  for (const [sqId, info] of itemCategoryInfo) {
    if (!categoryGroups.has(info.categoryId)) {
      categoryGroups.set(info.categoryId, {
        categoryName: info.categoryName,
        items: [],
      });
    }
    categoryGroups.get(info.categoryId)!.items.push({
      quoteItemId: info.quoteItemId,
      sizeQuantityId: info.sizeQuantityId,
      productName: info.productName,
      quantity: info.quantity,
    });
  }

  // Step 3: Get suppliers who have prices for these sizeQuantityIds
  const allSizeQuantityIds = quoteItems.map(i => i.sizeQuantityId);
  const supplierPricesMap = await getSuppliersForSizeQuantities(allSizeQuantityIds);

  // Step 4: Get weights for scoring
  const weights = await getSupplierWeights();

  // Step 5: For each category, find suppliers who can fulfill ALL items
  const recommendations: CategorySupplierRecommendation[] = [];

  for (const [categoryId, categoryData] of categoryGroups) {
    const categoryItems = categoryData.items;
    const categorySqIds = categoryItems.map(i => i.sizeQuantityId);

    // Find suppliers who have prices for ALL items in this category
    const supplierCoverage = new Map<number, {
      canFulfill: { quoteItemId: number; sizeQuantityId: number; pricePerUnit: number; deliveryDays: number }[];
      totalPrice: number;
      maxDeliveryDays: number;
    }>();

    for (const sqId of categorySqIds) {
      const suppliersForSq = supplierPricesMap.get(sqId) || [];
      const item = categoryItems.find(i => i.sizeQuantityId === sqId)!;

      for (const sp of suppliersForSq) {
        if (!supplierCoverage.has(sp.supplierId)) {
          supplierCoverage.set(sp.supplierId, {
            canFulfill: [],
            totalPrice: 0,
            maxDeliveryDays: 0,
          });
        }
        const coverage = supplierCoverage.get(sp.supplierId)!;
        coverage.canFulfill.push({
          quoteItemId: item.quoteItemId,
          sizeQuantityId: sqId,
          pricePerUnit: sp.pricePerUnit,
          deliveryDays: sp.deliveryDays,
        });
        coverage.totalPrice += sp.pricePerUnit * item.quantity;
        coverage.maxDeliveryDays = Math.max(coverage.maxDeliveryDays, sp.deliveryDays);
      }
    }

    // Filter to suppliers who can fulfill ALL items in this category
    const fullCoverageSuppliers: number[] = [];
    for (const [supplierId, coverage] of supplierCoverage) {
      if (coverage.canFulfill.length === categorySqIds.length) {
        fullCoverageSuppliers.push(supplierId);
      }
    }

    if (fullCoverageSuppliers.length === 0) {
      // No supplier can fulfill all items - show partial coverage
      // Get top suppliers by coverage count
      const partialSuppliers = Array.from(supplierCoverage.entries())
        .sort((a, b) => b[1].canFulfill.length - a[1].canFulfill.length)
        .slice(0, 3)
        .map(([id]) => id);
      
      if (partialSuppliers.length > 0) {
        fullCoverageSuppliers.push(...partialSuppliers);
      }
    }

    // Get supplier details and calculate scores
    const supplierScores: SupplierForCategory[] = [];

    for (const supplierId of fullCoverageSuppliers) {
      const coverage = supplierCoverage.get(supplierId)!;
      
      const [supplierInfo, reliability, rating, speed] = await Promise.all([
        db.select({
          id: users.id,
          name: users.name,
          companyName: users.companyName,
        })
          .from(users)
          .where(eq(users.id, supplierId))
          .limit(1),
        getSupplierReliabilityData(supplierId),
        getSupplierRatingData(supplierId),
        getSupplierSpeedData(supplierId),
      ]);

      if (!supplierInfo || supplierInfo.length === 0) continue;

      const supplier = supplierInfo[0];
      
      supplierScores.push({
        supplierId: supplier.id,
        supplierName: supplier.name || 'ספק',
        supplierCompany: supplier.companyName,
        avgRating: Math.round(rating.avgRating * 10) / 10,
        totalPrice: Math.round(coverage.totalPrice * 100) / 100,
        avgDeliveryDays: coverage.maxDeliveryDays,
        reliabilityPct: Math.round(reliability.reliabilityPct),
        totalScore: 0, // Will calculate below
        rank: 0,
        canFulfill: coverage.canFulfill,
      });
    }

    if (supplierScores.length === 0) continue;

    // Normalize and calculate total scores
    const prices = supplierScores.map(s => s.totalPrice).filter(p => p > 0);
    const deliveries = supplierScores.map(s => s.avgDeliveryDays).filter(d => d > 0);
    
    const minPrice = prices.length > 0 ? Math.min(...prices) : 1;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 10;
    const minDelivery = deliveries.length > 0 ? Math.min(...deliveries) : 1;
    const maxDelivery = deliveries.length > 0 ? Math.max(...deliveries) : 7;

    for (const supplier of supplierScores) {
      const priceScore = maxPrice === minPrice ? 50 : 
        ((maxPrice - supplier.totalPrice) / (maxPrice - minPrice)) * 100;
      
      const deliveryScore = maxDelivery === minDelivery ? 50 : 
        ((maxDelivery - supplier.avgDeliveryDays) / (maxDelivery - minDelivery)) * 100;

      const ratingScore = (supplier.avgRating / 5) * 100;

      supplier.totalScore = Math.round(
        (priceScore * weights.price / 100) + 
        (ratingScore * weights.rating / 100) + 
        (deliveryScore * weights.deliveryTime / 100) + 
        (supplier.reliabilityPct * weights.reliability / 100)
      );
    }

    // Sort by score and assign ranks
    supplierScores.sort((a, b) => b.totalScore - a.totalScore);
    supplierScores.forEach((s, index) => {
      s.rank = index + 1;
    });

    recommendations.push({
      categoryId,
      categoryName: categoryData.categoryName,
      items: categoryItems,
      suppliers: supplierScores.slice(0, 3), // Top 3 per category
    });
  }

  return recommendations;
}

/**
 * Create supplier jobs for selected category items
 */
export async function createSupplierJobsForCategory(
  quoteId: number,
  supplierId: number,
  itemsToAssign: { quoteItemId: number; sizeQuantityId: number; pricePerUnit: number; deliveryDays: number }[]
): Promise<{ success: boolean; jobIds: number[] }> {
  const db = await getDb();
  if (!db) return { success: false, jobIds: [] };

  try {
    const jobIds: number[] = [];

    for (const item of itemsToAssign) {
      // Get quote item details
      const itemResult = await db.execute(sql`
        SELECT qi.quantity
        FROM quote_items qi
        WHERE qi.id = ${item.quoteItemId}
      `);

      if (!itemResult.rows || itemResult.rows.length === 0) continue;

      const quantity = (itemResult.rows[0] as any).quantity;

      // Create supplier job
      const jobResult = await db.execute(sql`
        INSERT INTO supplier_jobs (
          "supplierId", "customerId", "quoteId", "quoteItemId", 
          "sizeQuantityId", "quantity", "pricePerUnit", "status"
        )
        SELECT 
          ${supplierId},
          q."customerId",
          ${quoteId},
          ${item.quoteItemId},
          ${item.sizeQuantityId},
          ${quantity},
          ${item.pricePerUnit},
          'pending'
        FROM quotes q
        WHERE q.id = ${quoteId}
        RETURNING id
      `);

      if (jobResult.rows && jobResult.rows.length > 0) {
        jobIds.push((jobResult.rows[0] as any).id);
      }

      // Update quote item with supplier info
      await db.execute(sql`
        UPDATE quote_items
        SET "supplierId" = ${supplierId},
            "supplierCost" = ${item.pricePerUnit},
            "deliveryDays" = ${item.deliveryDays}
        WHERE id = ${item.quoteItemId}
      `);
    }

    // Update quote status to in_production if all items have suppliers
    const unassignedResult = await db.execute(sql`
      SELECT COUNT(*) as unassigned
      FROM quote_items
      WHERE "quoteId" = ${quoteId}
        AND "supplierId" IS NULL
    `);

    const unassignedCount = parseInt((unassignedResult.rows[0] as any).unassigned) || 0;
    
    if (unassignedCount === 0) {
      await db.execute(sql`
        UPDATE quotes
        SET status = 'in_production',
            "updatedAt" = NOW()
        WHERE id = ${quoteId}
      `);
    }

    return { success: true, jobIds };
  } catch (error) {
    console.error('[CreateSupplierJobs] Error:', error);
    return { success: false, jobIds: [] };
  }
}
