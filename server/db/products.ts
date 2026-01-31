/**
 * Products Module
 * 
 * Product management functions including products, sizes,
 * quantities, addons, and price calculations.
 */

import { getDb, eq, and, desc, sql, inArray } from "./connection";
import { 
  baseProducts, 
  productSizes, 
  sizeQuantities, 
  productAddons 
} from "../../drizzle/schema";
import { logActivity } from "./activity";
import { 
  CreateProductInput, 
  UpdateProductInput,
  CreateSizeInput,
  UpdateSizeInput,
  CreateSizeQuantityInput,
  UpdateSizeQuantityInput
} from "./types";

// ==================== PRODUCTS ====================

/**
 * Get all products with optional filters
 */
export async function getProducts(filters?: {
  category?: string;
  categoryId?: number;
  isActive?: boolean;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  // Note: base_products uses camelCase column names in DB
  const products = await db.select()
  .from(baseProducts)
  .orderBy(baseProducts.categoryId, baseProducts.name)
  .limit(filters?.limit || 200);

  let filtered = products;
  if (filters?.category) {
    filtered = filtered.filter(p => p.category === filters.category);
  }
  if (filters?.categoryId) {
    filtered = filtered.filter(p => p.categoryId === filters.categoryId);
  }
  if (filters?.isActive !== undefined) {
    filtered = filtered.filter(p => p.isActive === filters.isActive);
  }

  const productsWithSizes = await Promise.all(
    filtered.map(async (product) => {
      const sizes = await db.select({
        id: productSizes.id,
        name: productSizes.name,
        dimensions: productSizes.dimensions,
        basePrice: productSizes.basePrice,
        displayOrder: productSizes.displayOrder,
        isActive: productSizes.isActive,
        createdAt: productSizes.createdAt,
      })
      .from(productSizes)
      .where(eq(productSizes.productId, product.id))
      .orderBy(productSizes.displayOrder);

      // Add quantities to each size
      const sizesWithQuantities = await Promise.all(
        sizes.map(async (size) => {
          const quantities = await db.select({
            id: sizeQuantities.id,
            quantity: sizeQuantities.quantity,
            price: sizeQuantities.price,
            displayOrder: sizeQuantities.displayOrder,
          })
          .from(sizeQuantities)
          .where(eq(sizeQuantities.sizeId, size.id))
          .orderBy(sizeQuantities.displayOrder);
          return { ...size, quantities };
        })
      );

      return {
        ...product,
        sizes: sizesWithQuantities,
        sizeCount: sizes.length,
      };
    })
  );

  return productsWithSizes;
}

/**
 * Get product by ID with all details
 */
export async function getProductById(productId: number) {
  const db = await getDb();
  if (!db) return null;

  const [product] = await db.select()
    .from(baseProducts)
    .where(eq(baseProducts.id, productId))
    .limit(1);

  if (!product) return null;

  const sizes = await db.select()
    .from(productSizes)
    .where(eq(productSizes.productId, productId))
    .orderBy(productSizes.displayOrder);

  const sizesWithQuantities = await Promise.all(
    sizes.map(async (size) => {
      const quantities = await db.select()
        .from(sizeQuantities)
        .where(eq(sizeQuantities.sizeId, size.id))
        .orderBy(sizeQuantities.displayOrder);
      return { ...size, quantities };
    })
  );

  return {
    ...product,
    sizes: sizesWithQuantities,
  };
}

/**
 * Create product
 */
export async function createProduct(input: CreateProductInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(baseProducts).values({
    name: input.name,
    description: input.description || null,
    category: input.category || null,
    categoryId: input.categoryId || null,
    isActive: true,
  }).returning({ id: baseProducts.id });

  const insertId = result[0]?.id;
  
  await logActivity(null, "product_created", { productId: insertId, name: input.name });

  return { id: insertId, ...input };
}

/**
 * Update product
 */
export async function updateProduct(input: UpdateProductInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields to update");
  }

  await db.update(baseProducts)
    .set(updateData)
    .where(eq(baseProducts.id, input.id));

  await logActivity(null, "product_updated", { productId: input.id, changes: updateData });

  return await getProductById(input.id);
}

/**
 * Delete product (soft delete)
 */
export async function deleteProduct(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(baseProducts)
    .set({ isActive: false })
    .where(eq(baseProducts.id, productId));

  await db.update(productSizes)
    .set({ isActive: false })
    .where(eq(productSizes.productId, productId));

  await logActivity(null, "product_deleted", { productId });

  return { success: true };
}

