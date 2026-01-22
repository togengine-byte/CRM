import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
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
    it("returns an array (may be empty if no customers)", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.list({});

      expect(Array.isArray(result)).toBe(true);
    });

    it("accepts status filter parameter", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.list({ status: "active" });

      expect(Array.isArray(result)).toBe(true);
    });

    it("accepts search parameter", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.list({ search: "test" });

      expect(Array.isArray(result)).toBe(true);
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
    it("returns null for non-existent customer", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.getById({ id: 999999 });
      expect(result).toBeNull();
    });
  });

  describe("customers.approve", () => {
    it("returns success even for non-existent customer (no-op)", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.approve({ customerId: 999999 });
      expect(result).toHaveProperty("success", true);
    });
  });

  describe("customers.reject", () => {
    it("returns success even for non-existent customer (no-op)", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.reject({ customerId: 999999, reason: "Test rejection" });
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
    it("returns an array of pricelists", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.pricelists.list();

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
