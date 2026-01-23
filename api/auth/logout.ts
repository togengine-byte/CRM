/**
 * Vercel Serverless Function for Logout
 * 
 * Handles POST /api/auth/logout requests
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { COOKIE_NAME } from '../../shared/const.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get origin for CORS
  const origin = req.headers.origin || '*';
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', origin);
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
    // Clear session cookie
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Auth] Logout failed:', error);
    return res.status(500).json({ 
      error: 'Logout failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
