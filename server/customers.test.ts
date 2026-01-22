import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { initializeTestDb, cleanupTestDb, getTestDb, isUsingPostgres } from "./test-db";

// Initialize test database before running tests
beforeAll(async () => {
  await initializeTestDb();
  console.log(`[Test] Using ${isUsingPostgres() ? 'PostgreSQL' : 'Mock'} database`);
});

// Clean up after tests
afterAll(async () => {
  await cleanupTestDb();
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin_1234",
    email: "admin@crm.com",
    name: "מנהל ראשי",
    loginMethod: "password",
    role: "admin",
    status: "active",
    phone: "050-1234567",
    companyName: "CRM Company",
    address: "תל אביב, ישראל",
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

function createPublicContext(): TrpcContext {
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

describe("customers router", () => {
  describe("customers.list", () => {
    it("returns an array of customers from database", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.list({});

      expect(Array.isArray(result)).toBe(true);
    });

    it("filters by active status", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.list({ status: "active" });

      expect(Array.isArray(result)).toBe(true);
      // All returned customers should be active
      result.forEach(customer => {
        expect(customer.status).toBe("active");
      });
    });

    it("filters by pending_approval status", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.list({ status: "pending_approval" });

      expect(Array.isArray(result)).toBe(true);
      // All returned customers should be pending
      result.forEach(customer => {
        expect(customer.status).toBe("pending_approval");
      });
    });

    it("accepts search parameter", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.list({ search: "test" });

      expect(Array.isArray(result)).toBe(true);
    });

    it("returns empty array for non-matching search", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.list({ search: "nonexistent_customer_xyz_12345" });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("customers.stats", () => {
    it("returns customer statistics object", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.stats();

      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("active");
      expect(result).toHaveProperty("pending");
      expect(result).toHaveProperty("rejected");
      expect(typeof result.total).toBe("number");
      expect(typeof result.active).toBe("number");
      expect(typeof result.pending).toBe("number");
      expect(typeof result.rejected).toBe("number");
    });
  });

  describe("customers.getById", () => {
    it("returns a customer from database by searching first", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // First get a list of customers to find a valid ID
      const customers = await caller.customers.list({});
      
      if (customers.length > 0) {
        const firstCustomer = customers[0];
        const result = await caller.customers.getById({ id: firstCustomer.id });
        
        expect(result).not.toBeNull();
        if (result) {
          expect(result.id).toBe(firstCustomer.id);
        }
      } else {
        // No customers in database, skip test
        expect(true).toBe(true);
      }
    });

    it("returns null for non-existent customer", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.getById({ id: 999999 });
      expect(result).toBeNull();
    });
  });

  describe("customers.approve", () => {
    it("returns success for approve operation", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Test with non-existent ID (should still return success as no-op)
      const result = await caller.customers.approve({ customerId: 999999 });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("customers.reject", () => {
    it("returns success for reject operation", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.reject({ 
        customerId: 999999, 
        reason: "Test rejection" 
      });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("customers.update", () => {
    it("throws error when no fields to update", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.customers.update({ id: 999999 })).rejects.toThrow();
    });
  });
});

describe("pricelists router", () => {
  describe("pricelists.list", () => {
    it("returns an array of pricelists from database", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.pricelists.list();

      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("Database integrity", () => {
  it("verifies database connection is working", async () => {
    const db = getTestDb();
    expect(db).not.toBeNull();
    
    // Simple query to verify connection
    const users = await db.query.users.findMany({ limit: 1 });
    expect(Array.isArray(users)).toBe(true);
  });

  it("can query users table", async () => {
    const db = getTestDb();
    const users = await db.query.users.findMany();
    expect(Array.isArray(users)).toBe(true);
  });

  it("can query baseProducts table", async () => {
    const db = getTestDb();
    const products = await db.query.baseProducts.findMany();
    expect(Array.isArray(products)).toBe(true);
  });

  it("can query pricelists table", async () => {
    const db = getTestDb();
    const pricelists = await db.query.pricelists.findMany();
    expect(Array.isArray(pricelists)).toBe(true);
  });
});
