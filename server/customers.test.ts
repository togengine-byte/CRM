import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { initializeTestDb, cleanupTestDb, getTestDb } from "./test-db";

// Initialize test database before running tests
beforeAll(() => {
  initializeTestDb();
});

// Clean up after tests
afterAll(() => {
  cleanupTestDb();
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
    it("returns an array of customers from mock database", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.list({});

      expect(Array.isArray(result)).toBe(true);
      // Should have 10 customers (5 active + 5 pending)
      expect(result.length).toBeGreaterThanOrEqual(10);
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

      const result = await caller.customers.list({ search: "אלפא" });

      expect(Array.isArray(result)).toBe(true);
    });

    it("returns empty array for non-matching search", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.list({ search: "nonexistent_customer_xyz" });

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
      
      // Should have 10 customers total (5 active + 5 pending)
      expect(result.total).toBe(10);
      expect(result.active).toBe(5);
      expect(result.pending).toBe(5);
      expect(result.rejected).toBe(0);
    });
  });

  describe("customers.getById", () => {
    it("returns a customer from mock database", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Customer with id 7 should exist (first active customer)
      const result = await caller.customers.getById({ id: 7 });
      
      expect(result).not.toBeNull();
      if (result) {
        expect(result.name).toBe("חברת אלפא בע\"מ");
        expect(result.email).toBe("alpha@company.com");
        expect(result.status).toBe("active");
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
    it("approves a pending customer", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Customer with id 12 should be pending (first pending customer)
      const result = await caller.customers.approve({ customerId: 12 });
      expect(result).toHaveProperty("success", true);

      // Verify the customer is now active
      const updated = await caller.customers.getById({ id: 12 });
      if (updated) {
        expect(updated.status).toBe("active");
      }
    });

    it("returns success even for non-existent customer (no-op)", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.approve({ customerId: 999999 });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("customers.reject", () => {
    it("rejects a pending customer", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Customer with id 13 should be pending (second pending customer)
      const result = await caller.customers.reject({ 
        customerId: 13, 
        reason: "Test rejection reason" 
      });
      expect(result).toHaveProperty("success", true);

      // Verify the customer is now rejected
      const updated = await caller.customers.getById({ id: 13 });
      if (updated) {
        expect(updated.status).toBe("rejected");
      }
    });

    it("returns success even for non-existent customer (no-op)", async () => {
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
    it("updates customer information", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Update customer with id 7
      const result = await caller.customers.update({ 
        id: 7,
        name: "חברת אלפא עדכנית",
        email: "alpha-updated@company.com"
      });
      
      expect(result).toHaveProperty("success", true);

      // Verify the update
      const updated = await caller.customers.getById({ id: 7 });
      if (updated) {
        expect(updated.name).toBe("חברת אלפא עדכנית");
        expect(updated.email).toBe("alpha-updated@company.com");
      }
    });

    it("throws error when no fields to update", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.customers.update({ id: 999999 })).rejects.toThrow();
    });
  });
});

describe("pricelists router", () => {
  describe("pricelists.list", () => {
    it("returns an array of pricelists from mock database", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.pricelists.list();

      expect(Array.isArray(result)).toBe(true);
      // Should have 5 pricelists
      expect(result.length).toBe(5);
      
      // Verify pricelist names
      const names = result.map(p => p.name);
      expect(names).toContain("מחירון בסיסי");
      expect(names).toContain("מחירון VIP");
      expect(names).toContain("מחירון סיטונאי");
    });
  });
});

describe("Database integrity", () => {
  it("verifies admin code 1234 exists in system settings", async () => {
    const db = getTestDb();
    
    // Query system_settings for admin_code
    const result = await db.query.systemSettings.findFirst({
      where: (settings, { eq }) => eq(settings.key, "admin_code"),
    });

    expect(result).not.toBeNull();
    if (result) {
      expect(result.key).toBe("admin_code");
      expect(result.value).toContain("1234");
    }
  });

  it("verifies all sample data was inserted correctly", async () => {
    const db = getTestDb();
    
    // Count users
    const userCount = await db.query.users.findMany();
    expect(userCount.length).toBeGreaterThanOrEqual(26); // 1 admin + 5 emp + 10 cust + 5 supp + 5 courier

    // Count products
    const productCount = await db.query.baseProducts.findMany();
    expect(productCount.length).toBe(5);

    // Count pricelists
    const pricelistCount = await db.query.pricelists.findMany();
    expect(pricelistCount.length).toBe(5);
  });
});
