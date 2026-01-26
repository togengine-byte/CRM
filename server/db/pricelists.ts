/**
 * Pricelists Module
 * 
 * Pricelist management functions including CRUD operations,
 * customer assignments, and price calculations.
 */

import { getDb, eq, and, desc, sql } from "./connection";
import { 
  pricelists, 
  customerPricelists,
  quotes,
  quoteItems,
  sizeQuantities,
  productSizes,
  baseProducts,
  users
} from "../../drizzle/schema";
import { logActivity } from "./activity";

// ==================== PRICELIST CRUD ====================

/**
 * Get all pricelists
 */
export async function getPricelists() {
  const db = await getDb();
  if (!db) return [];

  return await db.select({
    id: pricelists.id,
    name: pricelists.name,
    description: pricelists.description,
    markupPercentage: pricelists.markupPercentage,
    isDefault: pricelists.isDefault,
    isActive: pricelists.isActive,
    displayOrder: pricelists.displayOrder,
    createdAt: pricelists.createdAt,
    updatedAt: pricelists.updatedAt,
  })
    .from(pricelists)
    .where(eq(pricelists.isActive, true))
    .orderBy(pricelists.displayOrder, pricelists.name);
}

/**
 * Get pricelist by ID
 */
export async function getPricelistById(pricelistId: number) {
  const db = await getDb();
  if (!db) return null;

  if (!Number.isInteger(pricelistId) || pricelistId <= 0) {
    throw new Error("Invalid pricelist ID");
  }

  const [pricelist] = await db.select()
    .from(pricelists)
    .where(eq(pricelists.id, pricelistId))
    .limit(1);

  return pricelist || null;
}

/**
 * Create pricelist
 */
export async function createPricelist(input: {
  name: string;
  description?: string;
  markupPercentage: number;
  isDefault?: boolean;
  displayOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!input.name || input.name.trim().length === 0) {
    throw new Error("Pricelist name is required");
  }
  if (typeof input.markupPercentage !== 'number' || input.markupPercentage < 0 || input.markupPercentage > 1000) {
    throw new Error("Markup percentage must be between 0 and 1000");
  }

  if (input.isDefault) {
    await db.update(pricelists)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(pricelists.isDefault, true));
  }

  const result = await db.insert(pricelists).values({
    name: input.name.trim(),
    description: input.description?.trim() || null,
    markupPercentage: input.markupPercentage.toString(),
    isDefault: input.isDefault || false,
    isActive: true,
    displayOrder: input.displayOrder || 0,
  }).returning();

  await logActivity(null, "pricelist_created", { 
    pricelistId: result[0].id, 
    name: input.name,
    markupPercentage: input.markupPercentage 
  });

  return result[0];
}

/**
 * Update pricelist
 */
export async function updatePricelist(input: {
  id: number;
  name?: string;
  description?: string;
  markupPercentage?: number;
  isDefault?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!Number.isInteger(input.id) || input.id <= 0) {
    throw new Error("Invalid pricelist ID");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    if (input.name.trim().length === 0) {
      throw new Error("Pricelist name cannot be empty");
    }
    updateData.name = input.name.trim();
  }
  if (input.description !== undefined) {
    updateData.description = input.description?.trim() || null;
  }
  if (input.markupPercentage !== undefined) {
    if (typeof input.markupPercentage !== 'number' || input.markupPercentage < 0 || input.markupPercentage > 1000) {
      throw new Error("Markup percentage must be between 0 and 1000");
    }
    updateData.markupPercentage = input.markupPercentage.toString();
  }
  if (input.displayOrder !== undefined) {
    updateData.displayOrder = input.displayOrder;
  }
  if (input.isActive !== undefined) {
    updateData.isActive = input.isActive;
  }

  if (input.isDefault === true) {
    await db.update(pricelists)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(pricelists.isDefault, true));
    updateData.isDefault = true;
  } else if (input.isDefault === false) {
    updateData.isDefault = false;
  }

  await db.update(pricelists)
    .set(updateData)
    .where(eq(pricelists.id, input.id));

  await logActivity(null, "pricelist_updated", { pricelistId: input.id, changes: updateData });

  return { success: true };
}

