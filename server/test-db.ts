import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as schema from "../drizzle/schema";

// Type for database
type DrizzleDb = ReturnType<typeof drizzlePg>;

let db: DrizzleDb | null = null;
let isPostgres = false;

/**
 * Check if we should use real PostgreSQL database
 */
function shouldUseRealDb(): boolean {
  return process.env.USE_REAL_DB === "true" && !!process.env.DATABASE_URL;
}

/**
 * Initialize database for testing
 * Uses PostgreSQL when USE_REAL_DB=true and DATABASE_URL is set
 */
export async function initializeTestDb() {
  if (shouldUseRealDb()) {
    return initializePostgresDb();
  }
  // For local development without PostgreSQL, use mock data
  return initializeMockDb();
}

/**
 * Initialize PostgreSQL database for testing
 */
async function initializePostgresDb() {
  console.log("[Test DB] Using PostgreSQL database");
  isPostgres = true;
  
  const pgDb = drizzlePg(process.env.DATABASE_URL!, { schema });
  db = pgDb;
  
  // Clean existing test data and insert fresh sample data
  await cleanAndSeedPostgres(pgDb);
  
  return db;
}

/**
 * Initialize mock database for local testing (no real DB connection)
 */
function initializeMockDb() {
  console.log("[Test DB] Using mock database (no real DB connection)");
  isPostgres = false;
  
  // Create a mock db object that returns sample data
  const mockDb = createMockDb();
  db = mockDb as unknown as DrizzleDb;
  
  return db;
}

/**
 * Create mock database with sample data
 */
