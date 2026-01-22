/**
 * Vercel Serverless Function for Login
 * 
 * Handles POST /api/auth/login requests with email and password
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { COOKIE_NAME, ONE_YEAR_MS } from '../../shared/const.js';
import * as db from '../../server/db.js';
import { sdk } from '../../server/_core/sdk.js';
import bcrypt from 'bcryptjs';

// Import dotenv for environment variables
import 'dotenv/config';

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
    const { email, password } = req.body || {};

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'נדרש אימייל וסיסמה' });
    }

    // Find user by email
    const user = await db.getUserByEmail(email.toLowerCase());
    
    if (!user) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }

    // Check if user has a password set
    if (!user.password) {
      return res.status(401).json({ error: 'משתמש זה לא הגדיר סיסמה. נסה להתחבר עם Google.' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }

    // Check user status
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'החשבון שלך אינו פעיל. פנה למנהל המערכת.' });
    }

    // Update last signed in
    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: new Date(),
    });

    // Create session token
    const sessionToken = await sdk.createSessionToken(user.openId, {
      name: user.name || 'User',
      expiresInMs: ONE_YEAR_MS,
    });

    // Determine if we're on HTTPS
    const isSecure = req.headers['x-forwarded-proto'] === 'https' || 
                     req.headers.host?.includes('vercel.app');

    // Set cookie with proper formatting for serverless
    const cookieStr = `${COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; ${isSecure ? 'Secure;' : ''} SameSite=Lax; Max-Age=${Math.floor(ONE_YEAR_MS / 1000)}`;
    res.setHeader('Set-Cookie', cookieStr);

    return res.status(200).json({ 
      success: true, 
      user: { 
        openId: user.openId, 
        name: user.name,
        email: user.email,
        role: user.role
      } 
    });
  } catch (error) {
    console.error('[Auth] Login failed', error);
    return res.status(500).json({ 
      error: 'התחברות נכשלה',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
