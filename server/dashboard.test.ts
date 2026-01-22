import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { initializeTestDb, cleanupTestDb } from "./test-db";

// Initialize test database before running tests
beforeAll(async () => {
  await initializeTestDb();
  console.log("[Test] Using PostgreSQL database");
});

// Clean up after tests
afterAll(async () => {
  await cleanupTestDb();
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    status: "active",
    phone: "050-1234567",
    companyName: "Test Company",
    address: "Test Address",
    totalRatingPoints: 0,
    ratedDealsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("dashboard.kpis", () => {
  it("returns KPI data for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.kpis();

    expect(result).toBeDefined();
    expect(typeof result.totalQuotes).toBe("number");
    expect(typeof result.activeCustomers).toBe("number");
    expect(typeof result.totalRevenue).toBe("number");
    expect(typeof result.conversionRate).toBe("number");
    expect(typeof result.pendingApprovals).toBe("number");
  });

  it("throws unauthorized for unauthenticated user", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.dashboard.kpis()).rejects.toThrow();
  });
});

describe("dashboard.recentQuotes", () => {
  it("returns recent quotes for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.recentQuotes();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("dashboard.pendingCustomers", () => {
  it("returns pending customers for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.pendingCustomers();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("dashboard.recentActivity", () => {
  it("returns recent activity for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.recentActivity();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("quotes.list", () => {
  it("returns quotes list for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.quotes.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("accepts filter parameters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.quotes.list({ status: "draft", limit: 10 });

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("auth.me", () => {
  it("returns user for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-123");
    expect(result?.email).toBe("test@example.com");
  });

  it("returns null for unauthenticated user", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears cookie and returns success", async () => {
    const clearedCookies: string[] = [];
    const user: AuthenticatedUser = {
      id: 1,
      openId: "test-user-123",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "admin",
      status: "active",
      phone: "050-1234567",
      companyName: "Test Company",
      address: "Test Address",
      totalRatingPoints: 0,
      ratedDealsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx: TrpcContext = {
      user,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: (name: string) => {
          clearedCookies.push(name);
        },
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});
