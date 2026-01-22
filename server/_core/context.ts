import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request, Response } from "express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

// Support both Express and Vercel request/response types
export interface ServerRequest {
  headers: Record<string, string | string[] | undefined> & { cookie?: string };
  cookies?: Record<string, string>;
  get?: (name: string) => string | undefined;
  protocol?: string;
}

export interface ServerResponse {
  setHeader?: (name: string, value: string | string[]) => void;
  clearCookie?: (name: string, options?: any) => void;
  cookie?: (name: string, value: string, options?: any) => void;
}

export type TrpcContext = {
  req: ServerRequest;
  res: ServerResponse;
  user: User | null;
};

// Type for Express context options
type ContextOptions = {
  req: ServerRequest;
  res: ServerResponse;
};

export async function createContext(
  opts: ContextOptions | CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req as ServerRequest);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req as ServerRequest,
    res: opts.res as ServerResponse,
    user,
  };
}
