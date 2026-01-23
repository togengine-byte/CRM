/**
 * Vercel Serverless Function for Developer Logging
 * 
 * Handles POST /api/admin/log-event requests
 * Logs events for debugging and monitoring
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/node-postgres';
import { developerLogs } from '../../drizzle/schema';
import 'dotenv/config';

async function getDb() {
  if (!process.env.DATABASE_URL) {
    console.error('[Logger] DATABASE_URL not set');
    return null;
  }
  
  try {
    return drizzle(process.env.DATABASE_URL);
  } catch (error) {
    console.error('[Logger] Failed to connect to database:', error);
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
    const { 
      userId, 
      level = 'info', 
      category, 
      action, 
      message, 
      details = {}, 
      stackTrace,
      url,
      userAgent 
    } = req.body || {};

    // Validate required fields
    if (!category || !action) {
      return res.status(400).json({ error: 'category and action are required' });
    }

    // Get IP address
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                     (req.socket?.remoteAddress) || 
                     'unknown';

    // Connect to database
    const db = await getDb();
    if (!db) {
      // Still return 200 to not break client
      console.error('[Logger] Could not log event - database unavailable');
      return res.status(200).json({ success: false, message: 'Database unavailable' });
    }

    // Insert log
    await db.insert(developerLogs).values({
      userId: userId || null,
      level,
      category,
      action,
      message: message || null,
      details: details || {},
      stackTrace: stackTrace || null,
      url: url || null,
      userAgent: userAgent || null,
      ipAddress,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Logger] Failed to log event:', error);
    // Still return 200 to not break client
    return res.status(200).json({ success: false, message: 'Failed to log event' });
  }
}
