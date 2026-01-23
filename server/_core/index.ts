import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// Run database migrations
async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.log('[Migration] Skipping - no DATABASE_URL');
    return;
  }
  
  try {
    const { drizzle } = await import('drizzle-orm/neon-http');
    const { sql } = await import('drizzle-orm');
    const db = drizzle(process.env.DATABASE_URL);
    
    console.log('[Migration] Running database migrations...');
    
    // Add fileValidationWarnings column to customer_signup_requests if not exists
    try {
      await db.execute(sql`
        ALTER TABLE customer_signup_requests 
        ADD COLUMN IF NOT EXISTS "fileValidationWarnings" jsonb
      `);
      console.log('[Migration] Added fileValidationWarnings to customer_signup_requests');
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.log('[Migration] customer_signup_requests column may already exist:', e.message);
      }
    }
    
    // Add fileValidationWarnings column to supplier_jobs if not exists
    try {
      await db.execute(sql`
        ALTER TABLE supplier_jobs 
        ADD COLUMN IF NOT EXISTS "fileValidationWarnings" jsonb
      `);
      console.log('[Migration] Added fileValidationWarnings to supplier_jobs');
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.log('[Migration] supplier_jobs column may already exist:', e.message);
      }
    }
    
    console.log('[Migration] Migrations completed successfully');
  } catch (error) {
    console.error('[Migration] Error running migrations:', error);
  }
}

async function startServer() {
  // Run migrations first
  await runMigrations();
  
  // Log environment variables for debugging
  console.log('[Server] Environment variables check:');
  console.log('[Server] JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
  console.log('[Server] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  console.log('[Server] NODE_ENV:', process.env.NODE_ENV);
  
  const app = express();
  const server = createServer(app);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Serve uploaded files statically
  const uploadsDir = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));
  
  // Our custom OAuth routes (login, logout, me, signup)
  // This replaces Clerk authentication with our own JWT-based system
  registerOAuthRoutes(app);
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
