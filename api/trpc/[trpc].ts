/**
 * Vercel Serverless Function for tRPC
 * 
 * This file handles all /api/trpc/* requests in a serverless environment.
 * It wraps the existing tRPC router without modifying any business logic.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../server/routers';
import type { TrpcContext } from '../../server/_core/context';
import { sdk } from '../../server/_core/sdk';
import type { User } from '../../drizzle/schema';

// Import dotenv for environment variables
import 'dotenv/config';

/**
 * Create tRPC context for serverless environment
 * Adapts the Express-based context to work with Vercel's request/response
 */
async function createServerlessContext(req: VercelRequest, res: VercelResponse): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Adapt Vercel request to Express-like request for SDK
    const expressLikeReq = {
      cookies: req.cookies || {},
      headers: req.headers,
      get: (name: string) => req.headers[name.toLowerCase()] as string | undefined,
    };
    
    user = await sdk.authenticateRequest(expressLikeReq as any);
  } catch (error) {
    // Authentication is optional for public procedures
    user = null;
  }

  // Create Express-like req/res objects for tRPC context
  const expressReq = {
    ...req,
    cookies: req.cookies || {},
    get: (name: string) => req.headers[name.toLowerCase()] as string | undefined,
  } as any;

  const expressRes = {
    ...res,
    cookie: (name: string, value: string, options: any) => {
      const cookieStr = `${name}=${value}; Path=${options.path || '/'}; ${options.httpOnly ? 'HttpOnly;' : ''} ${options.secure ? 'Secure;' : ''} SameSite=${options.sameSite || 'Lax'}; Max-Age=${Math.floor((options.maxAge || 0) / 1000)}`;
      res.setHeader('Set-Cookie', cookieStr);
    },
    clearCookie: (name: string, options: any) => {
      const cookieStr = `${name}=; Path=${options.path || '/'}; Max-Age=0`;
      res.setHeader('Set-Cookie', cookieStr);
    },
  } as any;

  return {
    req: expressReq,
    res: expressRes,
    user,
  };
}

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

  // Extract the tRPC path from the URL
  const path = req.url?.replace(/^\/api\/trpc\/?/, '') || '';

  try {
    // Create context for this request
    const ctx = await createServerlessContext(req, res);

    // Use fetch adapter for better serverless compatibility
    const url = new URL(req.url || '/', `https://${req.headers.host}`);
    
    // Create a fetch-compatible request
    const fetchRequest = new Request(url.toString(), {
      method: req.method,
      headers: new Headers(req.headers as Record<string, string>),
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: fetchRequest,
      router: appRouter,
      createContext: () => ctx,
    });

    // Copy response headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Send response
    const body = await response.text();
    return res.status(response.status).send(body);
  } catch (error) {
    console.error('[tRPC Handler Error]', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
