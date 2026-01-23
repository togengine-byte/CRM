/**
 * Vercel Serverless Function for Getting Current User
 * 
 * Handles GET /api/auth/me requests
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { COOKIE_NAME } from '../../shared/const.js';
import * as db from '../../server/db.js';
import { sdk } from '../../server/_core/sdk.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get origin for CORS
  const origin = req.headers.origin || '*';
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session token from cookie
    const cookies = req.headers.cookie || '';
    const cookieMatch = cookies.split(';').find(c => c.trim().startsWith(`${COOKIE_NAME}=`));
    
    if (!cookieMatch) {
      return res.status(401).json({ error: 'No session found' });
    }

    const sessionToken = cookieMatch.split('=')[1];

    // Verify session token and get user
    const sessionData = await sdk.verifySessionToken(sessionToken);
    
    if (!sessionData) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get user from database
    const user = await db.getUserByOpenId(sessionData.openId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check user status
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'User account is not active' });
    }

    // Return user data
    return res.status(200).json({
      id: user.id,
      openId: user.openId,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      status: user.status,
    });
  } catch (error) {
    console.error('[Auth] Get user failed:', error);
    return res.status(401).json({ 
      error: 'Failed to get user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
