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
 * NOTE: This does NOT modify the database - it uses existing data for read-only tests
 */
export async function initializeTestDb() {
  if (shouldUseRealDb()) {
    return initializePostgresDb();
  }
  // For local development without PostgreSQL, use mock data
  return initializeMockDb();
}

/**
 * Initialize PostgreSQL database for testing (read-only mode)
 * Does NOT clean or seed the database - uses existing production data
 */
async function initializePostgresDb() {
  console.log("[Test DB] Using PostgreSQL database (read-only mode)");
  isPostgres = true;
  
  // Add SSL support for Render PostgreSQL
  let connectionString = process.env.DATABASE_URL!;
  if (!connectionString.includes('sslmode=')) {
    connectionString += connectionString.includes('?') ? '&sslmode=require' : '?sslmode=require';
  }
  
  const pgDb = drizzlePg(connectionString, { schema });
  db = pgDb;
  
  // Verify connection by running a simple query
  try {
    const result = await pgDb.query.users.findFirst();
    console.log("[Test DB] PostgreSQL connection verified successfully");
  } catch (error) {
    console.error("[Test DB] PostgreSQL connection failed:", error);
    throw error;
  }
  
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
 * Get the test database instance
 */
export function getTestDb() {
  if (!db) {
    throw new Error("Test database not initialized. Call initializeTestDb() first.");
  }
  return db;
}

/**
 * Check if we're using PostgreSQL
 */
export function isUsingPostgres(): boolean {
  return isPostgres;
}

/**
 * Close database connection (for cleanup)
 */
export async function closeTestDb() {
  // PostgreSQL connections are managed by the pool
  // No explicit close needed for drizzle
  db = null;
  console.log("[Test DB] Database connection closed");
}
