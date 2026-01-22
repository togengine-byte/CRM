import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../drizzle/schema";

let db: ReturnType<typeof drizzle> | null = null;

/**
 * Initialize in-memory SQLite database for testing
 * This creates the same schema as the production database
 */
export function initializeTestDb() {
  const sqlite = new Database(":memory:");

  // Enable foreign keys
  sqlite.pragma("foreign_keys = ON");

  // Create the database instance
  db = drizzle(sqlite, { schema });

  // Create all tables
  createTables(sqlite);

  // Insert sample data
  insertSampleData(sqlite);

  return db;
}

/**
 * Create all tables with the same schema as production
 */
function createTables(sqlite: Database.Database) {
  // Create enum types (as text in SQLite)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "user_role" (
      value TEXT PRIMARY KEY
    );
    INSERT OR IGNORE INTO "user_role" VALUES ('admin'), ('employee'), ('customer'), ('supplier'), ('courier');

    CREATE TABLE IF NOT EXISTS "user_status" (
      value TEXT PRIMARY KEY
    );
    INSERT OR IGNORE INTO "user_status" VALUES ('pending_approval'), ('active'), ('rejected'), ('deactivated');

    CREATE TABLE IF NOT EXISTS "quote_status" (
      value TEXT PRIMARY KEY
    );
    INSERT OR IGNORE INTO "quote_status" VALUES ('draft'), ('sent'), ('approved'), ('rejected'), ('superseded'), ('in_production'), ('ready');

    CREATE TABLE IF NOT EXISTS "entity_type" (
      value TEXT PRIMARY KEY
    );
    INSERT OR IGNORE INTO "entity_type" VALUES ('customer'), ('quote');
  `);

  // Create users table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "users" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "openId" VARCHAR(64) NOT NULL UNIQUE,
      name TEXT,
      email VARCHAR(320),
      "loginMethod" VARCHAR(64),
      role TEXT DEFAULT 'customer' NOT NULL,
      status TEXT DEFAULT 'pending_approval' NOT NULL,
      phone VARCHAR(20),
      "companyName" TEXT,
      address TEXT,
      "totalRatingPoints" INTEGER DEFAULT 0,
      "ratedDealsCount" INTEGER DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "lastSignedIn" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  // Create base_products table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "base_products" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      "isActive" BOOLEAN DEFAULT 1,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  // Create product_variants table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "product_variants" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "baseProductId" INTEGER NOT NULL,
      sku VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      attributes TEXT,
      "validationProfileId" INTEGER,
      "isActive" BOOLEAN DEFAULT 1,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY ("baseProductId") REFERENCES "base_products"(id)
    );
  `);

  // Create validation_profiles table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "validation_profiles" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      "minDpi" INTEGER DEFAULT 300 NOT NULL,
      "maxDpi" INTEGER,
      "allowedColorspaces" TEXT DEFAULT '["CMYK"]',
      "requiredBleedMm" INTEGER DEFAULT 3 NOT NULL,
      "maxFileSizeMb" INTEGER DEFAULT 100 NOT NULL,
      "allowedFormats" TEXT DEFAULT '["pdf", "ai", "eps", "tiff"]',
      "isDefault" BOOLEAN DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  // Create pricelists table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "pricelists" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      "isDefault" BOOLEAN DEFAULT 0,
      "isActive" BOOLEAN DEFAULT 1,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  // Create pricelist_items table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "pricelist_items" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "pricelistId" INTEGER NOT NULL,
      "productVariantId" INTEGER NOT NULL,
      "minQuantity" INTEGER DEFAULT 1,
      "maxQuantity" INTEGER,
      "pricePerUnit" DECIMAL(10, 2) NOT NULL,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY ("pricelistId") REFERENCES "pricelists"(id),
      FOREIGN KEY ("productVariantId") REFERENCES "product_variants"(id)
    );
  `);

  // Create customer_pricelists table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "customer_pricelists" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "customerId" INTEGER NOT NULL,
      "pricelistId" INTEGER NOT NULL,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY ("customerId") REFERENCES "users"(id),
      FOREIGN KEY ("pricelistId") REFERENCES "pricelists"(id)
    );
  `);

  // Create quotes table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "quotes" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "customerId" INTEGER NOT NULL,
      "employeeId" INTEGER,
      status TEXT DEFAULT 'draft' NOT NULL,
      version INTEGER DEFAULT 1 NOT NULL,
      "parentQuoteId" INTEGER,
      "finalValue" DECIMAL(12, 2),
      "rejectionReason" TEXT,
      "dealRating" INTEGER,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY ("customerId") REFERENCES "users"(id),
      FOREIGN KEY ("employeeId") REFERENCES "users"(id),
      FOREIGN KEY ("parentQuoteId") REFERENCES "quotes"(id)
    );
  `);

  // Create quote_items table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "quote_items" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "quoteId" INTEGER NOT NULL,
      "productVariantId" INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      "priceAtTimeOfQuote" DECIMAL(10, 2) NOT NULL,
      "isUpsell" BOOLEAN DEFAULT 0,
      "supplierId" INTEGER,
      "supplierCost" DECIMAL(10, 2),
      "deliveryDays" INTEGER,
      "pickedUp" BOOLEAN DEFAULT 0,
      "pickedUpAt" TIMESTAMP,
      "pickedUpBy" INTEGER,
      delivered BOOLEAN DEFAULT 0,
      "deliveredAt" TIMESTAMP,
      "deliveredBy" INTEGER,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY ("quoteId") REFERENCES "quotes"(id),
      FOREIGN KEY ("productVariantId") REFERENCES "product_variants"(id),
      FOREIGN KEY ("supplierId") REFERENCES "users"(id),
      FOREIGN KEY ("pickedUpBy") REFERENCES "users"(id),
      FOREIGN KEY ("deliveredBy") REFERENCES "users"(id)
    );
  `);

  // Create quote_attachments table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "quote_attachments" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "quoteId" INTEGER NOT NULL,
      "quoteItemId" INTEGER,
      "fileName" VARCHAR(255) NOT NULL,
      "fileUrl" TEXT NOT NULL,
      "fileSize" INTEGER,
      "mimeType" VARCHAR(100),
      "uploadedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY ("quoteId") REFERENCES "quotes"(id),
      FOREIGN KEY ("quoteItemId") REFERENCES "quote_items"(id)
    );
  `);

  // Create quote_file_warnings table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "quote_file_warnings" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "quoteId" INTEGER NOT NULL,
      "attachmentId" INTEGER NOT NULL,
      "warningType" VARCHAR(100) NOT NULL,
      severity VARCHAR(20) DEFAULT 'warning' NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      "currentValue" VARCHAR(255),
      "requiredValue" VARCHAR(255),
      "isAcknowledged" BOOLEAN DEFAULT 0,
      "acknowledgedBy" INTEGER,
      "acknowledgedAt" TIMESTAMP,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY ("quoteId") REFERENCES "quotes"(id),
      FOREIGN KEY ("attachmentId") REFERENCES "quote_attachments"(id),
      FOREIGN KEY ("acknowledgedBy") REFERENCES "users"(id)
    );
  `);

  // Create supplier_prices table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "supplier_prices" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "supplierId" INTEGER NOT NULL,
      "productVariantId" INTEGER NOT NULL,
      "minQuantity" INTEGER DEFAULT 1,
      "maxQuantity" INTEGER,
      "pricePerUnit" DECIMAL(10, 2) NOT NULL,
      "deliveryDays" INTEGER DEFAULT 3,
      "qualityRating" DECIMAL(3, 2),
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY ("supplierId") REFERENCES "users"(id),
      FOREIGN KEY ("productVariantId") REFERENCES "product_variants"(id)
    );
  `);

  // Create internal_notes table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "internal_notes" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "entityType" TEXT NOT NULL,
      "entityId" INTEGER NOT NULL,
      "authorId" INTEGER NOT NULL,
      content TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY ("authorId") REFERENCES "users"(id)
    );
  `);

  // Create activity_log table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "activity_log" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "userId" INTEGER,
      "actionType" VARCHAR(100) NOT NULL,
      details TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY ("userId") REFERENCES "users"(id)
    );
  `);

  // Create system_settings table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "system_settings" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key VARCHAR(100) NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT,
      "updatedBy" INTEGER,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY ("updatedBy") REFERENCES "users"(id)
    );
  `);
}

