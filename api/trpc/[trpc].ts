/**
 * Vercel Serverless Function for tRPC
 * 
 * This file handles all /api/trpc/* requests in a serverless environment.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../server/routers.js';
import type { ServerRequest, ServerResponse } from '../../server/_core/context.js';
import { sdk } from '../../server/_core/sdk.js';

// Import dotenv for environment variables
import 'dotenv/config';

/**
 * Main handler for Vercel serverless function
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get origin from request for CORS
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ].filter(Boolean);
  
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
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

    // Create serverless-compatible request/response objects
    const serverReq: ServerRequest = {
      headers: req.headers as Record<string, string | string[] | undefined>,
      cookies: req.cookies,
      protocol: req.headers['x-forwarded-proto'] as string || 'https',
    };

    const serverRes: ServerResponse = {
      setHeader: (name: string, value: string | string[]) => res.setHeader(name, value),
    };

    // Use fetch adapter for serverless compatibility
    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: fetchRequest,
      router: appRouter,
      createContext: async () => {
        let user = null;
        try {
          user = await sdk.authenticateRequest(serverReq);
        } catch {
          user = null;
        }
        return { req: serverReq, res: serverRes, user };
      },
      onError: ({ error, path }) => {
        console.error(`[tRPC] Error in ${path}:`, error);
      },
    });

    // Copy response headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
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
