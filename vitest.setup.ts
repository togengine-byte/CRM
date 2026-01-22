/**
 * Vitest Global Setup
 * 
 * This file contains global setup for all tests.
 * It runs before any test file is executed.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Log test environment info
console.log('[Vitest Setup] Test environment initialized');
console.log(`[Vitest Setup] USE_REAL_DB: ${process.env.USE_REAL_DB || 'false'}`);
console.log(`[Vitest Setup] DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'not set'}`);
