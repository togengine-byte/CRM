/**
 * Vercel Serverless Function for tRPC
 * 
 * This file handles all /api/trpc/* requests in a serverless environment.
 * It wraps the existing tRPC router without modifying any business logic.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../server/routers';
import { createContext } from '../../server/_core/context';

// Import dotenv for environment variables
import 'dotenv/config';

/**
 * Main handler for Vercel serverless function
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  try {
    // Create a fetch-compatible request from Vercel request
    const url = new URL(req.url || '/', `https://${req.headers.host}`);
    
    // Read the body if it exists
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (typeof req.body === 'string') {
        body = req.body;
      } else if (req.body) {
        body = JSON.stringify(req.body);
      }
    }

    // Create a fetch-compatible request
    const fetchRequest = new Request(url.toString(), {
      method: req.method,
      headers: new Headers(req.headers as Record<string, string>),
      body,
    });

    // Create context with Vercel request/response
    const ctx = await createContext({
      req: req as any,
      res: res as any,
    });

    // Use fetch adapter for serverless compatibility
    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: fetchRequest,
      router: appRouter,
      createContext: () => ctx,
      onError: ({ error, path }) => {
        console.error(`[tRPC] Error in ${path}:`, error);
      },
    });

    // Copy response headers
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        // Handle multiple Set-Cookie headers
        res.setHeader(key, value);
      } else {
        res.setHeader(key, value);
      }
    });

    // Send response
    const responseBody = await response.text();
    return res.status(response.status).send(responseBody);
  } catch (error) {
    console.error('[tRPC Handler Error]', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
