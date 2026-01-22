import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { createServer } from 'http';

// Import your server setup
import '../server/_core/index';

const app = express();

export default async (req: VercelRequest, res: VercelResponse) => {
  // This is a simple proxy to handle all requests
  // In production, you would want to properly initialize your Express app here
  
  // For now, return a simple message
  res.status(200).json({
    message: 'QuoteFlow API is running',
    timestamp: new Date().toISOString(),
  });
};
