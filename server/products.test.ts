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

function createAuthContext(role: "admin" | "employee" | "customer" = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
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

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("products.list", () => {
  it("returns products list for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.products.list({});

    expect(Array.isArray(result)).toBe(true);
  });

  it("throws unauthorized for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.products.list({})).rejects.toThrow();
  });
});

describe("products.categories", () => {
  it("returns categories list for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.products.categories();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("products.create", () => {
  it("throws error for customer role", async () => {
    const ctx = createAuthContext("customer");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.products.create({
        name: "Test Product",
      })
    ).rejects.toThrow("Only employees can create products");
  });

  it("throws unauthorized for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.products.create({
        name: "Test Product",
      })
    ).rejects.toThrow();
  });
});

describe("products.createVariant", () => {
  it("throws error for customer role", async () => {
    const ctx = createAuthContext("customer");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.products.createVariant({
        baseProductId: 1,
        sku: "TEST-001",
        name: "Test Variant",
      })
    ).rejects.toThrow("Only employees can create variants");
  });
});

describe("products.update", () => {
  it("throws error for customer role", async () => {
    const ctx = createAuthContext("customer");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.products.update({
        id: 1,
        name: "Updated Product",
      })
    ).rejects.toThrow("Only employees can update products");
  });
});

describe("products.delete", () => {
  it("throws error for customer role", async () => {
    const ctx = createAuthContext("customer");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.products.delete({ id: 1 })
    ).rejects.toThrow("Only employees can delete products");
  });
});
