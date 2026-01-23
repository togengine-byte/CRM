/**
 * Vercel Serverless Function for Customer Signup with Files
 * 
 * Handles POST /api/customers/signup-with-files requests
 * Creates a new customer signup request with uploaded files
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../../server/db';
import 'dotenv/config';

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
    // Parse JSON body
    const { name, email, phone, companyName, description, productId } = req.body || {};

    // Validate input
    if (!name || !email) {
      return res.status(400).json({ error: 'שם ואימייל נדרשים' });
    }

    // Create customer signup request
    const requestId = uuidv4();
    
    const signupRequest = await db.createCustomerSignupRequest({
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      companyName: companyName || null,
      description: description || '',
      requestId,
      files: [],
      productId: productId ? parseInt(productId) : null,
    });

    return res.status(200).json({
      success: true,
      message: 'הבקשה נקלטה בהצלחה',
      requestId: signupRequest.id,
      queueNumber: signupRequest.queueNumber,
      status: 'pending',
    });
  } catch (error) {
    console.error('[Customers] Signup failed:', error);
    return res.status(500).json({
      error: 'שגיאה בעיבוד הבקשה',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
