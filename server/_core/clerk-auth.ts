import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

/**
 * Clerk Authentication Module
 * Handles user authentication via Clerk
 * All sensitive data (CLERK_SECRET_KEY) is read from environment variables
 */

export async function verifyClerkToken(token: string): Promise<any> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY not configured");
  }

  try {
    // Verify the token using Clerk's backend API
    // For now, we'll use a simple approach - in production, use @clerk/backend SDK
    const response = await fetch("https://api.clerk.com/v1/sessions/verify", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error("Invalid token");
    }

    return await response.json();
  } catch (error) {
    console.error("[Clerk] Token verification failed:", error);
    throw error;
  }
}

export function registerClerkRoutes(app: Express) {
  /**
   * Clerk Webhook Handler
   * Receives user events from Clerk (user.created, user.updated, etc.)
   */
  app.post("/api/webhooks/clerk", async (req: Request, res: Response) => {
    try {
      const event = req.body;
      const eventType = event.type;

      console.log(`[Clerk] Webhook received: ${eventType}`);

      if (eventType === "user.created") {
        const { id, email_addresses, first_name, last_name, image_url } = event.data;
        const email = email_addresses?.[0]?.email_address;

        if (!email) {
          res.status(400).json({ error: "No email found" });
          return;
        }

        // Create user in database
        await db.upsertUser({
          openId: id,
          email,
          name: `${first_name || ""} ${last_name || ""}`.trim(),
          picture: image_url,
          role: "customer",
          loginMethod: "clerk",
        });

        console.log(`[Clerk] User created: ${email}`);
      } else if (eventType === "user.updated") {
        const { id, email_addresses, first_name, last_name, image_url } = event.data;
        const email = email_addresses?.[0]?.email_address;

        if (email) {
          await db.upsertUser({
            openId: id,
            email,
            name: `${first_name || ""} ${last_name || ""}`.trim(),
            picture: image_url,
            loginMethod: "clerk",
          });

          console.log(`[Clerk] User updated: ${email}`);
        }
      } else if (eventType === "user.deleted") {
        const { id } = event.data;
        console.log(`[Clerk] User deleted: ${id}`);
        // Optionally handle user deletion
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[Clerk] Webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  /**
   * Get current user session
   * Called from frontend to get authenticated user info
   */
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const clerkUserId = (req as any).auth?.userId;

      if (!clerkUserId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      // Get user from database
      const user = await db.getUserByOpenId(clerkUserId);

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({
        success: true,
        user: {
          openId: user.openId,
          email: user.email,
          name: user.name,
          role: user.role,
          picture: user.picture,
        },
      });
    } catch (error) {
      console.error("[Auth] Get current user failed:", error);
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  /**
   * Logout endpoint
   * Clears session on backend
   */
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    try {
      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(COOKIE_NAME, cookieOptions);
      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Logout failed:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });
}
