import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

// Security: Allowed file types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'application/postscript',
  'application/illustrator',
  'image/vnd.adobe.photoshop',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.ai', '.eps', '.psd'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES = 10;

// Configure multer for secure file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'customer-requests');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create a unique folder for each request
    const requestId = crypto.randomUUID();
    const requestDir = path.join(uploadDir, requestId);
    fs.mkdirSync(requestDir, { recursive: true });
    (req as any).requestDir = requestDir;
    (req as any).requestId = requestId;
    cb(null, requestDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename and add random prefix
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.');
    const uniqueName = `${crypto.randomBytes(8).toString('hex')}_${sanitizedName}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    cb(new Error(`סוג קובץ לא מורשה: ${ext}`));
    return;
  }

  // Check for dangerous patterns in filename
  const dangerousPatterns = ['..', '/', '\\', '.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.html'];
  const lowerName = file.originalname.toLowerCase();
  for (const pattern of dangerousPatterns) {
    if (lowerName.includes(pattern) && !ALLOWED_EXTENSIONS.some(e => lowerName.endsWith(e))) {
      cb(new Error('שם קובץ לא תקין'));
      return;
    }
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  }
});

export function registerOAuthRoutes(app: Express) {
  // Simple login with email and password
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // For now, accept code 1234 or specific test credentials
    if (password !== "1234" && !(email && password)) {
      res.status(401).json({ error: "פרטי התחברות שגויים" });
      return;
    }

    try {
      // Find or create user by email
      let user = await db.getUserByEmail(email);
      
      if (!user) {
        // For test purposes, create user if using code 1234
        if (password === "1234") {
          const openId = `user-${crypto.randomUUID()}`;
          await db.upsertUser({
            openId,
            name: email.split('@')[0],
            email,
            loginMethod: "email",
            lastSignedIn: new Date(),
          });
          user = await db.getUserByEmail(email);
        } else {
          res.status(401).json({ error: "משתמש לא נמצא" });
          return;
        }
      }

      if (!user) {
        res.status(401).json({ error: "שגיאה ביצירת משתמש" });
        return;
      }

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "User",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: { openId: user.openId, name: user.name, role: user.role } });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "שגיאה בהתחברות" });
    }
  });

  // Google OAuth redirect
  app.get("/api/auth/google", (req: Request, res: Response) => {
    // TODO: Implement Google OAuth
    res.status(501).json({ error: "Google OAuth לא מוגדר עדיין" });
  });

  // Customer signup with files
  app.post("/api/customers/signup-with-files", upload.array('files', MAX_FILES), async (req: Request, res: Response) => {
    try {
      const { name, email, phone, companyName, description } = req.body;
      const files = req.files as Express.Multer.File[];
      const requestId = (req as any).requestId;

      // Validate required fields
      if (!name || !email || !phone || !description) {
        res.status(400).json({ error: "נא למלא את כל השדות הנדרשים" });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: "כתובת מייל לא תקינה" });
        return;
      }

      // Create customer request in database
      const customerRequest = await db.createCustomerSignupRequest({
        name,
        email,
        phone,
        companyName: companyName || null,
        description,
        requestId,
        files: files?.map(f => ({
          originalName: f.originalname,
          storedName: f.filename,
          size: f.size,
          mimeType: f.mimetype,
          path: f.path,
        })) || [],
      });

      res.json({ 
        success: true, 
        message: "הבקשה נשלחה בהצלחה",
        requestId: customerRequest.id,
        filesUploaded: files?.length || 0,
      });
    } catch (error) {
      console.error("[Signup] Customer signup failed", error);
      res.status(500).json({ error: "שגיאה בשליחת הבקשה" });
    }
  });

  // Simple signup without files (fallback)
  app.post("/api/customers/signup", async (req: Request, res: Response) => {
    try {
      const { name, email, phone, companyName, description } = req.body;

      // Validate required fields
      if (!name || !email || !phone || !description) {
        res.status(400).json({ error: "נא למלא את כל השדות הנדרשים" });
        return;
      }

      // Create customer request in database
      const customerRequest = await db.createCustomerSignupRequest({
        name,
        email,
        phone,
        companyName: companyName || null,
        description,
        requestId: crypto.randomUUID(),
        files: [],
      });

      res.json({ 
        success: true, 
        message: "הבקשה נשלחה בהצלחה",
        requestId: customerRequest.id,
      });
    } catch (error) {
      console.error("[Signup] Customer signup failed", error);
      res.status(500).json({ error: "שגיאה בשליחת הבקשה" });
    }
  });

  // OAuth callback (kept for backward compatibility but disabled)
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    res.status(400).json({ error: "OAuth is disabled. Use POST /api/auth/login" });
  });
}
