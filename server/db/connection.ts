/**
 * Database Connection Module
 * 
 * Provides centralized database connection management and error handling utilities.
 * All other db modules import from here for consistent database access.
 */

import { drizzle } from "drizzle-orm/node-postgres";

// Re-export commonly used drizzle-orm operators for convenience
export { 
  eq, desc, sql, and, count, inArray, like, gte, lte, or, sum, 
  isNull, isNotNull, ne, asc, ilike 
} from "drizzle-orm";
export type { SQL } from "drizzle-orm";

// Database type for use across modules
export type DbClient = ReturnType<typeof drizzle>;

// Singleton database instance
let _db: DbClient | null = null;

/**
 * Get the database connection instance (singleton pattern)
 * Creates connection on first call, reuses on subsequent calls
 */
export async function getDb(): Promise<DbClient | null> {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Custom error for database unavailability
 * Thrown by write operations when database is not connected
 */
export class DatabaseNotAvailableError extends Error {
  constructor(functionName: string) {
    super(`Database not available in ${functionName}`);
    this.name = 'DatabaseNotAvailableError';
  }
}

/**
 * Type guard for read operations
 * Returns false if database is unavailable (allows graceful degradation)
 * 
 * @example
 * const db = await getDb();
 * if (!checkDbForRead(db, 'getCustomers')) return [];
 * // db is now typed as non-null
 */
export function checkDbForRead(db: DbClient | null, functionName: string): db is DbClient {
  if (!db) {
    console.warn(`[${functionName}] Database not available - returning empty result`);
    return false;
  }
  return true;
}

/**
 * Assertion for write operations
 * Throws DatabaseNotAvailableError if database is unavailable
 * 
 * @example
 * const db = await getDb();
 * requireDbForWrite(db, 'createCustomer');
 * // db is now typed as non-null, or function has thrown
 */
export function requireDbForWrite(db: DbClient | null, functionName: string): asserts db is DbClient {
  if (!db) {
    console.error(`[${functionName}] Database not available - operation cannot proceed`);
    throw new DatabaseNotAvailableError(functionName);
  }
}
