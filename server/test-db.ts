import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../drizzle/schema";

// Type for database with schema
type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let db: DrizzleDb | null = null;

/**
 * Initialize PostgreSQL database for testing
 * Connects to the real production database
 */
export async function initializeTestDb(): Promise<DrizzleDb> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required for testing");
  }

  console.log("[Test DB] Connecting to PostgreSQL database...");
  
  // Add SSL support for Render PostgreSQL
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString.includes('sslmode=')) {
    connectionString += connectionString.includes('?') ? '&sslmode=require' : '?sslmode=require';
  }
  
  // Create drizzle instance with schema for query API support
  db = drizzle(connectionString, { schema });
  
  // Verify connection with a simple query
  try {
    const result = await db.query.users.findFirst();
    console.log("[Test DB] PostgreSQL connection verified successfully");
  } catch (error) {
    console.error("[Test DB] PostgreSQL connection failed:", error);
    throw error;
  }
  
  return db;
}

/**
 * Get the test database instance
 */
export function getTestDb(): DrizzleDb {
  if (!db) {
    throw new Error("Test database not initialized. Call initializeTestDb() first.");
  }
  return db;
}

/**
 * Check if we're using PostgreSQL (always true now)
 */
export function isUsingPostgres(): boolean {
  return true;
}

/**
 * Cleanup function for tests (no-op - we don't modify production data)
 */
export async function cleanupTestDb(): Promise<void> {
  console.log("[Test DB] Cleanup completed (read-only mode)");
}

/**
 * Close database connection
 */
export async function closeTestDb(): Promise<void> {
  db = null;
  console.log("[Test DB] Database connection closed");
}
