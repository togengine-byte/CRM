/**
 * Vercel Serverless Function for Login
 * 
 * Handles POST /api/auth/login requests
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { COOKIE_NAME, ONE_YEAR_MS } from '../../shared/const';
import * as db from '../../server/db';
import { sdk } from '../../server/_core/sdk';

// Import dotenv for environment variables
import 'dotenv/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body || {};

  if (!code || code !== '1234') {
    return res.status(401).json({ error: 'Invalid code' });
  }

  try {
    // Create a test user with a fixed openId
    const openId = 'test-user-001';

    await db.upsertUser({
      openId,
      name: 'Test User',
      email: 'test@example.com',
      loginMethod: 'code',
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(openId, {
      name: 'Test User',
      expiresInMs: ONE_YEAR_MS,
    });

    // Determine if we're on HTTPS
    const isSecure = req.headers['x-forwarded-proto'] === 'https' || 
                     req.headers.host?.includes('vercel.app');

    // Set cookie
    const cookieStr = `${COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; ${isSecure ? 'Secure;' : ''} SameSite=Lax; Max-Age=${Math.floor(ONE_YEAR_MS / 1000)}`;
    res.setHeader('Set-Cookie', cookieStr);

    return res.status(200).json({ success: true, user: { openId, name: 'Test User' } });
  } catch (error) {
    console.error('[Auth] Login failed', error);
    return res.status(500).json({ error: 'Login failed' });
  }
}