/**
 * Delete pricelist (soft delete)
 */
export async function deletePricelist(pricelistId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!Number.isInteger(pricelistId) || pricelistId <= 0) {
    throw new Error("Invalid pricelist ID");
  }

  await db.update(pricelists)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(pricelists.id, pricelistId));

  await logActivity(null, "pricelist_deleted", { pricelistId });

  return { success: true };
}

// ==================== CUSTOMER PRICELIST ASSIGNMENT ====================

/**
 * Get customer's default pricelist
 */
export async function getCustomerDefaultPricelist(customerId: number) {
  const db = await getDb();
  if (!db) return null;

  const [customerPricelist] = await db.select({
    pricelist: pricelists,
  })
    .from(customerPricelists)
    .innerJoin(pricelists, eq(customerPricelists.pricelistId, pricelists.id))
    .where(and(
      eq(customerPricelists.customerId, customerId),
      eq(pricelists.isActive, true)
    ))
    .limit(1);

  if (customerPricelist) {
    return customerPricelist.pricelist;
  }

  const [defaultPricelist] = await db.select()
    .from(pricelists)
    .where(and(
      eq(pricelists.isDefault, true),
      eq(pricelists.isActive, true)
    ))
    .limit(1);

  return defaultPricelist || null;
}

/**
 * Set customer's pricelist
 */
export async function setCustomerPricelist(customerId: number, pricelistId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new Error("Invalid customer ID");
  }
  if (!Number.isInteger(pricelistId) || pricelistId <= 0) {
    throw new Error("Invalid pricelist ID");
  }

  const [pricelist] = await db.select()
    .from(pricelists)
    .where(and(
      eq(pricelists.id, pricelistId),
      eq(pricelists.isActive, true)
    ))
    .limit(1);

  if (!pricelist) {
    throw new Error("Pricelist not found or inactive");
  }

  await db.delete(customerPricelists)
    .where(eq(customerPricelists.customerId, customerId));

  await db.insert(customerPricelists).values({
    customerId,
    pricelistId,
  });

  await logActivity(null, "customer_pricelist_set", { customerId, pricelistId, pricelistName: pricelist.name });

  return { success: true, pricelist };
}

// ==================== PRICE CALCULATIONS ====================

/**
 * Calculate customer price from supplier cost using markup
 */
export function calculateCustomerPrice(supplierCost: number, markupPercentage: number): number {
  if (typeof supplierCost !== 'number' || supplierCost < 0) {
    throw new Error("Invalid supplier cost");
  }
  if (typeof markupPercentage !== 'number' || markupPercentage < 0) {
    throw new Error("Invalid markup percentage");
  }
  
  const markup = supplierCost * (markupPercentage / 100);
  return Math.round((supplierCost + markup) * 100) / 100;
}

/**
 * Recalculate quote totals
 */
export async function recalculateQuoteTotals(quoteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const items = await db.select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quoteId));

  let totalSupplierCost = 0;
  let totalCustomerPrice = 0;

  for (const item of items) {
    const supplierCost = parseFloat(item.supplierCost?.toString() || '0');
    const customerPrice = parseFloat(item.priceAtTimeOfQuote?.toString() || '0');
    
    totalSupplierCost += supplierCost * item.quantity;
    totalCustomerPrice += customerPrice * item.quantity;
  }

  await db.update(quotes)
    .set({
      totalSupplierCost: totalSupplierCost.toString(),
      finalValue: totalCustomerPrice.toString(),
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId));

  return {
    totalSupplierCost: Math.round(totalSupplierCost * 100) / 100,
    totalCustomerPrice: Math.round(totalCustomerPrice * 100) / 100,
    profit: Math.round((totalCustomerPrice - totalSupplierCost) * 100) / 100,
  };
}

/**
 * Change quote pricelist and recalculate prices
 */
