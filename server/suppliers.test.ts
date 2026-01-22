import { describe, expect, it } from "vitest";
import {
  getSuppliers,
  getSupplierById,
  getSupplierPrices,
  getSupplierOpenJobs,
  getSupplierRecommendations,
  getSupplierStats,
} from "./db";

describe("Suppliers API", () => {
  describe("getSuppliers", () => {
    it("returns an array of suppliers", async () => {
      const result = await getSuppliers();
      expect(Array.isArray(result)).toBe(true);
    });

    it("filters by status when provided", async () => {
      const result = await getSuppliers({ status: "active" });
      expect(Array.isArray(result)).toBe(true);
      // All results should have active status if any exist
      result.forEach((supplier) => {
        expect(supplier.status).toBe("active");
      });
    });

    it("filters by search term when provided", async () => {
      const result = await getSuppliers({ search: "test" });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getSupplierById", () => {
    it("returns null for non-existent supplier", async () => {
      const result = await getSupplierById(999999);
      expect(result).toBeNull();
    });
  });

  describe("getSupplierPrices", () => {
    it("returns an array of prices", async () => {
      const result = await getSupplierPrices(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns empty array for non-existent supplier", async () => {
      const result = await getSupplierPrices(999999);
      expect(result).toEqual([]);
    });
  });

  describe("getSupplierOpenJobs", () => {
    it("returns an array of jobs", async () => {
      const result = await getSupplierOpenJobs(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns empty array for non-existent supplier", async () => {
      const result = await getSupplierOpenJobs(999999);
      expect(result).toEqual([]);
    });
  });

  describe("getSupplierRecommendations", () => {
    it("returns an array of recommendations", async () => {
      const result = await getSupplierRecommendations(1, 100);
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns empty array when no suppliers have prices for variant", async () => {
      const result = await getSupplierRecommendations(999999, 100);
      expect(result).toEqual([]);
    });

    it("recommendations are sorted by total score descending", async () => {
      const result = await getSupplierRecommendations(1, 100);
      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].scores.total).toBeGreaterThanOrEqual(result[i + 1].scores.total);
        }
      }
    });
  });

  describe("getSupplierStats", () => {
    it("returns stats object with required fields", async () => {
      const result = await getSupplierStats();
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("active");
      expect(result).toHaveProperty("pending");
      expect(typeof result.total).toBe("number");
      expect(typeof result.active).toBe("number");
      expect(typeof result.pending).toBe("number");
    });
  });
});
