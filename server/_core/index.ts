import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers/index";
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
    // @ts-ignore - pg types not needed for dynamic import
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    console.log('[Migration] Running database migrations...');
    
    // Add fileValidationWarnings column to customer_signup_requests if not exists
    try {
      await pool.query(`
        ALTER TABLE customer_signup_requests 
        ADD COLUMN IF NOT EXISTS "fileValidationWarnings" jsonb DEFAULT '[]'
      `);
      console.log('[Migration] Added fileValidationWarnings to customer_signup_requests');
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.log('[Migration] customer_signup_requests column may already exist:', e.message);
      }
    }
    
    // Add fileValidationWarnings column to supplier_jobs if not exists
    try {
      await pool.query(`
        ALTER TABLE supplier_jobs 
        ADD COLUMN IF NOT EXISTS "fileValidationWarnings" jsonb DEFAULT '[]'
      `);
      console.log('[Migration] Added fileValidationWarnings to supplier_jobs');
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.log('[Migration] supplier_jobs column may already exist:', e.message);
      }
    }
    
    // Seed suppliers with prices and job history for rating system
    await seedSuppliersData(pool);
    
    await pool.end();
    console.log('[Migration] Migrations completed successfully');
  } catch (error) {
    console.error('[Migration] Error running migrations:', error);
  }
}

