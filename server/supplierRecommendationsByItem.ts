/**
 * Supplier Recommendations by Item
 * 
 * Gets supplier recommendations for each individual quote item.
 * Each item shows suppliers who can fulfill that specific item.
 * Includes bonus for suppliers who can fulfill multiple items from the quote.
 */

import { eq, sql } from "drizzle-orm";
import { users, supplierPrices, baseProducts, productSizes, sizeQuantities, categories } from "../drizzle/schema";
import { getDb } from "./db";
import { getSupplierWeights, getSupplierReliabilityData, getSupplierRatingData, getSupplierSpeedData } from "./supplierRecommendations";

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
  // How many other items from the quote this supplier can fulfill
  canFulfillOtherItems: number;
  // Bonus percentage for multi-item capability (2% per item, max 10%)
  multiItemBonus: number;
}

export interface ItemSupplierRecommendation {
  quoteItemId: number;
  sizeQuantityId: number;
  productName: string;
  categoryName: string;
  quantity: number;
  suppliers: SupplierForItem[];
  // Currently selected supplier (if any)
  selectedSupplierId?: number;
}

/**
 * Get suppliers who have priced specific sizeQuantityIds
 * Returns a map of sizeQuantityId -> list of suppliers with their prices
 */
async function getSuppliersForSizeQuantities(sizeQuantityIds: number[]): Promise<Map<number, { supplierId: number; pricePerUnit: number; deliveryDays: number }[]>> {
  const db = await getDb();
  if (!db) return new Map();

  const result = new Map<number, { supplierId: number; pricePerUnit: number; deliveryDays: number }[]>();

  try {
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
 * Get item info including category
 */
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

/**
 * Get recommendations for each individual quote item
 * Includes bonus for suppliers who can fulfill multiple items
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

  // Step 3: Get weights for scoring
  const weights = await getSupplierWeights();

  // Step 4: Build recommendations for each item
  const recommendations: ItemSupplierRecommendation[] = [];

  for (const item of quoteItems) {
    const itemInfo = await getItemInfo(item);
    if (!itemInfo) continue;

    const suppliersForItem = supplierPricesMap.get(item.sizeQuantityId) || [];
    
    if (suppliersForItem.length === 0) {
      // No suppliers for this item
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

    // Get supplier details and calculate scores
    const supplierScores: SupplierForItem[] = [];

    for (const sp of suppliersForItem) {
      const [supplierInfo, reliability, rating, speed] = await Promise.all([
        db.select({
          id: users.id,
          name: users.name,
          companyName: users.companyName,
        })
          .from(users)
          .where(eq(users.id, sp.supplierId))
          .limit(1),
        getSupplierReliabilityData(sp.supplierId),
        getSupplierRatingData(sp.supplierId),
        getSupplierSpeedData(sp.supplierId),
      ]);

      if (!supplierInfo || supplierInfo.length === 0) continue;

      const supplier = supplierInfo[0];
      
      // Calculate multi-item bonus: 2% per additional item, max 10%
      const totalItemsCanFulfill = supplierItemCount.get(sp.supplierId) || 1;
      const otherItemsCanFulfill = totalItemsCanFulfill - 1; // Exclude current item
      const multiItemBonus = Math.min(otherItemsCanFulfill * 2, 10); // 2% per item, max 10%

      supplierScores.push({
        supplierId: supplier.id,
        supplierName: supplier.name || 'ספק',
        supplierCompany: supplier.companyName,
        avgRating: Math.round(rating.avgRating * 10) / 10,
        pricePerUnit: sp.pricePerUnit,
        deliveryDays: sp.deliveryDays,
        reliabilityPct: Math.round(reliability.reliabilityPct),
        totalScore: 0, // Will calculate below
        rank: 0,
        canFulfillOtherItems: otherItemsCanFulfill,
        multiItemBonus,
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

    // Normalize and calculate total scores
    const prices = supplierScores.map(s => s.pricePerUnit).filter(p => p > 0);
    const deliveries = supplierScores.map(s => s.deliveryDays).filter(d => d > 0);
    
    const minPrice = prices.length > 0 ? Math.min(...prices) : 1;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 10;
    const minDelivery = deliveries.length > 0 ? Math.min(...deliveries) : 1;
    const maxDelivery = deliveries.length > 0 ? Math.max(...deliveries) : 7;

    for (const supplier of supplierScores) {
      const priceScore = maxPrice === minPrice ? 50 : 
        ((maxPrice - supplier.pricePerUnit) / (maxPrice - minPrice)) * 100;
      
      const deliveryScore = maxDelivery === minDelivery ? 50 : 
        ((maxDelivery - supplier.deliveryDays) / (maxDelivery - minDelivery)) * 100;

      const ratingScore = (supplier.avgRating / 5) * 100;

      // Base score from weights
      let baseScore = 
        (priceScore * weights.price / 100) + 
        (ratingScore * weights.rating / 100) + 
        (deliveryScore * weights.deliveryTime / 100) + 
        (supplier.reliabilityPct * weights.reliability / 100);

      // Add multi-item bonus (as percentage of base score)
      supplier.totalScore = Math.round(baseScore * (1 + supplier.multiItemBonus / 100));
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
    // Calculate customer price with markup
    const supplierCost = pricePerUnit;
    const customerPrice = Math.round(supplierCost * (1 + markupPercentage / 100));

    // Get supplier name
    const [supplierInfo] = await db.select({
      name: users.name,
      companyName: users.companyName,
    })
      .from(users)
      .where(eq(users.id, supplierId))
      .limit(1);

    const supplierName = supplierInfo?.companyName || supplierInfo?.name || 'ספק';

    // Update quote item
    await db.execute(sql`
      UPDATE quote_items
      SET "supplierId" = ${supplierId},
          "supplierCost" = ${supplierCost.toString()},
          "priceAtTimeOfQuote" = ${customerPrice.toString()},
          "deliveryDays" = ${deliveryDays},
          "supplierName" = ${supplierName},
          "isManualPrice" = false
      WHERE id = ${quoteItemId}
    `);

    // Recalculate quote totals
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

    // Update quote totals
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
