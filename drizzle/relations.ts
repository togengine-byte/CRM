// RELATIONS FIX: Added proper Drizzle relations for complex queries
import { relations } from "drizzle-orm";
import {
  users,
  baseProducts,
  productSizes,
  sizeQuantities,
  productAddons,
  quotes,
  quoteItems,
  quoteAttachments,
  supplierPrices,
  supplierJobs,
  customerPricelists,
  pricelists,
  internalNotes,
  activityLog,
  categories,
} from "./schema";

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  quotes: many(quotes),
  supplierPrices: many(supplierPrices),
  supplierJobs: many(supplierJobs),
  customerPricelists: many(customerPricelists),
  internalNotes: many(internalNotes),
  activityLogs: many(activityLog),
}));

// Category relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(baseProducts),
}));

// Product relations
export const baseProductsRelations = relations(baseProducts, ({ one, many }) => ({
  category: one(categories, {
    fields: [baseProducts.categoryId],
    references: [categories.id],
  }),
  sizes: many(productSizes),
  addons: many(productAddons),
}));

// Product size relations
export const productSizesRelations = relations(productSizes, ({ one, many }) => ({
  product: one(baseProducts, {
    fields: [productSizes.productId],
    references: [baseProducts.id],
  }),
  quantities: many(sizeQuantities),
}));

// Size quantity relations
export const sizeQuantitiesRelations = relations(sizeQuantities, ({ one, many }) => ({
  size: one(productSizes, {
    fields: [sizeQuantities.sizeId],
    references: [productSizes.id],
  }),
  supplierPrices: many(supplierPrices),
  quoteItems: many(quoteItems),
}));

// Product addon relations
export const productAddonsRelations = relations(productAddons, ({ one }) => ({
  product: one(baseProducts, {
    fields: [productAddons.productId],
    references: [baseProducts.id],
  }),
  category: one(categories, {
    fields: [productAddons.categoryId],
    references: [categories.id],
  }),
}));

// Quote relations
export const quotesRelations = relations(quotes, ({ one, many }) => ({
  customer: one(users, {
    fields: [quotes.customerId],
    references: [users.id],
  }),
  parentQuote: one(quotes, {
    fields: [quotes.parentQuoteId],
    references: [quotes.id],
  }),
  items: many(quoteItems),
  attachments: many(quoteAttachments),
}));

// Quote item relations
export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
  }),
  sizeQuantity: one(sizeQuantities, {
    fields: [quoteItems.sizeQuantityId],
    references: [sizeQuantities.id],
  }),
  supplier: one(users, {
    fields: [quoteItems.supplierId],
    references: [users.id],
  }),
}));

// Quote attachment relations
export const quoteAttachmentsRelations = relations(quoteAttachments, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteAttachments.quoteId],
    references: [quotes.id],
  }),
}));

// Supplier price relations
export const supplierPricesRelations = relations(supplierPrices, ({ one }) => ({
  supplier: one(users, {
    fields: [supplierPrices.supplierId],
    references: [users.id],
  }),
  sizeQuantity: one(sizeQuantities, {
    fields: [supplierPrices.sizeQuantityId],
    references: [sizeQuantities.id],
  }),
}));

// Supplier job relations
export const supplierJobsRelations = relations(supplierJobs, ({ one }) => ({
  supplier: one(users, {
    fields: [supplierJobs.supplierId],
    references: [users.id],
  }),
  customer: one(users, {
    fields: [supplierJobs.customerId],
    references: [users.id],
  }),
  quote: one(quotes, {
    fields: [supplierJobs.quoteId],
    references: [quotes.id],
  }),
  quoteItem: one(quoteItems, {
    fields: [supplierJobs.quoteItemId],
    references: [quoteItems.id],
  }),
  sizeQuantity: one(sizeQuantities, {
    fields: [supplierJobs.sizeQuantityId],
    references: [sizeQuantities.id],
  }),
}));

// Customer pricelist relations
export const customerPricelistsRelations = relations(customerPricelists, ({ one }) => ({
  customer: one(users, {
    fields: [customerPricelists.customerId],
    references: [users.id],
  }),
  pricelist: one(pricelists, {
    fields: [customerPricelists.pricelistId],
    references: [pricelists.id],
  }),
}));

// Pricelist relations
export const pricelistsRelations = relations(pricelists, ({ many }) => ({
  customerPricelists: many(customerPricelists),
}));

// Internal note relations
export const internalNotesRelations = relations(internalNotes, ({ one }) => ({
  author: one(users, {
    fields: [internalNotes.authorId],
    references: [users.id],
  }),
}));

// Activity log relations
export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));