function createMockDb() {
  const sampleUsers = [
    { id: 1, openId: "admin_1234", name: "מנהל ראשי", email: "admin@crm.com", role: "admin", status: "active", phone: "050-1234567", companyName: "CRM Company", address: "תל אביב, ישראל", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    // Employees
    { id: 2, openId: "emp_001", name: "יוסי כהן", email: "yossi@crm.com", role: "employee", status: "active", phone: "050-0011111", companyName: null, address: null, totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 3, openId: "emp_002", name: "שרה לוי", email: "sara@crm.com", role: "employee", status: "active", phone: "050-0021111", companyName: null, address: null, totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 4, openId: "emp_003", name: "דוד ישראלי", email: "david@crm.com", role: "employee", status: "active", phone: "050-0031111", companyName: null, address: null, totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 5, openId: "emp_004", name: "רחל אברהם", email: "rachel@crm.com", role: "employee", status: "active", phone: "050-0041111", companyName: null, address: null, totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 6, openId: "emp_005", name: "משה גולן", email: "moshe@crm.com", role: "employee", status: "active", phone: "050-0051111", companyName: null, address: null, totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    // Active Customers
    { id: 7, openId: "cust_001", name: 'חברת אלפא בע"מ', email: "alpha@company.com", role: "customer", status: "active", phone: "03-0014567", companyName: "חברת אלפא", address: "רחוב הרצל 1, תל אביב", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 8, openId: "cust_002", name: "בטא תעשיות", email: "beta@company.com", role: "customer", status: "active", phone: "03-0024567", companyName: "בטא תעשיות", address: "רחוב ויצמן 15, רמת גן", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 9, openId: "cust_003", name: "גמא שירותים", email: "gamma@company.com", role: "customer", status: "active", phone: "03-0034567", companyName: "גמא שירותים", address: "רחוב בן גוריון 8, הרצליה", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 10, openId: "cust_004", name: "דלתא מסחר", email: "delta@company.com", role: "customer", status: "active", phone: "03-0044567", companyName: "דלתא מסחר", address: "רחוב רוטשילד 22, תל אביב", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 11, openId: "cust_005", name: "אפסילון טכנולוגיות", email: "epsilon@company.com", role: "customer", status: "active", phone: "03-0054567", companyName: "אפסילון טכנולוגיות", address: "רחוב הברזל 3, רמת החייל", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    // Pending Customers
    { id: 12, openId: "pending_001", name: "לקוח ממתין 1", email: "pending1@company.com", role: "customer", status: "pending_approval", phone: "03-0016666", companyName: "חברה ממתינה 1", address: "כתובת 1", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 13, openId: "pending_002", name: "לקוח ממתין 2", email: "pending2@company.com", role: "customer", status: "pending_approval", phone: "03-0026666", companyName: "חברה ממתינה 2", address: "כתובת 2", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 14, openId: "pending_003", name: "לקוח ממתין 3", email: "pending3@company.com", role: "customer", status: "pending_approval", phone: "03-0036666", companyName: "חברה ממתינה 3", address: "כתובת 3", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 15, openId: "pending_004", name: "לקוח ממתין 4", email: "pending4@company.com", role: "customer", status: "pending_approval", phone: "03-0046666", companyName: "חברה ממתינה 4", address: "כתובת 4", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 16, openId: "pending_005", name: "לקוח ממתין 5", email: "pending5@company.com", role: "customer", status: "pending_approval", phone: "03-0056666", companyName: "חברה ממתינה 5", address: "כתובת 5", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    // Suppliers
    { id: 17, openId: "supp_001", name: "ספק דפוס מקצועי", email: "supplier1@print.com", role: "supplier", status: "active", phone: "04-0011111", companyName: 'דפוס מקצועי בע"מ', address: "אזור תעשייה חיפה", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 18, openId: "supp_002", name: "ספק נייר איכותי", email: "supplier2@paper.com", role: "supplier", status: "active", phone: "04-0021111", companyName: 'נייר איכותי בע"מ', address: "אזור תעשייה נתניה", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 19, openId: "supp_003", name: "ספק אריזות", email: "supplier3@pack.com", role: "supplier", status: "active", phone: "04-0031111", companyName: "אריזות ישראל", address: "אזור תעשייה אשדוד", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 20, openId: "supp_004", name: "ספק הדפסה דיגיטלית", email: "supplier4@digital.com", role: "supplier", status: "active", phone: "04-0041111", companyName: "דיגיטל פרינט", address: "אזור תעשייה ראשון", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 21, openId: "supp_005", name: "ספק חומרי גלם", email: "supplier5@raw.com", role: "supplier", status: "active", phone: "04-0051111", companyName: 'חומרי גלם בע"מ', address: "אזור תעשייה באר שבע", totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    // Couriers
    { id: 22, openId: "courier_001", name: "שליח 1 - צפון", email: "courier1@delivery.com", role: "courier", status: "active", phone: "052-0011111", companyName: null, address: null, totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 23, openId: "courier_002", name: "שליח 2 - מרכז", email: "courier2@delivery.com", role: "courier", status: "active", phone: "052-0021111", companyName: null, address: null, totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 24, openId: "courier_003", name: "שליח 3 - דרום", email: "courier3@delivery.com", role: "courier", status: "active", phone: "052-0031111", companyName: null, address: null, totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 25, openId: "courier_004", name: "שליח 4 - שרון", email: "courier4@delivery.com", role: "courier", status: "active", phone: "052-0041111", companyName: null, address: null, totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 26, openId: "courier_005", name: "שליח 5 - ירושלים", email: "courier5@delivery.com", role: "courier", status: "active", phone: "052-0051111", companyName: null, address: null, totalRatingPoints: 0, ratedDealsCount: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  ];

  const sampleProducts = [
    { id: 1, name: "כרטיסי ביקור", description: "כרטיסי ביקור מקצועיים בגדלים שונים", category: "כרטיסים", isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "פליירים", description: "פליירים פרסומיים בגדלים A4, A5, A6", category: "פרסום", isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 3, name: "ברושורים", description: "ברושורים מקופלים בעיצובים שונים", category: "פרסום", isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 4, name: "פוסטרים", description: "פוסטרים בגדלים שונים להדפסה", category: "שילוט", isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 5, name: "מעטפות", description: "מעטפות ממותגות בגדלים שונים", category: "משרדי", isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ];

  const samplePricelists = [
    { id: 1, name: "מחירון בסיסי", description: "מחירון ברירת מחדל לכל הלקוחות", isDefault: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "מחירון VIP", description: "מחירון מיוחד ללקוחות VIP", isDefault: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 3, name: "מחירון סיטונאי", description: "מחירון לרכישות בכמויות גדולות", isDefault: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 4, name: "מחירון עונתי", description: "מחירון מבצעים עונתיים", isDefault: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 5, name: "מחירון מיוחד", description: "מחירון להסכמים מיוחדים", isDefault: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ];

  const sampleSettings = [
    { id: 1, key: "admin_code", value: '{"code": "1234", "description": "Admin access code"}', description: "קוד גישה למנהל", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, key: "company_name", value: '{"name": "CRM Company", "nameHe": "חברת CRM"}', description: "שם החברה", createdAt: new Date(), updatedAt: new Date() },
  ];

  return {
    query: {
      users: {
        findMany: async (opts?: { limit?: number }) => {
          if (opts?.limit) return sampleUsers.slice(0, opts.limit);
          return sampleUsers;
        },
        findFirst: async (opts?: { where?: (users: any, ops: any) => any }) => {
          return sampleUsers[0];
        },
      },
      baseProducts: {
        findMany: async () => sampleProducts,
        findFirst: async () => sampleProducts[0],
      },
      pricelists: {
        findMany: async () => samplePricelists,
        findFirst: async () => samplePricelists[0],
      },
      systemSettings: {
        findMany: async () => sampleSettings,
        findFirst: async (opts?: { where?: (settings: any, ops: any) => any }) => {
          return sampleSettings[0];
        },
      },
    },
  };
}

/**
 * Clean PostgreSQL and insert sample data
 */
async function cleanAndSeedPostgres(pgDb: ReturnType<typeof drizzlePg>) {
  // Delete in correct order to respect foreign keys
  await pgDb.delete(schema.systemSettings);
  await pgDb.delete(schema.activityLog);
  await pgDb.delete(schema.internalNotes);
  await pgDb.delete(schema.supplierPrices);
  await pgDb.delete(schema.quoteFileWarnings);
  await pgDb.delete(schema.quoteAttachments);
  await pgDb.delete(schema.quoteItems);
  await pgDb.delete(schema.quotes);
  await pgDb.delete(schema.customerPricelists);
  await pgDb.delete(schema.pricelistItems);
  await pgDb.delete(schema.pricelists);
  await pgDb.delete(schema.productVariants);
  await pgDb.delete(schema.validationProfiles);
  await pgDb.delete(schema.baseProducts);
  await pgDb.delete(schema.users);
  
  // Insert sample data
  await insertPostgresSampleData(pgDb);
}

/**
 * Insert sample data into PostgreSQL
 */
async function insertPostgresSampleData(pgDb: ReturnType<typeof drizzlePg>) {
  // 1. Admin user
  await pgDb.insert(schema.users).values({
    openId: "admin_1234",
    name: "מנהל ראשי",
    email: "admin@crm.com",
    loginMethod: "password",
    role: "admin",
    status: "active",
    phone: "050-1234567",
    companyName: "CRM Company",
    address: "תל אביב, ישראל",
  });

  // 2. Employees
  const employees = [
    { openId: "emp_001", name: "יוסי כהן", email: "yossi@crm.com", phone: "050-0011111" },
    { openId: "emp_002", name: "שרה לוי", email: "sara@crm.com", phone: "050-0021111" },
    { openId: "emp_003", name: "דוד ישראלי", email: "david@crm.com", phone: "050-0031111" },
    { openId: "emp_004", name: "רחל אברהם", email: "rachel@crm.com", phone: "050-0041111" },
    { openId: "emp_005", name: "משה גולן", email: "moshe@crm.com", phone: "050-0051111" },
  ];
  
  for (const emp of employees) {
    await pgDb.insert(schema.users).values({
      ...emp,
      role: "employee",
      status: "active",
    });
  }

  // 3. Active Customers
  const customers = [
    { openId: "cust_001", name: 'חברת אלפא בע"מ', email: "alpha@company.com", companyName: "חברת אלפא", address: "רחוב הרצל 1, תל אביב", phone: "03-0014567" },
    { openId: "cust_002", name: "בטא תעשיות", email: "beta@company.com", companyName: "בטא תעשיות", address: "רחוב ויצמן 15, רמת גן", phone: "03-0024567" },
    { openId: "cust_003", name: "גמא שירותים", email: "gamma@company.com", companyName: "גמא שירותים", address: "רחוב בן גוריון 8, הרצליה", phone: "03-0034567" },
    { openId: "cust_004", name: "דלתא מסחר", email: "delta@company.com", companyName: "דלתא מסחר", address: "רחוב רוטשילד 22, תל אביב", phone: "03-0044567" },
    { openId: "cust_005", name: "אפסילון טכנולוגיות", email: "epsilon@company.com", companyName: "אפסילון טכנולוגיות", address: "רחוב הברזל 3, רמת החייל", phone: "03-0054567" },
  ];
  
  for (const cust of customers) {
    await pgDb.insert(schema.users).values({
      ...cust,
      role: "customer",
      status: "active",
    });
  }

  // 4. Pending Customers
  const pending = [
    { openId: "pending_001", name: "לקוח ממתין 1", email: "pending1@company.com", companyName: "חברה ממתינה 1", address: "כתובת 1", phone: "03-0016666" },
    { openId: "pending_002", name: "לקוח ממתין 2", email: "pending2@company.com", companyName: "חברה ממתינה 2", address: "כתובת 2", phone: "03-0026666" },
    { openId: "pending_003", name: "לקוח ממתין 3", email: "pending3@company.com", companyName: "חברה ממתינה 3", address: "כתובת 3", phone: "03-0036666" },
    { openId: "pending_004", name: "לקוח ממתין 4", email: "pending4@company.com", companyName: "חברה ממתינה 4", address: "כתובת 4", phone: "03-0046666" },
    { openId: "pending_005", name: "לקוח ממתין 5", email: "pending5@company.com", companyName: "חברה ממתינה 5", address: "כתובת 5", phone: "03-0056666" },
  ];
  
  for (const p of pending) {
    await pgDb.insert(schema.users).values({
      ...p,
      role: "customer",
      status: "pending_approval",
    });
  }

  // 5. Suppliers
  const suppliers = [
    { openId: "supp_001", name: "ספק דפוס מקצועי", email: "supplier1@print.com", companyName: 'דפוס מקצועי בע"מ', address: "אזור תעשייה חיפה", phone: "04-0011111" },
    { openId: "supp_002", name: "ספק נייר איכותי", email: "supplier2@paper.com", companyName: 'נייר איכותי בע"מ', address: "אזור תעשייה נתניה", phone: "04-0021111" },
    { openId: "supp_003", name: "ספק אריזות", email: "supplier3@pack.com", companyName: "אריזות ישראל", address: "אזור תעשייה אשדוד", phone: "04-0031111" },
    { openId: "supp_004", name: "ספק הדפסה דיגיטלית", email: "supplier4@digital.com", companyName: "דיגיטל פרינט", address: "אזור תעשייה ראשון", phone: "04-0041111" },
    { openId: "supp_005", name: "ספק חומרי גלם", email: "supplier5@raw.com", companyName: 'חומרי גלם בע"מ', address: "אזור תעשייה באר שבע", phone: "04-0051111" },
  ];
  
  for (const supp of suppliers) {
    await pgDb.insert(schema.users).values({
      ...supp,
      role: "supplier",
      status: "active",
    });
  }

  // 6. Couriers
  const couriers = [
    { openId: "courier_001", name: "שליח 1 - צפון", email: "courier1@delivery.com", phone: "052-0011111" },
    { openId: "courier_002", name: "שליח 2 - מרכז", email: "courier2@delivery.com", phone: "052-0021111" },
    { openId: "courier_003", name: "שליח 3 - דרום", email: "courier3@delivery.com", phone: "052-0031111" },
    { openId: "courier_004", name: "שליח 4 - שרון", email: "courier4@delivery.com", phone: "052-0041111" },
    { openId: "courier_005", name: "שליח 5 - ירושלים", email: "courier5@delivery.com", phone: "052-0051111" },
  ];
  
  for (const courier of couriers) {
    await pgDb.insert(schema.users).values({
      ...courier,
      role: "courier",
      status: "active",
    });
  }

  // 7. Base Products
  const products = [
    { name: "כרטיסי ביקור", description: "כרטיסי ביקור מקצועיים בגדלים שונים", category: "כרטיסים" },
    { name: "פליירים", description: "פליירים פרסומיים בגדלים A4, A5, A6", category: "פרסום" },
    { name: "ברושורים", description: "ברושורים מקופלים בעיצובים שונים", category: "פרסום" },
    { name: "פוסטרים", description: "פוסטרים בגדלים שונים להדפסה", category: "שילוט" },
    { name: "מעטפות", description: "מעטפות ממותגות בגדלים שונים", category: "משרדי" },
  ];
  
  for (const prod of products) {
    await pgDb.insert(schema.baseProducts).values(prod);
  }

  // 8. Product Variants
  const variants = [
    { baseProductId: 1, sku: "BC-STD-001", name: "כרטיס ביקור סטנדרטי 9x5", attributes: { size: "9x5cm", paper: "300gsm" } },
    { baseProductId: 1, sku: "BC-PRE-002", name: "כרטיס ביקור פרימיום 9x5", attributes: { size: "9x5cm", paper: "400gsm", lamination: "matt" } },
    { baseProductId: 2, sku: "FLY-A5-001", name: "פלייר A5 חד צדדי", attributes: { size: "A5", sides: 1 } },
    { baseProductId: 3, sku: "BRO-TRI-001", name: "ברושור משולש A4", attributes: { size: "A4", folds: 2 } },
    { baseProductId: 4, sku: "POS-A2-001", name: "פוסטר A2", attributes: { size: "A2", paper: "170gsm" } },
  ];
  
  for (const variant of variants) {
    await pgDb.insert(schema.productVariants).values(variant);
  }

  // 9. Validation Profiles
  const profiles = [
    { name: "פרופיל סטנדרטי", description: "פרופיל בדיקה סטנדרטי לרוב העבודות", minDpi: 300, maxDpi: 600, isDefault: true },
    { name: "פרופיל פרימיום", description: "פרופיל בדיקה לעבודות איכותיות", minDpi: 300, maxDpi: 1200, isDefault: false },
    { name: "פרופיל שילוט", description: "פרופיל לעבודות שילוט גדולות", minDpi: 150, maxDpi: 300, isDefault: false },
    { name: "פרופיל דיגיטלי", description: "פרופיל להדפסה דיגיטלית", minDpi: 300, maxDpi: 600, isDefault: false },
    { name: "פרופיל אופסט", description: "פרופיל להדפסת אופסט", minDpi: 300, maxDpi: 600, isDefault: false },
  ];
  
  for (const profile of profiles) {
    await pgDb.insert(schema.validationProfiles).values(profile);
  }

  // 10. Pricelists
  const pricelists = [
    { name: "מחירון בסיסי", description: "מחירון ברירת מחדל לכל הלקוחות", isDefault: true, isActive: true },
    { name: "מחירון VIP", description: "מחירון מיוחד ללקוחות VIP", isDefault: false, isActive: true },
    { name: "מחירון סיטונאי", description: "מחירון לרכישות בכמויות גדולות", isDefault: false, isActive: true },
    { name: "מחירון עונתי", description: "מחירון מבצעים עונתיים", isDefault: false, isActive: true },
    { name: "מחירון מיוחד", description: "מחירון להסכמים מיוחדים", isDefault: false, isActive: true },
  ];
  
  for (const pricelist of pricelists) {
    await pgDb.insert(schema.pricelists).values(pricelist);
  }

  // 11. System Settings
  const settings = [
    { key: "admin_code", value: '{"code": "1234", "description": "Admin access code"}', description: "קוד גישה למנהל" },
    { key: "company_name", value: '{"name": "CRM Company", "nameHe": "חברת CRM"}', description: "שם החברה" },
    { key: "default_currency", value: '{"code": "ILS", "symbol": "₪"}', description: "מטבע ברירת מחדל" },
    { key: "tax_rate", value: '{"rate": 17, "name": "VAT"}', description: 'אחוז מע"מ' },
    { key: "email_notifications", value: '{"enabled": true, "types": ["quote", "order", "delivery"]}', description: "הגדרות התראות" },
  ];
  
  for (const setting of settings) {
    await pgDb.insert(schema.systemSettings).values(setting);
  }
  
  console.log("[Test DB] PostgreSQL sample data inserted successfully");
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
 * Check if using PostgreSQL
 */
export function isUsingPostgres(): boolean {
  return isPostgres;
}

/**
 * Clean up test database
 */
export function cleanupTestDb() {
  db = null;
  isPostgres = false;
}
