import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // Simple login with code 1234
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { code } = req.body;

    if (!code || code !== "1234") {
      res.status(401).json({ error: "Invalid code" });
      return;
    }

    try {
      // Create a test user with a fixed openId
      const openId = "test-user-001";
      
      await db.upsertUser({
        openId,
        name: "Test User",
        email: "test@example.com",
        loginMethod: "code",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: "Test User",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: { openId, name: "Test User" } });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // OAuth callback (kept for backward compatibility but disabled)
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    res.status(400).json({ error: "OAuth is disabled. Use POST /api/auth/login with code 1234" });
  });
}