/**
 * Get product categories
 */
export async function getProductCategories() {
  const db = await getDb();
  if (!db) return [];

  const categories = await db.selectDistinct({ category: baseProducts.category })
    .from(baseProducts)
    .where(sql`${baseProducts.category} IS NOT NULL`);

  return categories.map(c => c.category).filter(Boolean) as string[];
}

// ==================== SIZES ====================

/**
 * Create size
 */
export async function createSize(input: CreateSizeInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [product] = await db.select()
    .from(baseProducts)
    .where(eq(baseProducts.id, input.productId))
    .limit(1);

  if (!product) {
    throw new Error("Product not found");
  }

  const result = await db.insert(productSizes).values({
    productId: input.productId,
    name: input.name,
    dimensions: input.dimensions || null,
    basePrice: input.basePrice || "0",
    displayOrder: input.displayOrder || 0,
    isActive: true,
  }).returning();

  await logActivity(null, "size_created", { 
    sizeId: result[0].id, 
    productId: input.productId,
    name: input.name 
  });

  return result[0];
}

/**
 * Update size
 */
export async function updateSize(input: UpdateSizeInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.dimensions !== undefined) updateData.dimensions = input.dimensions;
  if (input.basePrice !== undefined) updateData.basePrice = input.basePrice;
  if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields to update");
  }

  await db.update(productSizes)
    .set(updateData)
    .where(eq(productSizes.id, input.id));

  await logActivity(null, "size_updated", { sizeId: input.id, changes: updateData });

  const [updated] = await db.select()
    .from(productSizes)
    .where(eq(productSizes.id, input.id))
    .limit(1);

  return updated;
}

/**
 * Delete size (soft delete)
 */
export async function deleteSize(sizeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(productSizes)
    .set({ isActive: false })
    .where(eq(productSizes.id, sizeId));

  await db.update(sizeQuantities)
    .set({ isActive: false })
    .where(eq(sizeQuantities.sizeId, sizeId));

  await logActivity(null, "size_deleted", { sizeId });

  return { success: true };
}

// ==================== SIZE QUANTITIES ====================

/**
 * Create size quantity
 */
export async function createSizeQuantity(input: CreateSizeQuantityInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [size] = await db.select()
    .from(productSizes)
    .where(eq(productSizes.id, input.sizeId))
    .limit(1);

  if (!size) {
    throw new Error("Size not found");
  }

  const result = await db.insert(sizeQuantities).values({
    sizeId: input.sizeId,
    quantity: input.quantity,
    price: input.price,
    displayOrder: input.displayOrder || 0,
    isActive: true,
  }).returning();

  await logActivity(null, "size_quantity_created", { 
    sizeQuantityId: result[0].id, 
    sizeId: input.sizeId,
    quantity: input.quantity 
  });

  return result[0];
}

/**
 * Update size quantity
 */
export async function updateSizeQuantity(input: UpdateSizeQuantityInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.quantity !== undefined) updateData.quantity = input.quantity;
  if (input.price !== undefined) updateData.price = input.price;
  if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields to update");
  }

  await db.update(sizeQuantities)
    .set(updateData)
    .where(eq(sizeQuantities.id, input.id));

  await logActivity(null, "size_quantity_updated", { sizeQuantityId: input.id, changes: updateData });

  const [updated] = await db.select()
    .from(sizeQuantities)
    .where(eq(sizeQuantities.id, input.id))
    .limit(1);

  return updated;
}

/**
 * Delete size quantity (soft delete)
 */
export async function deleteSizeQuantity(sizeQuantityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(sizeQuantities)
    .set({ isActive: false })
    .where(eq(sizeQuantities.id, sizeQuantityId));

  await logActivity(null, "size_quantity_deleted", { sizeQuantityId });

  return { success: true };
}

/**
 * Get size quantity by ID
 */
export async function getSizeQuantityById(sizeQuantityId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select({
    id: sizeQuantities.id,
    sizeId: sizeQuantities.sizeId,
    quantity: sizeQuantities.quantity,
    price: sizeQuantities.price,
    sizeName: productSizes.name,
    dimensions: productSizes.dimensions,
    productId: productSizes.productId,
    productName: baseProducts.name,
  })
    .from(sizeQuantities)
    .innerJoin(productSizes, eq(sizeQuantities.sizeId, productSizes.id))
    .innerJoin(baseProducts, eq(productSizes.productId, baseProducts.id))
    .where(eq(sizeQuantities.id, sizeQuantityId))
    .limit(1);

  return result[0] || null;
}

