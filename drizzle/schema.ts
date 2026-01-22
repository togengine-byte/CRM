import { integer, pgEnum, pgTable, text, timestamp, varchar, decimal, jsonb, boolean, serial } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "employee", "customer", "supplier", "courier"]);
export const userStatusEnum = pgEnum("user_status", ["pending_approval", "active", "rejected", "deactivated"]);
export const quoteStatusEnum = pgEnum("quote_status", ["draft", "sent", "approved", "rejected", "superseded", "in_production", "ready"]);
export const entityTypeEnum = pgEnum("entity_type", ["customer", "quote"]);

// Users table with all roles including COURIER
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("customer").notNull(),
  status: userStatusEnum("status").default("pending_approval").notNull(),
  phone: varchar("phone", { length: 20 }),
  companyName: text("companyName"),
  address: text("address"),
  totalRatingPoints: integer("totalRatingPoints").default(0),
  ratedDealsCount: integer("ratedDealsCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// Base products table
export const baseProducts = pgTable("base_products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Product variants table
export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  baseProductId: integer("baseProductId").notNull(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  attributes: jsonb("attributes"),
  validationProfileId: integer("validationProfileId"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Validation profiles for file validation
export const validationProfiles = pgTable("validation_profiles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  minDpi: integer("minDpi").default(300).notNull(),
  maxDpi: integer("maxDpi"),
  allowedColorspaces: jsonb("allowedColorspaces").default('["CMYK"]'),
  requiredBleedMm: integer("requiredBleedMm").default(3).notNull(),
  maxFileSizeMb: integer("maxFileSizeMb").default(100).notNull(),
  allowedFormats: jsonb("allowedFormats").default('["pdf", "ai", "eps", "tiff"]'),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Pricelists table
export const pricelists = pgTable("pricelists", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isDefault: boolean("isDefault").default(false),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Pricelist items table
export const pricelistItems = pgTable("pricelist_items", {
  id: serial("id").primaryKey(),
  pricelistId: integer("pricelistId").notNull(),
  productVariantId: integer("productVariantId").notNull(),
  minQuantity: integer("minQuantity").default(1),
  maxQuantity: integer("maxQuantity"),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Customer pricelists assignment
export const customerPricelists = pgTable("customer_pricelists", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId").notNull(),
  pricelistId: integer("pricelistId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Quotes table with versioning
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId").notNull(),
  employeeId: integer("employeeId"),
  status: quoteStatusEnum("status").default("draft").notNull(),
  version: integer("version").default(1).notNull(),
  parentQuoteId: integer("parentQuoteId"),
  finalValue: decimal("finalValue", { precision: 12, scale: 2 }),
  rejectionReason: text("rejectionReason"),
  dealRating: integer("dealRating"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Quote items table
export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quoteId").notNull(),
  productVariantId: integer("productVariantId").notNull(),
  quantity: integer("quantity").notNull(),
  priceAtTimeOfQuote: decimal("priceAtTimeOfQuote", { precision: 10, scale: 2 }).notNull(),
  isUpsell: boolean("isUpsell").default(false),
  supplierId: integer("supplierId"),
  supplierCost: decimal("supplierCost", { precision: 10, scale: 2 }),
  deliveryDays: integer("deliveryDays"),
  // Courier tracking fields
  pickedUp: boolean("pickedUp").default(false),
  pickedUpAt: timestamp("pickedUpAt"),
  pickedUpBy: integer("pickedUpBy"),
  delivered: boolean("delivered").default(false),
  deliveredAt: timestamp("deliveredAt"),
  deliveredBy: integer("deliveredBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Quote attachments table
export const quoteAttachments = pgTable("quote_attachments", {
  id: serial("id").primaryKey(),
  quoteId: integer("quoteId").notNull(),
  quoteItemId: integer("quoteItemId"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileSize: integer("fileSize"),
  mimeType: varchar("mimeType", { length: 100 }),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

// Quote file warnings table
export const quoteFileWarnings = pgTable("quote_file_warnings", {
  id: serial("id").primaryKey(),
  quoteId: integer("quoteId").notNull(),
  attachmentId: integer("attachmentId").notNull(),
  warningType: varchar("warningType", { length: 100 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default('warning'),
  message: text("message").notNull(),
  details: text("details"),
  currentValue: varchar("currentValue", { length: 255 }),
  requiredValue: varchar("requiredValue", { length: 255 }),
  isAcknowledged: boolean("isAcknowledged").default(false),
  acknowledgedBy: integer("acknowledgedBy"),
  acknowledgedAt: timestamp("acknowledgedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Supplier prices table
export const supplierPrices = pgTable("supplier_prices", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplierId").notNull(),
  productVariantId: integer("productVariantId").notNull(),
  minQuantity: integer("minQuantity").default(1),
  maxQuantity: integer("maxQuantity"),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  deliveryDays: integer("deliveryDays").default(3),
  qualityRating: decimal("qualityRating", { precision: 3, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Internal notes table
export const internalNotes = pgTable("internal_notes", {
  id: serial("id").primaryKey(),
  entityType: entityTypeEnum("entityType").notNull(),
  entityId: integer("entityId").notNull(),
  authorId: integer("authorId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Activity log table
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  actionType: varchar("actionType", { length: 100 }).notNull(),
  details: jsonb("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// System settings table for configuration
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedBy: integer("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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
