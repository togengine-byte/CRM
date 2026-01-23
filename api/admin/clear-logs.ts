/**
 * Vercel Serverless Function for Clearing Developer Logs
 * 
 * Handles POST /api/admin/clear-logs requests
 * Deletes all logs from the developer_logs table
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/node-postgres';
import { developerLogs } from '../../drizzle/schema';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

async function getDb() {
  if (!process.env.DATABASE_URL) {
    console.error('[ClearLogs] DATABASE_URL not set');
    return null;
  }
  
  try {
    return drizzle(process.env.DATABASE_URL);
  } catch (error) {
    console.error('[ClearLogs] Failed to connect to database:', error);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if user is admin (basic check - in production, verify JWT token)
    const { confirmDelete } = req.body || {};

    if (!confirmDelete) {
      return res.status(400).json({ error: 'Confirmation required' });
    }

    // Connect to database
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database unavailable' });
    }

    // Delete all logs
    const result = await db.delete(developerLogs);

    console.log('[ClearLogs] All developer logs cleared');

    return res.status(200).json({ 
      success: true, 
      message: 'כל הלוגים נמחקו בהצלחה'
    });
  } catch (error) {
    console.error('[ClearLogs] Failed to clear logs:', error);
    return res.status(500).json({
      error: 'שגיאה בניקוי הלוגים',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