export async function changeQuotePricelist(quoteId: number, pricelistId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!Number.isInteger(quoteId) || quoteId <= 0) {
    throw new Error("Invalid quote ID");
  }
  if (!Number.isInteger(pricelistId) || pricelistId <= 0) {
    throw new Error("Invalid pricelist ID");
  }

  const pricelist = await getPricelistById(pricelistId);
  if (!pricelist) {
    throw new Error("Pricelist not found");
  }

  const markupPercentage = parseFloat(pricelist.markupPercentage?.toString() || '0');

  const items = await db.select()
    .from(quoteItems)
    .where(and(
      eq(quoteItems.quoteId, quoteId),
      eq(quoteItems.isManualPrice, false)
    ));

  for (const item of items) {
    const supplierCost = parseFloat(item.supplierCost?.toString() || '0');
    const newPrice = calculateCustomerPrice(supplierCost, markupPercentage);

    await db.update(quoteItems)
      .set({ priceAtTimeOfQuote: newPrice.toString() })
      .where(eq(quoteItems.id, item.id));
  }

  await db.update(quotes)
    .set({ 
      pricelistId: pricelistId,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId));

  const totals = await recalculateQuoteTotals(quoteId);

  await logActivity(null, "quote_pricelist_changed", { 
    quoteId, 
    pricelistId, 
    pricelistName: pricelist.name,
    markupPercentage 
  });

  return {
    success: true,
    pricelist: {
      id: pricelist.id,
      name: pricelist.name,
      markupPercentage,
    },
    totals,
  };
}

/**
 * Update quote item pricing
 */
export async function updateQuoteItemPricing(input: {
  itemId: number;
  supplierId?: number;
  supplierCost?: number;
  customerPrice?: number;
  isManualPrice?: boolean;
  deliveryDays?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!Number.isInteger(input.itemId) || input.itemId <= 0) {
    throw new Error("Invalid item ID");
  }

  const [item] = await db.select({
    item: quoteItems,
    quote: quotes,
  })
    .from(quoteItems)
    .innerJoin(quotes, eq(quoteItems.quoteId, quotes.id))
    .where(eq(quoteItems.id, input.itemId))
    .limit(1);

  if (!item) {
    throw new Error("Quote item not found");
  }

  const updateData: Record<string, unknown> = {};

  if (input.supplierId !== undefined) {
    updateData.supplierId = input.supplierId;
  }

  if (input.supplierCost !== undefined) {
    if (typeof input.supplierCost !== 'number' || input.supplierCost < 0) {
      throw new Error("Invalid supplier cost");
    }
    updateData.supplierCost = input.supplierCost.toString();
  }

  if (input.deliveryDays !== undefined) {
    updateData.deliveryDays = input.deliveryDays;
  }

  if (input.customerPrice !== undefined) {
    if (typeof input.customerPrice !== 'number' || input.customerPrice < 0) {
      throw new Error("Invalid customer price");
    }
    updateData.priceAtTimeOfQuote = input.customerPrice.toString();
    updateData.isManualPrice = input.isManualPrice !== false;
  } else if (input.isManualPrice === false && input.supplierCost !== undefined) {
    const pricelist = item.quote.pricelistId 
      ? await getPricelistById(item.quote.pricelistId)
      : await getCustomerDefaultPricelist(item.quote.customerId);
    
    const markupPercentage = parseFloat(pricelist?.markupPercentage?.toString() || '0');
    const calculatedPrice = calculateCustomerPrice(input.supplierCost, markupPercentage);
    updateData.priceAtTimeOfQuote = calculatedPrice.toString();
    updateData.isManualPrice = false;
  }

  if (input.isManualPrice !== undefined) {
    updateData.isManualPrice = input.isManualPrice;
  }

  await db.update(quoteItems)
    .set(updateData)
    .where(eq(quoteItems.id, input.itemId));

  await recalculateQuoteTotals(item.item.quoteId);

  return { success: true };
}


/**
 * Auto populate quote pricing
 */
