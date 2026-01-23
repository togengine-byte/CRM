-- Reset and Seed Database Script
-- מאפס את הדאטאבייס ומכניס נתוני דמו

-- Drop all existing tables
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS internal_notes CASCADE;
DROP TABLE IF EXISTS supplier_prices CASCADE;
DROP TABLE IF EXISTS supplier_jobs CASCADE;
DROP TABLE IF EXISTS quote_file_warnings CASCADE;
DROP TABLE IF EXISTS quote_attachments CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS customer_pricelists CASCADE;
DROP TABLE IF EXISTS pricelist_items CASCADE;
DROP TABLE IF EXISTS pricelists CASCADE;
DROP TABLE IF EXISTS validation_profiles CASCADE;
DROP TABLE IF EXISTS product_addons CASCADE;
DROP TABLE IF EXISTS size_quantities CASCADE;
DROP TABLE IF EXISTS product_sizes CASCADE;
DROP TABLE IF EXISTS base_products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS customer_signup_requests CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop old tables if exist
DROP TABLE IF EXISTS product_variants CASCADE;

-- Drop enums
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS quote_status CASCADE;
DROP TYPE IF EXISTS entity_type CASCADE;

-- Create enums
CREATE TYPE user_role AS ENUM ('admin', 'employee', 'customer', 'supplier', 'courier');
CREATE TYPE user_status AS ENUM ('pending_approval', 'active', 'rejected', 'deactivated');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'approved', 'rejected', 'superseded', 'in_production', 'ready');
CREATE TYPE entity_type AS ENUM ('customer', 'quote');

