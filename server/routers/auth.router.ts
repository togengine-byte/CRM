/**
 * Auth Router
 * Handles authentication, logout, and user verification
 */

import { z } from "zod";
import { sql } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { getUserByEmail, getDb, DEFAULT_PERMISSIONS } from "../db";

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    // Support both Express clearCookie and Vercel setHeader
    if (ctx.res.clearCookie) {
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    } else if (ctx.res.setHeader) {
      ctx.res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
    }
    return { success: true } as const;
  }),
  
  // Check if user email exists in database and return their role/permissions
  checkUserByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const user = await getUserByEmail(input.email.toLowerCase());
      if (!user) {
        return { authorized: false, user: null };
      }
      // Check if user is active
      if (user.status !== 'active') {
        return { authorized: false, user: null, reason: 'user_not_active' };
      }
      return {
        authorized: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: user.permissions,
          status: user.status,
        },
      };
    }),
    
  // Seed admin user (only works if admin doesn't exist yet)
  seedAdmin: publicProcedure
    .input(z.object({ 
      email: z.string().email(),
      name: z.string(),
      password: z.string().min(4, "סיסמה חייבת להכיל לפחות 4 תווים"),
      secretKey: z.string() // Simple protection
    }))
    .mutation(async ({ input }) => {
      // Simple protection - require a secret key from environment variable
      const adminSetupKey = process.env.ADMIN_SETUP_KEY || 'CHANGE_THIS_DEFAULT_KEY';
      if (input.secretKey !== adminSetupKey) {
        throw new Error('Invalid secret key');
      }
      
      const db = await import('../db').then(m => m.getDb());
      if (!db) {
        throw new Error('Database not available - check DATABASE_URL environment variable');
      }
      
      const { users } = await import('../../drizzle/schema');
      const { eq, sql } = await import('drizzle-orm');
      const crypto = await import('crypto');
      const bcrypt = await import('bcryptjs');
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(input.password, salt);
      
      try {
        // First, check if table exists by trying a simple query
        const tableCheck = await db.execute(sql`SELECT to_regclass('public.users')`);
        const tableExists = tableCheck.rows[0]?.to_regclass !== null;
        
        if (!tableExists) {
          // Create the users table with all required columns
          await db.execute(sql`
            DO $$ BEGIN
              CREATE TYPE user_role AS ENUM ('admin', 'employee', 'customer', 'supplier', 'courier');
            EXCEPTION
              WHEN duplicate_object THEN null;
            END $$;
            
            DO $$ BEGIN
              CREATE TYPE user_status AS ENUM ('pending_approval', 'active', 'rejected', 'deactivated');
            EXCEPTION
              WHEN duplicate_object THEN null;
            END $$;
          `);
          
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              "openId" VARCHAR(64) NOT NULL UNIQUE,
              name TEXT,
              email VARCHAR(320),
              password VARCHAR(255),
              "loginMethod" VARCHAR(64),
              role user_role NOT NULL DEFAULT 'customer',
              status user_status NOT NULL DEFAULT 'pending_approval',
              phone VARCHAR(20),
              "companyName" TEXT,
              address TEXT,
              permissions JSONB DEFAULT '{}',
              "totalRatingPoints" INTEGER DEFAULT 0,
              "ratedDealsCount" INTEGER DEFAULT 0,
              "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
              "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
              "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW()
            )
          `);
          
          console.log('[SeedAdmin] Created users table');
        }
        
        // Check if admin already exists
        const existingUsers = await db.select().from(users).where(eq(users.email, input.email.toLowerCase())).limit(1);
        const existing = existingUsers[0];
        
        if (existing) {
          // If exists but not admin, update to admin
          if (existing.role !== 'admin') {
            await db.update(users)
              .set({ 
                role: 'admin',
                status: 'active',
                permissions: DEFAULT_PERMISSIONS.admin,
                updatedAt: new Date(),
              })
              .where(eq(users.email, input.email.toLowerCase()));
            return { success: true, message: 'User upgraded to admin' };
          }
          return { success: true, message: 'Admin already exists' };
        }
        
        // Create new admin user
        await db.insert(users).values({
          openId: `admin-${crypto.randomUUID()}`,
          name: input.name,
          email: input.email.toLowerCase(),
          password: hashedPassword,
          role: 'admin',
          status: 'active',
          permissions: DEFAULT_PERMISSIONS.admin,
          loginMethod: 'email',
        });
        
        return { success: true, message: 'Admin user created successfully!' };
      } catch (error: any) {
        console.error('[SeedAdmin] Error:', error);
        throw new Error(`Database error: ${error.message}. Make sure the database migrations have been run.`);
      }
    }),
});
