import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json, boolean } from "drizzle-orm/mysql-core";

export const userRoleEnum = mysqlEnum("role", ["admin", "employee", "customer", "supplier", "courier"]);
export const userStatusEnum = mysqlEnum("status", ["pending_approval", "active", "rejected", "deactivated"]);
export const quoteStatusEnum = mysqlEnum("quote_status", ["draft", "sent", "approved", "rejected", "superseded", "in_production", "ready"]);
export const entityTypeEnum = mysqlEnum("entity_type", ["customer", "quote"]);

// Users table with all roles including COURIER
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum.default("customer").notNull(),
  status: userStatusEnum.default("pending_approval").notNull(),
  phone: varchar("phone", { length: 20 }),
  companyName: text("companyName"),
  address: text("address"),
  totalRatingPoints: int("totalRatingPoints").default(0),
  ratedDealsCount: int("ratedDealsCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// Base products table
export const baseProducts = mysqlTable("base_products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Product variants table
export const productVariants = mysqlTable("product_variants", {
  id: int("id").autoincrement().primaryKey(),
  baseProductId: int("baseProductId").notNull(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  attributes: json("attributes"),
  validationProfileId: int("validationProfileId"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Validation profiles for file validation
export const validationProfiles = mysqlTable("validation_profiles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  minDpi: int("minDpi").default(300).notNull(),
  maxDpi: int("maxDpi"),
  allowedColorspaces: json("allowedColorspaces").default('["CMYK"]'),
  requiredBleedMm: int("requiredBleedMm").default(3).notNull(),
  maxFileSizeMb: int("maxFileSizeMb").default(100).notNull(),
  allowedFormats: json("allowedFormats").default('["pdf", "ai", "eps", "tiff"]'),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Pricelists table
export const pricelists = mysqlTable("pricelists", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isDefault: boolean("isDefault").default(false),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Pricelist items table
export const pricelistItems = mysqlTable("pricelist_items", {
  id: int("id").autoincrement().primaryKey(),
  pricelistId: int("pricelistId").notNull(),
  productVariantId: int("productVariantId").notNull(),
  minQuantity: int("minQuantity").default(1),
  maxQuantity: int("maxQuantity"),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Customer pricelists assignment
export const customerPricelists = mysqlTable("customer_pricelists", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  pricelistId: int("pricelistId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Quotes table with versioning
export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  employeeId: int("employeeId"),
  status: quoteStatusEnum.default("draft").notNull(),
  version: int("version").default(1).notNull(),
  parentQuoteId: int("parentQuoteId"),
  finalValue: decimal("finalValue", { precision: 12, scale: 2 }),
  rejectionReason: text("rejectionReason"),
  dealRating: int("dealRating"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Quote items table
export const quoteItems = mysqlTable("quote_items", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  productVariantId: int("productVariantId").notNull(),
  quantity: int("quantity").notNull(),
  priceAtTimeOfQuote: decimal("priceAtTimeOfQuote", { precision: 10, scale: 2 }).notNull(),
  isUpsell: boolean("isUpsell").default(false),
  supplierId: int("supplierId"),
  supplierCost: decimal("supplierCost", { precision: 10, scale: 2 }),
  deliveryDays: int("deliveryDays"),
  // Courier tracking fields
  pickedUp: boolean("pickedUp").default(false),
  pickedUpAt: timestamp("pickedUpAt"),
  pickedUpBy: int("pickedUpBy"),
  delivered: boolean("delivered").default(false),
  deliveredAt: timestamp("deliveredAt"),
  deliveredBy: int("deliveredBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Quote attachments table
export const quoteAttachments = mysqlTable("quote_attachments", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  quoteItemId: int("quoteItemId"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 100 }),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

// Quote file warnings table
export const quoteFileWarnings = mysqlTable("quote_file_warnings", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  attachmentId: int("attachmentId").notNull(),
  warningType: varchar("warningType", { length: 100 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default('warning'),
  message: text("message").notNull(),
  details: text("details"),
  currentValue: varchar("currentValue", { length: 255 }),
  requiredValue: varchar("requiredValue", { length: 255 }),
  isAcknowledged: boolean("isAcknowledged").default(false),
  acknowledgedBy: int("acknowledgedBy"),
  acknowledgedAt: timestamp("acknowledgedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Supplier prices table
export const supplierPrices = mysqlTable("supplier_prices", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull(),
  productVariantId: int("productVariantId").notNull(),
  minQuantity: int("minQuantity").default(1),
  maxQuantity: int("maxQuantity"),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  deliveryDays: int("deliveryDays").default(3),
  qualityRating: decimal("qualityRating", { precision: 3, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Internal notes table
export const internalNotes = mysqlTable("internal_notes", {
  id: int("id").autoincrement().primaryKey(),
  entityType: entityTypeEnum.notNull(),
  entityId: int("entityId").notNull(),
  authorId: int("authorId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Activity log table
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  actionType: varchar("actionType", { length: 100 }).notNull(),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// System settings table for configuration
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: json("value").notNull(),
  description: text("description"),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type BaseProduct = typeof baseProducts.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type ValidationProfile = typeof validationProfiles.$inferSelect;
export type Pricelist = typeof pricelists.$inferSelect;
export type PricelistItem = typeof pricelistItems.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type QuoteItem = typeof quoteItems.$inferSelect;
export type QuoteAttachment = typeof quoteAttachments.$inferSelect;
export type SupplierPrice = typeof supplierPrices.$inferSelect;
export type InternalNote = typeof internalNotes.$inferSelect;
export type ActivityLog = typeof activityLog.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;