export async function autoPopulateQuotePricing(quoteId: number, pricelistId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!Number.isInteger(quoteId) || quoteId <= 0) {
    throw new Error("Invalid quote ID");
  }

  const [quote] = await db.select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (!quote) {
    throw new Error("Quote not found");
  }

  let activePricelist = null;
  let markupPercentage = 0;

  if (pricelistId) {
    activePricelist = await getPricelistById(pricelistId);
  } else if (quote.pricelistId) {
    activePricelist = await getPricelistById(quote.pricelistId);
  } else {
    activePricelist = await getCustomerDefaultPricelist(quote.customerId);
  }

  if (activePricelist) {
    markupPercentage = parseFloat(activePricelist.markupPercentage?.toString() || '0');
  }

  // Get items with full product and supplier details
  const itemsWithDetails = await db.select({
    itemId: quoteItems.id,
    sizeQuantityId: quoteItems.sizeQuantityId,
    quantity: quoteItems.quantity,
    priceAtTimeOfQuote: quoteItems.priceAtTimeOfQuote,
    supplierCost: quoteItems.supplierCost,
    supplierId: quoteItems.supplierId,
    isManualPrice: quoteItems.isManualPrice,
    deliveryDays: quoteItems.deliveryDays,
    // Product info
    productName: baseProducts.name,
    sizeName: productSizes.name,
    sizeQuantity: sizeQuantities.quantity,
    // Supplier info
    supplierName: users.name,
  })
    .from(quoteItems)
    .leftJoin(sizeQuantities, eq(quoteItems.sizeQuantityId, sizeQuantities.id))
    .leftJoin(productSizes, eq(sizeQuantities.sizeId, productSizes.id))
    .leftJoin(baseProducts, eq(productSizes.productId, baseProducts.id))
    .leftJoin(users, eq(quoteItems.supplierId, users.id))
    .where(eq(quoteItems.quoteId, quoteId));

  let totalSupplierCost = 0;
  let totalCustomerPrice = 0;
  const processedItems = [];

  for (const item of itemsWithDetails) {
    const supplierCost = parseFloat(item.supplierCost?.toString() || '0');
    let customerPrice = parseFloat(item.priceAtTimeOfQuote?.toString() || '0');
    
    // Recalculate price if not manual and has supplier cost
    if (!item.isManualPrice && supplierCost > 0) {
      customerPrice = calculateCustomerPrice(supplierCost, markupPercentage);
      
      await db.update(quoteItems)
        .set({ priceAtTimeOfQuote: customerPrice.toString() })
        .where(eq(quoteItems.id, item.itemId));
    }
    
    totalSupplierCost += supplierCost * item.quantity;
    totalCustomerPrice += customerPrice * item.quantity;
    
    processedItems.push({
      itemId: item.itemId,
      sizeQuantityId: item.sizeQuantityId,
      quantity: item.quantity,
      productName: item.productName || `פריט #${item.sizeQuantityId}`,
      sizeName: item.sizeName ? `${item.sizeName} (${item.sizeQuantity} יח')` : '',
      supplierId: item.supplierId,
      supplierName: item.supplierName || 'לא נבחר',
      supplierCost: supplierCost,
      customerPrice: customerPrice,
      isManualPrice: item.isManualPrice || false,
      deliveryDays: item.deliveryDays,
    });
  }

  if (activePricelist) {
    await db.update(quotes)
      .set({ 
        pricelistId: activePricelist.id,
        totalSupplierCost: totalSupplierCost.toString(),
        finalValue: totalCustomerPrice.toString(),
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, quoteId));
  }

  const profitPercentage = totalSupplierCost > 0 
    ? Math.round(((totalCustomerPrice - totalSupplierCost) / totalSupplierCost) * 100) 
    : 0;

  return {
    success: true,
    pricelist: activePricelist ? {
      id: activePricelist.id,
      name: activePricelist.name,
      markupPercentage,
    } : null,
    items: processedItems,
    totals: {
      supplierCost: totalSupplierCost,
      customerPrice: totalCustomerPrice,
      profit: totalCustomerPrice - totalSupplierCost,
      profitPercentage,
    },
  };
}