/**
 * Insert sample data - same as production database
 */
function insertSampleData(sqlite: Database.Database) {
  // 1. Admin user with code 1234
  sqlite.exec(`
    INSERT INTO users ("openId", name, email, "loginMethod", role, status, phone, "companyName", address)
    VALUES ('admin_1234', 'מנהל ראשי', 'admin@crm.com', 'password', 'admin', 'active', '050-1234567', 'CRM Company', 'תל אביב, ישראל');
  `);

  // 2. Employees
  const employees = [
    ("emp_001", "יוסי כהן", "yossi@crm.com"),
    ("emp_002", "שרה לוי", "sara@crm.com"),
    ("emp_003", "דוד ישראלי", "david@crm.com"),
    ("emp_004", "רחל אברהם", "rachel@crm.com"),
    ("emp_005", "משה גולן", "moshe@crm.com"),
  ];

  employees.forEach(([id, name, email]) => {
    sqlite.exec(`
      INSERT INTO users ("openId", name, email, role, status, phone)
      VALUES ('${id}', '${name}', '${email}', 'employee', 'active', '050-${id.slice(-3)}11111');
    `);
  });

  // 3. Active Customers
  const customers = [
    ("cust_001", "חברת אלפא בע\"מ", "alpha@company.com", "חברת אלפא", "רחוב הרצל 1, תל אביב"),
    ("cust_002", "בטא תעשיות", "beta@company.com", "בטא תעשיות", "רחוב ויצמן 15, רמת גן"),
    ("cust_003", "גמא שירותים", "gamma@company.com", "גמא שירותים", "רחוב בן גוריון 8, הרצליה"),
    ("cust_004", "דלתא מסחר", "delta@company.com", "דלתא מסחר", "רחוב רוטשילד 22, תל אביב"),
    ("cust_005", "אפסילון טכנולוגיות", "epsilon@company.com", "אפסילון טכנולוגיות", "רחוב הברזל 3, רמת החייל"),
  ];

  customers.forEach(([id, name, email, company, address]) => {
    sqlite.exec(`
      INSERT INTO users ("openId", name, email, role, status, phone, "companyName", address)
      VALUES ('${id}', '${name}', '${email}', 'customer', 'active', '03-${id.slice(-3)}4567', '${company}', '${address}');
    `);
  });

  // 4. Pending Customers
  const pending = [
    ("pending_001", "לקוח ממתין 1", "pending1@company.com", "חברה ממתינה 1", "כתובת 1"),
    ("pending_002", "לקוח ממתין 2", "pending2@company.com", "חברה ממתינה 2", "כתובת 2"),
    ("pending_003", "לקוח ממתין 3", "pending3@company.com", "חברה ממתינה 3", "כתובת 3"),
    ("pending_004", "לקוח ממתין 4", "pending4@company.com", "חברה ממתינה 4", "כתובת 4"),
    ("pending_005", "לקוח ממתין 5", "pending5@company.com", "חברה ממתינה 5", "כתובת 5"),
  ];

  pending.forEach(([id, name, email, company, address]) => {
    sqlite.exec(`
      INSERT INTO users ("openId", name, email, role, status, phone, "companyName", address)
      VALUES ('${id}', '${name}', '${email}', 'customer', 'pending_approval', '03-${id.slice(-3)}6666', '${company}', '${address}');
    `);
  });

  // 5. Suppliers
  const suppliers = [
    ("supp_001", "ספק דפוס מקצועי", "supplier1@print.com", "דפוס מקצועי בע\"מ", "אזור תעשייה חיפה"),
    ("supp_002", "ספק נייר איכותי", "supplier2@paper.com", "נייר איכותי בע\"מ", "אזור תעשייה נתניה"),
    ("supp_003", "ספק אריזות", "supplier3@pack.com", "אריזות ישראל", "אזור תעשייה אשדוד"),
    ("supp_004", "ספק הדפסה דיגיטלית", "supplier4@digital.com", "דיגיטל פרינט", "אזור תעשייה ראשון"),
    ("supp_005", "ספק חומרי גלם", "supplier5@raw.com", "חומרי גלם בע\"מ", "אזור תעשייה באר שבע"),
  ];

  suppliers.forEach(([id, name, email, company, address]) => {
    sqlite.exec(`
      INSERT INTO users ("openId", name, email, role, status, phone, "companyName", address)
      VALUES ('${id}', '${name}', '${email}', 'supplier', 'active', '04-${id.slice(-3)}11111', '${company}', '${address}');
    `);
  });

  // 6. Couriers
  const couriers = [
    ("courier_001", "שליח 1 - צפון", "courier1@delivery.com"),
    ("courier_002", "שליח 2 - מרכז", "courier2@delivery.com"),
    ("courier_003", "שליח 3 - דרום", "courier3@delivery.com"),
    ("courier_004", "שליח 4 - שרון", "courier4@delivery.com"),
    ("courier_005", "שליח 5 - ירושלים", "courier5@delivery.com"),
  ];

  couriers.forEach(([id, name, email]) => {
    sqlite.exec(`
      INSERT INTO users ("openId", name, email, role, status, phone)
      VALUES ('${id}', '${name}', '${email}', 'courier', 'active', '052-${id.slice(-3)}11111');
    `);
  });

  // 7. Base Products
  const products = [
    ("כרטיסי ביקור", "כרטיסי ביקור מקצועיים בגדלים שונים", "כרטיסים"),
    ("פליירים", "פליירים פרסומיים בגדלים A4, A5, A6", "פרסום"),
    ("ברושורים", "ברושורים מקופלים בעיצובים שונים", "פרסום"),
    ("פוסטרים", "פוסטרים בגדלים שונים להדפסה", "שילוט"),
    ("מעטפות", "מעטפות ממותגות בגדלים שונים", "משרדי"),
  ];

  products.forEach(([name, desc, cat]) => {
    sqlite.exec(`
      INSERT INTO base_products (name, description, category)
      VALUES ('${name}', '${desc}', '${cat}');
    `);
  });

  // 8. Product Variants
  const variants = [
    (1, "BC-STD-001", "כרטיס ביקור סטנדרטי 9x5", '{"size": "9x5cm", "paper": "300gsm"}'),
    (1, "BC-PRE-002", "כרטיס ביקור פרימיום 9x5", '{"size": "9x5cm", "paper": "400gsm", "lamination": "matt"}'),
    (2, "FLY-A5-001", "פלייר A5 חד צדדי", '{"size": "A5", "sides": 1}'),
    (3, "BRO-TRI-001", "ברושור משולש A4", '{"size": "A4", "folds": 2}'),
    (4, "POS-A2-001", "פוסטר A2", '{"size": "A2", "paper": "170gsm"}'),
  ];

  variants.forEach(([baseId, sku, name, attrs]) => {
    sqlite.exec(`
      INSERT INTO product_variants ("baseProductId", sku, name, attributes)
      VALUES (${baseId}, '${sku}', '${name}', '${attrs}');
    `);
  });

  // 9. Validation Profiles
  const profiles = [
    ("פרופיל סטנדרטי", "פרופיל בדיקה סטנדרטי לרוב העבודות", 300, 600, 1),
    ("פרופיל פרימיום", "פרופיל בדיקה לעבודות איכותיות", 300, 1200, 0),
    ("פרופיל שילוט", "פרופיל לעבודות שילוט גדולות", 150, 300, 0),
    ("פרופיל דיגיטלי", "פרופיל להדפסה דיגיטלית", 300, 600, 0),
    ("פרופיל אופסט", "פרופיל להדפסת אופסט", 300, 600, 0),
  ];

  profiles.forEach(([name, desc, minDpi, maxDpi, isDefault]) => {
    sqlite.exec(`
      INSERT INTO validation_profiles (name, description, "minDpi", "maxDpi", "isDefault")
      VALUES ('${name}', '${desc}', ${minDpi}, ${maxDpi}, ${isDefault});
    `);
  });

  // 10. Pricelists
  const pricelists = [
    ("מחירון בסיסי", "מחירון ברירת מחדל לכל הלקוחות", 1, 1),
    ("מחירון VIP", "מחירון מיוחד ללקוחות VIP", 0, 1),
    ("מחירון סיטונאי", "מחירון לרכישות בכמויות גדולות", 0, 1),
    ("מחירון עונתי", "מחירון מבצעים עונתיים", 0, 1),
    ("מחירון מיוחד", "מחירון להסכמים מיוחדים", 0, 1),
  ];

  pricelists.forEach(([name, desc, isDefault, isActive]) => {
    sqlite.exec(`
      INSERT INTO pricelists (name, description, "isDefault", "isActive")
      VALUES ('${name}', '${desc}', ${isDefault}, ${isActive});
    `);
  });

  // 11. System Settings (including code 1234)
  const settings = [
    ("admin_code", '{"code": "1234", "description": "Admin access code"}', "קוד גישה למנהל"),
    ("company_name", '{"name": "CRM Company", "nameHe": "חברת CRM"}', "שם החברה"),
    ("default_currency", '{"code": "ILS", "symbol": "₪"}', "מטבע ברירת מחדל"),
    ("tax_rate", '{"rate": 17, "name": "VAT"}', "אחוז מע\"מ"),
    ("email_notifications", '{"enabled": true, "types": ["quote", "order", "delivery"]}', "הגדרות התראות"),
  ];

  settings.forEach(([key, value, desc]) => {
    sqlite.exec(`
      INSERT INTO system_settings (key, value, description)
      VALUES ('${key}', '${value}', '${desc}');
    `);
  });
}

/**
 * Get the test database instance
 */
export function getTestDb() {
  if (!db) {
    throw new Error("Test database not initialized. Call initializeTestDb() first.");
  }
  return db;
}

/**
 * Clean up test database
 */
export function cleanupTestDb() {
  db = null;
}