// ==================== ADDONS ====================

/**
 * Create product addon
 */
export async function createProductAddon(input: {
  productId?: number;
  categoryId?: number;
  name: string;
  description?: string;
  priceType: 'fixed' | 'percentage' | 'per_unit';
  price: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(productAddons).values({
    productId: input.productId || null,
    categoryId: input.categoryId || null,
    name: input.name,
    description: input.description || null,
    priceType: input.priceType,
    price: input.price.toString(),
    isActive: true,
  });

  return { success: true };
}

/**
 * Update product addon
 */
export async function updateProductAddon(input: {
  id: number;
  name?: string;
  description?: string;
  priceType?: 'fixed' | 'percentage' | 'per_unit';
  price?: number;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.priceType !== undefined) updateData.priceType = input.priceType;
  if (input.price !== undefined) updateData.price = input.price.toString();
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  await db.update(productAddons)
    .set(updateData)
    .where(eq(productAddons.id, input.id));

  return { success: true };
}

/**
 * Delete product addon (soft delete)
 */
export async function deleteProductAddon(addonId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(productAddons)
    .set({ isActive: false })
    .where(eq(productAddons.id, addonId));

  return { success: true };
}

// ==================== PRODUCT WITH DETAILS ====================

/**
 * Get product with all details (sizes, quantities, addons)
 */
export async function getProductWithDetails(productId: number) {
  const db = await getDb();
  if (!db) return null;

  const [product] = await db.select()
    .from(baseProducts)
    .where(eq(baseProducts.id, productId))
    .limit(1);

  if (!product) return null;

  const sizes = await db.select()
    .from(productSizes)
    .where(and(eq(productSizes.productId, productId), eq(productSizes.isActive, true)))
    .orderBy(productSizes.displayOrder);

  const sizeIds = sizes.map(s => s.id);
  const quantities = sizeIds.length > 0 ? await db.select()
    .from(sizeQuantities)
    .where(inArray(sizeQuantities.sizeId, sizeIds))
    .orderBy(sizeQuantities.displayOrder) : [];

  const addons = await db.select()
    .from(productAddons)
    .where(and(
      sql`(${productAddons.productId} = ${productId} OR ${productAddons.productId} IS NULL)`,
      eq(productAddons.isActive, true)
    ))
    .orderBy(productAddons.name);

  return {
    ...product,
    sizes,
    quantities,
    addons,
  };
}

/**
 * Get all products with their sizes, quantities, and addons
 */
export async function getProductsWithDetails(categoryId?: number) {
  const db = await getDb();
  if (!db) return [];

  const products = categoryId 
    ? await db.select().from(baseProducts).where(and(eq(baseProducts.isActive, true), eq(baseProducts.categoryId, categoryId))).orderBy(baseProducts.name)
    : await db.select().from(baseProducts).where(eq(baseProducts.isActive, true)).orderBy(baseProducts.categoryId, baseProducts.name);

  const productsWithDetails = await Promise.all(products.map(async (product) => {
    const sizes = await db.select()
      .from(productSizes)
      .where(and(eq(productSizes.productId, product.id), eq(productSizes.isActive, true)))
      .orderBy(productSizes.displayOrder);

    const sizeIds = sizes.map(s => s.id);
    const quantities = sizeIds.length > 0 ? await db.select()
      .from(sizeQuantities)
      .where(inArray(sizeQuantities.sizeId, sizeIds))
      .orderBy(sizeQuantities.displayOrder) : [];

    const addons = await db.select()
      .from(productAddons)
      .where(and(
        sql`(${productAddons.productId} = ${product.id} OR ${productAddons.categoryId} = ${product.categoryId} OR (${productAddons.productId} IS NULL AND ${productAddons.categoryId} IS NULL))`,
        eq(productAddons.isActive, true)
      ))
      .orderBy(productAddons.name);

    return {
      ...product,
      sizes,
      quantities,
      addons,
    };
  }));

  return productsWithDetails;
}

// ==================== PRICE CALCULATION ====================

/**
 * Calculate product price
 */
export async function calculateProductPrice(input: {
  productId: number;
  sizeId: number;
  quantityId?: number;
  customQuantity?: number;
  addonIds?: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!Number.isInteger(input.productId) || input.productId <= 0) {
    throw new Error("Invalid productId - must be a positive integer");
  }
  if (!Number.isInteger(input.sizeId) || input.sizeId <= 0) {
    throw new Error("Invalid sizeId - must be a positive integer");
  }

  const [size] = await db.select()
    .from(productSizes)
    .where(and(
      eq(productSizes.id, input.sizeId),
      eq(productSizes.productId, input.productId)
    ))
    .limit(1);

  if (!size) {
    throw new Error("Size not found or does not belong to the specified product");
  }

  let basePrice = parseFloat(size.basePrice || '0');
  let multiplier = 1;
  let isCustomQuantity = false;

  if (input.quantityId) {
    const [quantity] = await db.select()
      .from(sizeQuantities)
      .where(eq(sizeQuantities.id, input.quantityId))
      .limit(1);

    if (quantity) {
      basePrice = parseFloat(quantity.price || '0');
      multiplier = 1;
    }
  } else if (input.customQuantity) {
    isCustomQuantity = true;
  }

  let subtotal = basePrice * multiplier;
  let addonsTotal = 0;

  if (input.addonIds && input.addonIds.length > 0) {
    // SECURITY FIX: Use inArray instead of raw SQL to prevent SQL injection
    const addons = await db.select()
      .from(productAddons)
      .where(inArray(productAddons.id, input.addonIds));

    for (const addon of addons) {
      const addonPrice = parseFloat(addon.price || '0');
      if (addon.priceType === 'fixed') {
        addonsTotal += addonPrice;
      } else if (addon.priceType === 'percentage') {
        addonsTotal += subtotal * (addonPrice / 100);
      } else if (addon.priceType === 'per_unit' && input.customQuantity) {
        addonsTotal += addonPrice * input.customQuantity;
      }
    }
  }

  const totalPrice = isCustomQuantity ? null : subtotal + addonsTotal;

  return {
    basePrice,
    multiplier,
    subtotal,
    addonsTotal,
    totalPrice,
    isCustomQuantity,
    requiresManualPricing: isCustomQuantity,
  };
}

// ==================== LEGACY FUNCTIONS (for backward compatibility) ====================

export async function createProductSize(input: {
  productId: number;
  name: string;
  dimensions?: string;
  basePrice: number;
  graphicDesignPrice?: number;
  displayOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(productSizes).values({
    productId: input.productId,
    name: input.name,
    dimensions: input.dimensions || null,
    basePrice: input.basePrice.toString(),
    graphicDesignPrice: (input.graphicDesignPrice || 0).toString(),
    displayOrder: input.displayOrder || 0,
    isActive: true,
  });

  return { success: true };
}

export async function updateProductSize(input: {
  id: number;
  name?: string;
  dimensions?: string;
  basePrice?: number;
  graphicDesignPrice?: number;
  displayOrder?: number;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.dimensions !== undefined) updateData.dimensions = input.dimensions;
  if (input.basePrice !== undefined) updateData.basePrice = input.basePrice.toString();
  if (input.graphicDesignPrice !== undefined) updateData.graphicDesignPrice = input.graphicDesignPrice.toString();
  if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  await db.update(productSizes)
    .set(updateData)
    .where(eq(productSizes.id, input.id));

  return { success: true };
}

export async function deleteProductSize(sizeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(productSizes)
    .set({ isActive: false })
    .where(eq(productSizes.id, sizeId));

  return { success: true };
}

export async function createProductQuantity(input: {
  productId: number;
  quantity: number;
  priceMultiplier: number;
  displayOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(sizeQuantities).values({
    sizeId: input.productId,
    quantity: input.quantity,
    price: input.priceMultiplier.toString(),
    displayOrder: input.displayOrder || 0,
    isActive: true,
  });

  return { success: true };
}

export async function updateProductQuantity(input: {
  id: number;
  quantity?: number;
  priceMultiplier?: number;
  displayOrder?: number;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.quantity !== undefined) updateData.quantity = input.quantity;
  if (input.priceMultiplier !== undefined) updateData.price = input.priceMultiplier.toString();
  if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  await db.update(sizeQuantities)
    .set(updateData)
    .where(eq(sizeQuantities.id, input.id));

  return { success: true };
}

export async function deleteProductQuantity(quantityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(sizeQuantities)
    .set({ isActive: false })
    .where(eq(sizeQuantities.id, quantityId));

  return { success: true };
}