-- Create tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  password VARCHAR(255),
  "loginMethod" VARCHAR(64),
  role user_role NOT NULL DEFAULT 'customer',
  status user_status NOT NULL DEFAULT 'pending_approval',
  phone VARCHAR(20),
  "companyName" TEXT,
  address TEXT,
  permissions JSONB DEFAULT '{}',
  "customerNumber" INTEGER,
  "supplierNumber" INTEGER,
  "totalRatingPoints" INTEGER DEFAULT 0,
  "ratedDealsCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  "displayOrder" INTEGER DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE base_products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "productNumber" INTEGER,
  category VARCHAR(100),
  "categoryId" INTEGER,
  image_url TEXT,
  allow_custom_quantity BOOLEAN DEFAULT true,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE product_sizes (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  dimensions VARCHAR(50),
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE size_quantities (
  id SERIAL PRIMARY KEY,
  size_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE product_addons (
  id SERIAL PRIMARY KEY,
  product_id INTEGER,
  category_id INTEGER,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_type VARCHAR(20) NOT NULL DEFAULT 'fixed',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE validation_profiles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "minDpi" INTEGER NOT NULL DEFAULT 300,
  "maxDpi" INTEGER,
  "allowedColorspaces" JSONB DEFAULT '["CMYK"]',
  "requiredBleedMm" INTEGER NOT NULL DEFAULT 3,
  "maxFileSizeMb" INTEGER NOT NULL DEFAULT 100,
  "allowedFormats" JSONB DEFAULT '["pdf", "ai", "eps", "tiff"]',
  "isDefault" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE pricelists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "isDefault" BOOLEAN DEFAULT false,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE pricelist_items (
  id SERIAL PRIMARY KEY,
  "pricelistId" INTEGER NOT NULL,
  "sizeQuantityId" INTEGER NOT NULL,
  "pricePerUnit" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_pricelists (
  id SERIAL PRIMARY KEY,
  "customerId" INTEGER NOT NULL,
  "pricelistId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE quotes (
  id SERIAL PRIMARY KEY,
  "customerId" INTEGER NOT NULL,
  "employeeId" INTEGER,
  status quote_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  "quoteNumber" INTEGER,
  "parentQuoteId" INTEGER,
  "finalValue" DECIMAL(12,2),
  "rejectionReason" TEXT,
  "dealRating" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE quote_items (
  id SERIAL PRIMARY KEY,
  "quoteId" INTEGER NOT NULL,
  "sizeQuantityId" INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  "priceAtTimeOfQuote" DECIMAL(10,2) NOT NULL,
  "isUpsell" BOOLEAN DEFAULT false,
  "supplierId" INTEGER,
  "supplierCost" DECIMAL(10,2),
  "deliveryDays" INTEGER,
  "pickedUp" BOOLEAN DEFAULT false,
  "pickedUpAt" TIMESTAMP,
  "pickedUpBy" INTEGER,
  delivered BOOLEAN DEFAULT false,
  "deliveredAt" TIMESTAMP,
  "deliveredBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE quote_attachments (
  id SERIAL PRIMARY KEY,
  "quoteId" INTEGER NOT NULL,
  "quoteItemId" INTEGER,
  "fileName" VARCHAR(255) NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" INTEGER,
  "mimeType" VARCHAR(100),
  "uploadedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE quote_file_warnings (
  id SERIAL PRIMARY KEY,
  "quoteId" INTEGER NOT NULL,
  "attachmentId" INTEGER NOT NULL,
  "warningType" VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  details TEXT,
  "currentValue" VARCHAR(255),
  "requiredValue" VARCHAR(255),
  "isAcknowledged" BOOLEAN DEFAULT false,
  "acknowledgedBy" INTEGER,
  "acknowledgedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE supplier_jobs (
  id SERIAL PRIMARY KEY,
  "supplierId" INTEGER NOT NULL,
  "customerId" INTEGER,
  "quoteId" INTEGER,
  "quoteItemId" INTEGER,
  "sizeQuantityId" INTEGER,
  quantity INTEGER NOT NULL,
  "pricePerUnit" DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  "supplierMarkedReady" BOOLEAN DEFAULT false,
  "supplierReadyAt" TIMESTAMP,
  "courierConfirmedReady" BOOLEAN DEFAULT false,
  "supplierRating" DECIMAL(3,1),
  "fileValidationWarnings" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE supplier_prices (
  id SERIAL PRIMARY KEY,
  "supplierId" INTEGER NOT NULL,
  "sizeQuantityId" INTEGER NOT NULL,
  "pricePerUnit" DECIMAL(10,2) NOT NULL,
  "deliveryDays" INTEGER DEFAULT 3,
  "qualityRating" DECIMAL(3,2),
  "isPreferred" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE internal_notes (
  id SERIAL PRIMARY KEY,
  "entityType" entity_type NOT NULL,
  "entityId" INTEGER NOT NULL,
  "authorId" INTEGER NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER,
  "actionType" VARCHAR(100) NOT NULL,
  "entityType" VARCHAR(50),
  "entityId" INTEGER,
  details JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  "updatedBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_signup_requests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(20),
  "companyName" VARCHAR(255),
  description TEXT,
  "productId" INTEGER,
  "sizeQuantityId" INTEGER,
  files JSONB DEFAULT '[]',
  "fileValidationWarnings" JSONB DEFAULT '[]',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  "reviewedBy" INTEGER,
  "reviewedAt" TIMESTAMP,
  notes TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SEED DATA
-- =====================================================

-- Admin user
INSERT INTO users ("openId", name, email, password, role, status, phone, "companyName")
VALUES ('admin-001', 'מנהל מערכת', 'admin@quoteflow.co.il', '$2b$10$hashedpassword', 'admin', 'active', '050-1234567', 'QuoteFlow');

-- Employee
INSERT INTO users ("openId", name, email, password, role, status, phone, "companyName")
VALUES ('emp-001', 'עובד ראשי', 'employee@quoteflow.co.il', '$2b$10$hashedpassword', 'employee', 'active', '050-2345678', 'QuoteFlow');

-- Courier
INSERT INTO users ("openId", name, email, password, role, status, phone, "companyName")
VALUES ('courier-001', 'שליח ראשי', 'courier@quoteflow.co.il', '$2b$10$hashedpassword', 'courier', 'active', '050-3456789', 'שליחויות מהירות');

-- 10 Suppliers with rating history
INSERT INTO users ("openId", name, email, password, role, status, phone, "companyName", "supplierNumber", "totalRatingPoints", "ratedDealsCount")
VALUES 
('supplier-001', 'דפוס אלון', 'alon@print.co.il', '$2b$10$hashedpassword', 'supplier', 'active', '03-5551001', 'דפוס אלון בע"מ', 1001, 450, 100),
('supplier-002', 'הדפסות גולן', 'golan@print.co.il', '$2b$10$hashedpassword', 'supplier', 'active', '03-5551002', 'הדפסות גולן', 1002, 420, 95),
('supplier-003', 'פרינט פלוס', 'info@printplus.co.il', '$2b$10$hashedpassword', 'supplier', 'active', '03-5551003', 'פרינט פלוס בע"מ', 1003, 380, 85),
('supplier-004', 'דפוס המרכז', 'center@print.co.il', '$2b$10$hashedpassword', 'supplier', 'active', '03-5551004', 'דפוס המרכז', 1004, 400, 90),
('supplier-005', 'קולור פרינט', 'color@print.co.il', '$2b$10$hashedpassword', 'supplier', 'active', '03-5551005', 'קולור פרינט', 1005, 360, 80),
('supplier-006', 'דפוס הצפון', 'north@print.co.il', '$2b$10$hashedpassword', 'supplier', 'active', '04-5551006', 'דפוס הצפון בע"מ', 1006, 340, 75),
('supplier-007', 'פרינט מאסטר', 'master@print.co.il', '$2b$10$hashedpassword', 'supplier', 'active', '03-5551007', 'פרינט מאסטר', 1007, 410, 92),
('supplier-008', 'דפוס הדרום', 'south@print.co.il', '$2b$10$hashedpassword', 'supplier', 'active', '08-5551008', 'דפוס הדרום', 1008, 350, 78),
('supplier-009', 'הדפסות איכות', 'quality@print.co.il', '$2b$10$hashedpassword', 'supplier', 'active', '03-5551009', 'הדפסות איכות בע"מ', 1009, 430, 97),
('supplier-010', 'פרינט אקספרס', 'express@print.co.il', '$2b$10$hashedpassword', 'supplier', 'active', '03-5551010', 'פרינט אקספרס', 1010, 390, 87);

-- 5 Customers
INSERT INTO users ("openId", name, email, password, role, status, phone, "companyName", "customerNumber")
VALUES 
('customer-001', 'יוסי כהן', 'yossi@company.co.il', '$2b$10$hashedpassword', 'customer', 'active', '052-1111111', 'חברת יוסי בע"מ', 2001),
('customer-002', 'רונית לוי', 'ronit@business.co.il', '$2b$10$hashedpassword', 'customer', 'active', '052-2222222', 'עסקי רונית', 2002),
('customer-003', 'דני אברהם', 'dani@corp.co.il', '$2b$10$hashedpassword', 'customer', 'active', '052-3333333', 'תאגיד דני', 2003),
('customer-004', 'מיכל שרון', 'michal@startup.co.il', '$2b$10$hashedpassword', 'customer', 'active', '052-4444444', 'סטארטאפ מיכל', 2004),
('customer-005', 'אבי גולד', 'avi@gold.co.il', '$2b$10$hashedpassword', 'customer', 'active', '052-5555555', 'גולד הפקות', 2005);

-- Categories
INSERT INTO categories (name, description, icon, "displayOrder", "isActive")
VALUES 
('כרטיסי ביקור', 'כרטיסי ביקור במגוון גדלים וחומרים', 'CreditCard', 1, true),
('פליירים', 'פליירים ועלונים', 'FileText', 2, true),
('ברושורים', 'ברושורים ומגזינים', 'BookOpen', 3, true),
('באנרים', 'באנרים ושלטים', 'Flag', 4, true),
('מדבקות', 'מדבקות בכל הגדלים', 'Tag', 5, true);

-- Products
INSERT INTO base_products (name, description, "productNumber", category, "categoryId", "isActive")
VALUES 
('כרטיס ביקור סטנדרטי', 'כרטיס ביקור 9x5 ס"מ על נייר 350 גרם', 101, 'כרטיסי ביקור', 1, true),
('פלייר A5', 'פלייר חד צדדי A5 על נייר 170 גרם', 102, 'פליירים', 2, true),
('פלייר A4', 'פלייר חד צדדי A4 על נייר 170 גרם', 103, 'פליירים', 2, true),
('ברושור מקופל', 'ברושור A4 מקופל ל-3', 104, 'ברושורים', 3, true),
('באנר רול-אפ', 'באנר רול-אפ 80x200 ס"מ', 105, 'באנרים', 4, true);

-- Product Sizes
INSERT INTO product_sizes (product_id, name, dimensions, base_price, display_order, is_active)
VALUES 
-- כרטיס ביקור
(1, 'סטנדרטי', '9x5 ס"מ', 0.50, 1, true),
(1, 'מרובע', '5.5x5.5 ס"מ', 0.55, 2, true),
-- פלייר A5
(2, 'A5', '14.8x21 ס"מ', 0.80, 1, true),
-- פלייר A4
(3, 'A4', '21x29.7 ס"מ', 1.20, 1, true),
-- ברושור
(4, 'A4 מקופל', '21x29.7 ס"מ', 2.50, 1, true),
-- באנר
(5, '80x200', '80x200 ס"מ', 150.00, 1, true),
(5, '100x200', '100x200 ס"מ', 180.00, 2, true);

-- Size Quantities (מחירים לכל שילוב גודל+כמות)
INSERT INTO size_quantities (size_id, quantity, price, display_order, is_active)
VALUES 
-- כרטיס ביקור סטנדרטי
(1, 100, 80.00, 1, true),
(1, 250, 150.00, 2, true),
(1, 500, 250.00, 3, true),
(1, 1000, 400.00, 4, true),
-- כרטיס ביקור מרובע
(2, 100, 90.00, 1, true),
(2, 250, 170.00, 2, true),
(2, 500, 280.00, 3, true),
-- פלייר A5
(3, 100, 120.00, 1, true),
(3, 250, 220.00, 2, true),
(3, 500, 350.00, 3, true),
(3, 1000, 550.00, 4, true),
-- פלייר A4
(4, 100, 180.00, 1, true),
(4, 250, 320.00, 2, true),
(4, 500, 500.00, 3, true),
-- ברושור
(5, 100, 350.00, 1, true),
(5, 250, 650.00, 2, true),
(5, 500, 1100.00, 3, true),
-- באנר 80x200
(6, 1, 150.00, 1, true),
(6, 2, 280.00, 2, true),
(6, 5, 650.00, 3, true),
-- באנר 100x200
(7, 1, 180.00, 1, true),
(7, 2, 340.00, 2, true);

-- Supplier Prices (מחירי ספקים)
INSERT INTO supplier_prices ("supplierId", "sizeQuantityId", "pricePerUnit", "deliveryDays", "qualityRating", "isPreferred")
VALUES 
-- ספק 4 (דפוס אלון) - מחירים לכרטיסי ביקור
(4, 1, 60.00, 3, 4.5, true),
(4, 2, 120.00, 3, 4.5, true),
(4, 3, 200.00, 3, 4.5, true),
(4, 4, 320.00, 3, 4.5, true),
-- ספק 5 (הדפסות גולן)
(5, 1, 65.00, 2, 4.3, false),
(5, 2, 125.00, 2, 4.3, false),
(5, 3, 210.00, 2, 4.3, false),
-- ספק 6 (פרינט פלוס)
(6, 1, 55.00, 4, 4.0, false),
(6, 2, 110.00, 4, 4.0, false),
-- ספק 7 (דפוס המרכז)
(7, 8, 90.00, 3, 4.4, true),
(7, 9, 170.00, 3, 4.4, true),
(7, 10, 280.00, 3, 4.4, true),
-- ספק 8 (קולור פרינט)
(8, 12, 140.00, 2, 4.2, false),
(8, 13, 260.00, 2, 4.2, false),
-- ספק 9 (דפוס הצפון)
(9, 15, 280.00, 4, 4.1, false),
(9, 16, 520.00, 4, 4.1, false),
-- ספק 10 (פרינט מאסטר) - באנרים
(10, 18, 120.00, 2, 4.6, true),
(10, 19, 230.00, 2, 4.6, true),
(10, 20, 530.00, 2, 4.6, true);

-- Quotes (הצעות מחיר)
INSERT INTO quotes ("customerId", "employeeId", status, version, "quoteNumber", "finalValue")
VALUES 
(14, 2, 'in_production', 1, 1001, 400.00),
(15, 2, 'in_production', 1, 1002, 550.00),
(16, 2, 'in_production', 1, 1003, 650.00),
(17, 2, 'in_production', 1, 1004, 350.00),
(18, 2, 'in_production', 1, 1005, 280.00),
(14, 2, 'in_production', 1, 1006, 1100.00),
(15, 2, 'in_production', 1, 1007, 150.00),
(16, 2, 'in_production', 1, 1008, 180.00),
(17, 2, 'in_production', 1, 1009, 320.00),
(18, 2, 'in_production', 1, 1010, 250.00);

-- Quote Items
INSERT INTO quote_items ("quoteId", "sizeQuantityId", quantity, "priceAtTimeOfQuote", "supplierId", "supplierCost", "deliveryDays")
VALUES 
(1, 4, 1000, 400.00, 4, 320.00, 3),
(2, 11, 1000, 550.00, 7, 440.00, 3),
(3, 16, 250, 650.00, 9, 520.00, 4),
(4, 15, 100, 350.00, 9, 280.00, 4),
(5, 7, 500, 280.00, 6, 220.00, 4),
(6, 17, 500, 1100.00, 9, 880.00, 4),
(7, 18, 1, 150.00, 10, 120.00, 2),
(8, 21, 1, 180.00, 10, 145.00, 2),
(9, 13, 250, 320.00, 8, 260.00, 2),
(10, 3, 500, 250.00, 4, 200.00, 3);

-- Supplier Jobs - 10 עבודות בשלבים שונים
-- שלב pending (2)
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "quoteItemId", "sizeQuantityId", quantity, "pricePerUnit", status, "supplierMarkedReady", "createdAt")
VALUES 
(4, 14, 1, 1, 4, 1000, 0.32, 'pending', false, NOW() - INTERVAL '2 days'),
(7, 15, 2, 2, 11, 1000, 0.44, 'pending', false, NOW() - INTERVAL '1 day');

-- שלב in_progress (3)
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "quoteItemId", "sizeQuantityId", quantity, "pricePerUnit", status, "supplierMarkedReady", "createdAt")
VALUES 
(9, 16, 3, 3, 16, 250, 2.08, 'in_progress', false, NOW() - INTERVAL '3 days'),
(9, 17, 4, 4, 15, 100, 2.80, 'in_progress', false, NOW() - INTERVAL '2 days'),
(6, 18, 5, 5, 7, 500, 0.44, 'in_progress', false, NOW() - INTERVAL '4 days');

-- שלב ready (מוכן לאיסוף - 2 עבודות)
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "quoteItemId", "sizeQuantityId", quantity, "pricePerUnit", status, "supplierMarkedReady", "supplierReadyAt", "createdAt")
VALUES 
(9, 14, 6, 6, 17, 500, 1.76, 'ready', true, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '5 days'),
(10, 15, 7, 7, 18, 1, 120.00, 'ready', true, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '3 days');

-- שלב picked_up (נאסף - 1)
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "quoteItemId", "sizeQuantityId", quantity, "pricePerUnit", status, "supplierMarkedReady", "supplierReadyAt", "courierConfirmedReady", "createdAt")
VALUES 
(10, 16, 8, 8, 21, 1, 145.00, 'picked_up', true, NOW() - INTERVAL '1 day', true, NOW() - INTERVAL '4 days');

-- שלב delivered (הושלם - 2 להיסטוריה)
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "quoteItemId", "sizeQuantityId", quantity, "pricePerUnit", status, "supplierMarkedReady", "supplierReadyAt", "courierConfirmedReady", "supplierRating", "createdAt")
VALUES 
(8, 17, 9, 9, 13, 250, 1.04, 'delivered', true, NOW() - INTERVAL '3 days', true, 4.5, NOW() - INTERVAL '7 days'),
(4, 18, 10, 10, 3, 500, 0.40, 'delivered', true, NOW() - INTERVAL '2 days', true, 5.0, NOW() - INTERVAL '6 days');

-- Historical jobs for supplier ratings (עבודות היסטוריות לדירוג)
INSERT INTO supplier_jobs ("supplierId", "customerId", "quoteId", "sizeQuantityId", quantity, "pricePerUnit", status, "supplierMarkedReady", "supplierRating", "createdAt")
VALUES 
-- ספק 4 - 20 עבודות היסטוריות
(4, 14, NULL, 1, 100, 0.60, 'delivered', true, 4.5, NOW() - INTERVAL '30 days'),
(4, 15, NULL, 2, 250, 0.48, 'delivered', true, 5.0, NOW() - INTERVAL '28 days'),
(4, 16, NULL, 3, 500, 0.40, 'delivered', true, 4.0, NOW() - INTERVAL '25 days'),
(4, 17, NULL, 4, 1000, 0.32, 'delivered', true, 4.5, NOW() - INTERVAL '22 days'),
(4, 18, NULL, 1, 100, 0.60, 'delivered', true, 5.0, NOW() - INTERVAL '20 days'),
-- ספק 5 - 15 עבודות
(5, 14, NULL, 1, 100, 0.65, 'delivered', true, 4.0, NOW() - INTERVAL '29 days'),
(5, 15, NULL, 2, 250, 0.50, 'delivered', true, 4.5, NOW() - INTERVAL '27 days'),
(5, 16, NULL, 3, 500, 0.42, 'delivered', true, 4.5, NOW() - INTERVAL '24 days'),
-- ספק 6 - 12 עבודות
(6, 17, NULL, 1, 100, 0.55, 'delivered', true, 4.0, NOW() - INTERVAL '26 days'),
(6, 18, NULL, 2, 250, 0.44, 'delivered', true, 4.0, NOW() - INTERVAL '23 days'),
-- ספק 7 - 18 עבודות
(7, 14, NULL, 8, 100, 0.90, 'delivered', true, 4.5, NOW() - INTERVAL '28 days'),
(7, 15, NULL, 9, 250, 0.68, 'delivered', true, 4.0, NOW() - INTERVAL '25 days'),
(7, 16, NULL, 10, 500, 0.56, 'delivered', true, 5.0, NOW() - INTERVAL '22 days'),
-- ספק 8 - 14 עבודות
(8, 17, NULL, 12, 100, 1.40, 'delivered', true, 4.0, NOW() - INTERVAL '27 days'),
(8, 18, NULL, 13, 250, 1.04, 'delivered', true, 4.5, NOW() - INTERVAL '24 days'),
-- ספק 9 - 16 עבודות
(9, 14, NULL, 15, 100, 2.80, 'delivered', true, 4.0, NOW() - INTERVAL '26 days'),
(9, 15, NULL, 16, 250, 2.08, 'delivered', true, 4.5, NOW() - INTERVAL '23 days'),
-- ספק 10 - 20 עבודות
(10, 16, NULL, 18, 1, 120.00, 'delivered', true, 5.0, NOW() - INTERVAL '25 days'),
(10, 17, NULL, 19, 2, 115.00, 'delivered', true, 4.5, NOW() - INTERVAL '22 days'),
(10, 18, NULL, 20, 5, 106.00, 'delivered', true, 5.0, NOW() - INTERVAL '20 days');

-- Default pricelist
INSERT INTO pricelists (name, description, "isDefault", "isActive")
VALUES ('מחירון בסיסי', 'מחירון ברירת מחדל', true, true);

-- Validation profile
INSERT INTO validation_profiles (name, description, "minDpi", "requiredBleedMm", "maxFileSizeMb", "isDefault")
VALUES ('פרופיל סטנדרטי', 'פרופיל ולידציה סטנדרטי לדפוס', 300, 3, 100, true);

-- System settings
INSERT INTO system_settings (key, value, description)
VALUES 
('company_name', '"QuoteFlow"', 'שם החברה'),
('default_currency', '"ILS"', 'מטבע ברירת מחדל'),
('vat_rate', '17', 'אחוז מע"מ');

SELECT 'Database reset and seeded successfully!' as result;
SELECT 'Suppliers: ' || COUNT(*) FROM users WHERE role = 'supplier';
SELECT 'Active jobs: ' || COUNT(*) FROM supplier_jobs WHERE status NOT IN ('delivered', 'cancelled');
SELECT 'Ready for pickup: ' || COUNT(*) FROM supplier_jobs WHERE status = 'ready';
