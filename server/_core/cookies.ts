import type { CookieOptions, Request } from "express";

// Define a minimal request interface for serverless compatibility
interface MinimalRequest {
  protocol?: string;
  headers: Record<string, string | string[] | undefined>;
  get?: (name: string) => string | undefined;
}

/**
 * Detect if the request is coming over HTTPS
 * Checks multiple headers that proxies/load balancers might set
 */
function isSecureRequest(req: MinimalRequest): boolean {
  // Direct protocol check
  if (req.protocol === "https") return true;

  // Check x-forwarded-proto header (common for proxies like Render, Heroku, etc.)
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (forwardedProto) {
    const protoList = Array.isArray(forwardedProto)
      ? forwardedProto
      : forwardedProto.split(",");
    if (protoList.some((proto: string) => proto.trim().toLowerCase() === "https")) {
      return true;
    }
  }

  // Check x-forwarded-ssl header
  const forwardedSsl = req.headers["x-forwarded-ssl"];
  if (forwardedSsl === "on") return true;

  // Check front-end-https header (Microsoft)
  const frontEndHttps = req.headers["front-end-https"];
  if (frontEndHttps === "on") return true;

  // In production, assume HTTPS if NODE_ENV is production
  // This is a fallback for cases where proxy headers aren't properly forwarded
  if (process.env.NODE_ENV === "production") {
    return true;
  }

  return false;
}

/**
 * Get cookie options for session management
 * 
 * IMPORTANT: For cross-site cookies (sameSite: "none"), secure MUST be true.
 * Using "lax" is more compatible and doesn't require secure in all cases.
 */
export function getSessionCookieOptions(
  req: MinimalRequest
): { httpOnly: boolean; path: string; sameSite: "none" | "lax" | "strict"; secure: boolean } {
  const isSecure = isSecureRequest(req);
  
  // In production with HTTPS, use sameSite: "none" for cross-origin compatibility
  // Otherwise use "lax" which is more permissive for same-site navigation
  const sameSite = isSecure ? "none" : "lax";
  
  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure: isSecure,
  };
}