// Seed suppliers with prices and historical jobs for rating system
async function seedSuppliersData(pool: any) {
  try {
    // Check if we already have suppliers
    const existingSuppliers = await pool.query(`SELECT COUNT(*) as count FROM users WHERE role = 'supplier'`);
    const supplierCount = Number(existingSuppliers.rows?.[0]?.count || 0);
    
    if (supplierCount >= 9) {
      console.log('[Seed] Suppliers already exist, skipping seed');
      return;
    }
    
    console.log('[Seed] Creating suppliers with prices and job history...');
    
    // Get categories
    const categories = await pool.query(`SELECT id, name FROM categories ORDER BY id`);
    if (!categories.rows || categories.rows.length === 0) {
      console.log('[Seed] No categories found, skipping supplier seed');
      return;
    }
    
    // Get products with sizes
    const products = await pool.query(`
      SELECT bp.id as product_id, bp.name as product_name, bp."categoryId", 
             ps.id as size_id, ps.name as size_name, ps."basePrice"
      FROM base_products bp
      LEFT JOIN product_sizes ps ON ps.product_id = bp.id AND ps.is_active = true
      WHERE bp."isActive" = true
    `);
    
    // Delete existing suppliers and related data
    console.log('[Seed] Cleaning existing supplier data...');
    await pool.query(`DELETE FROM supplier_jobs WHERE "supplierId" IN (SELECT id FROM users WHERE role = 'supplier')`);
    await pool.query(`DELETE FROM supplier_prices WHERE "supplierId" IN (SELECT id FROM users WHERE role = 'supplier')`);
    await pool.query(`DELETE FROM users WHERE role = 'supplier'`);
    
    // Supplier data per category
    const suppliersByCategory: Record<string, { name: string; company: string; priceMultiplier: number; deliveryDays: number; rating: number; reliability: number }[]> = {
      'דפוס': [
        { name: 'יוסי כהן', company: 'דפוס הצפון', priceMultiplier: 0.85, deliveryDays: 2, rating: 4.8, reliability: 95 },
        { name: 'מיכאל לוי', company: 'דפוס מהיר', priceMultiplier: 0.95, deliveryDays: 1, rating: 4.5, reliability: 90 },
        { name: 'דוד אברהם', company: 'דפוס איכות', priceMultiplier: 1.1, deliveryDays: 3, rating: 4.2, reliability: 85 },
      ],
      'רוחב': [
        { name: 'רוני שמש', company: 'רוחב השרון', priceMultiplier: 0.9, deliveryDays: 3, rating: 4.6, reliability: 92 },
        { name: 'אבי מזרחי', company: 'רוחב הגליל', priceMultiplier: 1.0, deliveryDays: 2, rating: 4.3, reliability: 88 },
        { name: 'שלמה גולדברג', company: 'רוחב הנגב', priceMultiplier: 0.8, deliveryDays: 4, rating: 4.9, reliability: 98 },
      ],
      'שילוט': [
        { name: 'יעקב פרץ', company: 'שלטים ישראל', priceMultiplier: 0.88, deliveryDays: 5, rating: 4.4, reliability: 87 },
        { name: 'נורית בן דוד', company: 'שילוט המרכז', priceMultiplier: 1.05, deliveryDays: 3, rating: 4.7, reliability: 93 },
        { name: 'אלי כהן', company: 'שלטי אלי', priceMultiplier: 0.92, deliveryDays: 4, rating: 4.1, reliability: 82 },
      ],
      'מוצרי פרסום': [
        { name: 'חיים רוזנברג', company: 'פרסום הצפון', priceMultiplier: 0.87, deliveryDays: 2, rating: 4.5, reliability: 91 },
        { name: 'מירי אדלר', company: 'פרסום מהיר', priceMultiplier: 0.95, deliveryDays: 1, rating: 4.8, reliability: 96 },
        { name: 'דני שפירא', company: 'פרסום דני', priceMultiplier: 1.15, deliveryDays: 3, rating: 4.0, reliability: 80 },
      ],
    };
    
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('supplier123', 10);
    
    let supplierNumber = 1000;
    
    for (const category of categories.rows) {
      const categoryName = category.name as string;
      const suppliers = suppliersByCategory[categoryName] || suppliersByCategory['דפוס'];
      
      for (const supplierData of suppliers) {
        supplierNumber++;
        const openId = `supplier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const email = `${supplierData.name.replace(/\s/g, '.').toLowerCase()}@supplier.com`;
        
        // Create supplier
        const supplierResult = await pool.query(`
          INSERT INTO users ("openId", name, email, phone, "companyName", role, status, "passwordHash", "supplierNumber")
          VALUES ($1, $2, $3, $4, $5, 'supplier', 'active', $6, $7)
          RETURNING id
        `, [openId, supplierData.name, email, `050-${supplierNumber}`, supplierData.company, hashedPassword, supplierNumber]);
        
        const supplierId = supplierResult.rows[0].id;
        console.log(`[Seed] Created supplier: ${supplierData.name} (ID: ${supplierId})`);
        
        // Get products for this category
        const categoryProducts = products.rows.filter((p: any) => p.categoryId === category.id);
        
        // Add prices for each product size
        for (const product of categoryProducts) {
          if (product.size_id) {
            const basePrice = Number(product.basePrice) || 100;
            const supplierPrice = Math.round(basePrice * supplierData.priceMultiplier * 100) / 100;
            
            // Get size quantities for this product size
            const sizeQuantities = await pool.query(`
              SELECT id FROM size_quantities WHERE size_id = $1
            `, [product.size_id]);
            
            for (const sq of sizeQuantities.rows) {
              await pool.query(`
                INSERT INTO supplier_prices ("supplierId", "sizeQuantityId", "pricePerUnit", "deliveryDays")
                VALUES ($1, $2, $3, $4)
                ON CONFLICT DO NOTHING
              `, [supplierId, (sq as any).id, supplierPrice, supplierData.deliveryDays]);
            }
          }
        }
        
        // Create historical jobs for rating calculation
        const numJobs = Math.floor(Math.random() * 10) + 5; // 5-15 jobs per supplier
        for (let i = 0; i < numJobs; i++) {
          const daysAgo = Math.floor(Math.random() * 90) + 1; // Last 90 days
          const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
          const readyAt = new Date(createdAt.getTime() + supplierData.deliveryDays * 24 * 60 * 60 * 1000);
          
          // Random reliability based on supplier's reliability score
          const isReliable = Math.random() * 100 < supplierData.reliability;
          const rating = isReliable 
            ? Math.min(5, supplierData.rating + (Math.random() - 0.5))
            : Math.max(1, supplierData.rating - 1 - Math.random());
          
          // Get a random sizeQuantityId
          const randomSQ = await pool.query(`SELECT id FROM size_quantities LIMIT 1`);
          const sqId = randomSQ.rows?.[0]?.id || 1;
          const quantity = Math.floor(Math.random() * 500) + 100;
          const pricePerUnit = Math.round(100 * supplierData.priceMultiplier);
          const roundedRating = Math.round(rating * 10) / 10;
          
          await pool.query(`
            INSERT INTO supplier_jobs (
              "supplierId", "customerId", "sizeQuantityId", quantity, "pricePerUnit", status,
              "supplierMarkedReady", "supplierReadyAt", "courierConfirmedReady", "supplierRating",
              "createdAt", "updatedAt"
            )
            VALUES ($1, 1, $2, $3, $4, 'delivered', true, $5, $6, $7, $8, $9)
          `, [supplierId, sqId, quantity, pricePerUnit, readyAt.toISOString(), isReliable, roundedRating, createdAt.toISOString(), readyAt.toISOString()]);
        }
        
        console.log(`[Seed] Added ${numJobs} historical jobs for ${supplierData.name}`);
      }
    }
    
    console.log('[Seed] Suppliers seeding completed!');
  } catch (error) {
    console.error('[Seed] Error seeding suppliers:', error);
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
