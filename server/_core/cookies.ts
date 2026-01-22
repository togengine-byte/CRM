import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

// Define a minimal request interface for serverless compatibility
interface MinimalRequest {
  protocol?: string;
  headers: Record<string, string | string[] | undefined>;
  get?: (name: string) => string | undefined;
}

function isSecureRequest(req: MinimalRequest) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some((proto: string) => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: MinimalRequest
): { httpOnly: boolean; path: string; sameSite: "none" | "lax" | "strict"; secure: boolean } {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}
