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
  password: varchar("password", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("customer").notNull(),
  status: userStatusEnum("status").default("pending_approval").notNull(),
  phone: varchar("phone", { length: 20 }),
  companyName: text("companyName"),
  address: text("address"),
  billingEmail: varchar("billingEmail", { length: 320 }),
  permissions: jsonb("permissions").default('{}'),
  customerNumber: integer("customerNumber"),
  supplierNumber: integer("supplierNumber"),
  totalRatingPoints: integer("totalRatingPoints").default(0),
  ratedDealsCount: integer("ratedDealsCount").default(0),
  pricelistId: integer("pricelistId"), // Default pricelist for this customer
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  displayOrder: integer("displayOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Base products table - column names match actual DB columns
export const baseProducts = pgTable("base_products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  productNumber: integer("productNumber"),
  category: varchar("category", { length: 100 }),
  categoryId: integer("categoryId"),
  imageUrl: text("image_url"),
  allowCustomQuantity: boolean("allow_custom_quantity").default(true),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Product sizes table
export const productSizes = pgTable("product_sizes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  dimensions: varchar("dimensions", { length: 50 }),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull().default("0"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Size Quantities - מחירים לכל שילוב גודל+כמות
export const sizeQuantities = pgTable("size_quantities", {
  id: serial("id").primaryKey(),
  sizeId: integer("size_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product addons table
export const productAddons = pgTable("product_addons", {
  id: serial("id").primaryKey(),
  productId: integer("product_id"),
  categoryId: integer("category_id"),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  priceType: varchar("price_type", { length: 20 }).notNull().default("fixed"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Pricelists table - מחירונים עם אחוז רווח
// PRICING SYSTEM UPDATE: Added markupPercentage for automatic profit calculation
export const pricelists = pgTable("pricelists", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // אחוז הרווח שיתווסף למחיר הספק (לדוגמה: 30 = 30% רווח)
  markupPercentage: decimal("markupPercentage", { precision: 5, scale: 2 }).default("0").notNull(),
  isDefault: boolean("isDefault").default(false),
  isActive: boolean("isActive").default(true),
  // סדר תצוגה במערכת
  displayOrder: integer("displayOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Pricelist items table - עובד עם sizeQuantityId
export const pricelistItems = pgTable("pricelist_items", {
  id: serial("id").primaryKey(),
  pricelistId: integer("pricelistId").notNull(),
  sizeQuantityId: integer("sizeQuantityId").notNull(),
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
// PRICING SYSTEM UPDATE: Added pricelistId for quote-level markup
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId").notNull(),
  employeeId: integer("employeeId"),
  status: quoteStatusEnum("status").default("draft").notNull(),
  version: integer("version").default(1).notNull(),
  quoteNumber: integer("quoteNumber"),
  parentQuoteId: integer("parentQuoteId"),
  // מחירון שהוחל על ההצעה - קובע את אחוז הרווח
  pricelistId: integer("pricelistId"),
  finalValue: decimal("finalValue", { precision: 12, scale: 2 }),
  // עלות ספק כוללת (לחישוב רווח)
  totalSupplierCost: decimal("totalSupplierCost", { precision: 12, scale: 2 }),
  rejectionReason: text("rejectionReason"),
  dealRating: integer("dealRating"),
  // האם להעביר אוטומטית לייצור לאחר אישור הלקוח
  autoProduction: boolean("autoProduction").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Quote items table - עובד עם sizeQuantityId
// PRICING SYSTEM UPDATE: Added isManualPrice flag for manual price override
export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quoteId").notNull(),
  sizeQuantityId: integer("sizeQuantityId").notNull(),
  quantity: integer("quantity").notNull(),
  // מחיר ללקוח (אחרי החלת מחירון או ידני)
  priceAtTimeOfQuote: decimal("priceAtTimeOfQuote", { precision: 10, scale: 2 }).notNull(),
  // האם המחיר הוזן ידנית (לא מחושב ממחירון)
  isManualPrice: boolean("isManualPrice").default(false),
  isUpsell: boolean("isUpsell").default(false),
  supplierId: integer("supplierId"),
  // מחיר ספק ליחידה
  supplierCost: decimal("supplierCost", { precision: 10, scale: 2 }),
  deliveryDays: integer("deliveryDays"),
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

// Supplier jobs table - עבודות ספקים לדירוג
export const supplierJobs = pgTable("supplier_jobs", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplierId").notNull(),
  customerId: integer("customerId"),
  quoteId: integer("quoteId"),
  quoteItemId: integer("quoteItemId"),
  sizeQuantityId: integer("sizeQuantityId"),
  quantity: integer("quantity").notNull(),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  // Status flow: pending -> accepted -> ready -> picked_up -> delivered
  // pending = הזמנה חדשה (ממתין לאישור ספק)
  // accepted = ספק אישר (עבודה בביצוע)
  // ready = ספק סימן כמוכן (מוכן לאיסוף)
  // cancelled = עבודה בוטלה (לפני שספק אישר)
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  
  // Supplier acceptance
  supplierAccepted: boolean("supplierAccepted").default(false),
  supplierAcceptedAt: timestamp("supplierAcceptedAt"),
  
  // Supplier marked ready
  supplierMarkedReady: boolean("supplierMarkedReady").default(false),
  supplierReadyAt: timestamp("supplierReadyAt"),
  
  // Cancellation
  isCancelled: boolean("isCancelled").default(false),
  cancelledAt: timestamp("cancelledAt"),
  cancelledReason: text("cancelledReason"),
  
  courierConfirmedReady: boolean("courierConfirmedReady").default(false),
  supplierRating: decimal("supplierRating", { precision: 3, scale: 1 }),
  promisedDeliveryDays: integer("promisedDeliveryDays").default(3),
  fileValidationWarnings: jsonb("fileValidationWarnings").default('[]'),
  
  // Pickup and delivery tracking
  pickedUpAt: timestamp("pickedUpAt"),
  deliveredAt: timestamp("deliveredAt"),
  actualDeliveryDate: timestamp("actualDeliveryDate"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Supplier prices table - מחירי ספקים לפי שילוב גודל+כמות
export const supplierPrices = pgTable("supplier_prices", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplierId").notNull(),
  sizeQuantityId: integer("sizeQuantityId").notNull(),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  deliveryDays: integer("deliveryDays").default(3),
  qualityRating: decimal("qualityRating", { precision: 3, scale: 2 }),
  isPreferred: boolean("isPreferred").default(false),
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
  entityType: varchar("entityType", { length: 50 }),
  entityId: integer("entityId"),
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
export type Category = typeof categories.$inferSelect;
export type BaseProduct = typeof baseProducts.$inferSelect;
export type ProductSize = typeof productSizes.$inferSelect;
export type SizeQuantity = typeof sizeQuantities.$inferSelect;
export type ProductAddon = typeof productAddons.$inferSelect;
export type ValidationProfile = typeof validationProfiles.$inferSelect;
export type Pricelist = typeof pricelists.$inferSelect;
export type PricelistItem = typeof pricelistItems.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type QuoteItem = typeof quoteItems.$inferSelect;
export type QuoteAttachment = typeof quoteAttachments.$inferSelect;
export type SupplierPrice = typeof supplierPrices.$inferSelect;
export type SupplierJob = typeof supplierJobs.$inferSelect;
export type InsertSupplierJob = typeof supplierJobs.$inferInsert;
export type InternalNote = typeof internalNotes.$inferSelect;
export type ActivityLog = typeof activityLog.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;

// Customer signup requests table
export const customerSignupRequests = pgTable("customer_signup_requests", {
  id: serial("id").primaryKey(),
  requestId: varchar("requestId", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  companyName: text("companyName"),
  description: text("description").notNull(),
  productId: integer("productId"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  queueNumber: serial("queueNumber").notNull(),
  files: jsonb("files").default('[]'),
  fileValidationWarnings: jsonb("fileValidationWarnings").default('[]'),
  processedAt: timestamp("processedAt"),
  processedBy: integer("processedBy"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CustomerSignupRequest = typeof customerSignupRequests.$inferSelect;
export type InsertCustomerSignupRequest = typeof customerSignupRequests.$inferInsert;

// Developer logs table for debugging and monitoring
export const developerLogs = pgTable("developer_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  level: varchar("level", { length: 20 }).default("info").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  message: text("message"),
  details: jsonb("details").default('{}'),
  stackTrace: text("stackTrace"),
  url: text("url"),
  userAgent: text("userAgent"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeveloperLog = typeof developerLogs.$inferSelect;
export type InsertDeveloperLog = typeof developerLogs.$inferInsert;
