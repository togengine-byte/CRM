/**
 * Couriers Module
 * 
 * Courier management functions including CRUD operations
 * and delivery tracking.
 */

import { getDb, eq, and, desc, sql, inArray } from "./connection";
import { users, supplierJobs } from "../../drizzle/schema";
import { logActivity } from "./activity";

// ==================== COURIER CRUD ====================

/**
 * Get all couriers
 */
export async function getCouriers(filters?: {
  status?: 'pending_approval' | 'active' | 'rejected' | 'deactivated';
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(users.role, 'courier')];
  
  if (filters?.status) {
    conditions.push(eq(users.status, filters.status));
  }

  const results = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    phone: users.phone,
    companyName: users.companyName,
    status: users.status,
    createdAt: users.createdAt,
  })
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.id));

  if (filters?.search) {
    const search = filters.search.toLowerCase();
    return results.filter(c => 
      c.name?.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.phone?.includes(search)
    );
  }

  return results;
}

/**
 * Get courier by ID
 */
export async function getCourierById(courierId: number) {
  const db = await getDb();
  if (!db) return null;

  const [courier] = await db.select()
    .from(users)
    .where(and(eq(users.id, courierId), eq(users.role, 'courier')))
    .limit(1);

  if (!courier) return null;

  // Get delivery stats
  const statsResult = await db.execute(sql`
    SELECT 
      COUNT(*) as total_deliveries,
      COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_deliveries,
      COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as active_deliveries
    FROM supplier_jobs
    WHERE "courierConfirmedReady" IS NOT NULL
  `);

  const stats = statsResult.rows[0] as any || {};

  return {
    ...courier,
    stats: {
      totalDeliveries: Number(stats.total_deliveries || 0),
      completedDeliveries: Number(stats.completed_deliveries || 0),
      activeDeliveries: Number(stats.active_deliveries || 0),
    },
  };
}

/**
 * Create courier
 */
export async function createCourier(input: {
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values({
    openId: `courier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    companyName: input.companyName || null,
    role: 'courier',
    status: 'active',
  }).returning();

  await logActivity(null, "courier_created", { name: input.name, email: input.email });

  return result[0];
}

/**
 * Update courier
 */
export async function updateCourier(input: {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  status?: 'pending_approval' | 'active' | 'rejected' | 'deactivated';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.companyName !== undefined) updateData.companyName = input.companyName;
  if (input.status !== undefined) updateData.status = input.status;

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields to update");
  }

  await db.update(users)
    .set(updateData)
    .where(and(eq(users.id, input.id), eq(users.role, 'courier')));

  await logActivity(null, "courier_updated", { courierId: input.id });

  return { success: true };
}

/**
 * Delete courier (deactivate)
 */
export async function deleteCourier(courierId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ status: 'deactivated' })
    .where(and(eq(users.id, courierId), eq(users.role, 'courier')));

  await logActivity(null, "courier_deleted", { courierId });

  return { success: true };
}

// ==================== COURIER DELIVERIES ====================

/**
 * Get available pickups for courier
 */
export async function getAvailablePickups() {
  const db = await getDb();
  if (!db) return [];

  return await db.select({
    id: supplierJobs.id,
    quoteId: supplierJobs.quoteId,
    supplierId: supplierJobs.supplierId,
    sizeQuantityId: supplierJobs.sizeQuantityId,
    quantity: supplierJobs.quantity,
    status: supplierJobs.status,
    supplierMarkedReady: supplierJobs.supplierMarkedReady,
    supplierReadyAt: supplierJobs.supplierReadyAt,
    createdAt: supplierJobs.createdAt,
    supplierName: users.name,
    supplierCompany: users.companyName,
    supplierAddress: users.address,
    supplierPhone: users.phone,
  })
    .from(supplierJobs)
    .leftJoin(users, eq(supplierJobs.supplierId, users.id))
    .where(and(
      eq(supplierJobs.supplierMarkedReady, true),
      eq(supplierJobs.status, 'ready')
    ))
    .orderBy(desc(supplierJobs.supplierReadyAt));
}

/**
 * Get courier active deliveries
 */
export async function getCourierActiveDeliveries(courierId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select({
    id: supplierJobs.id,
    quoteId: supplierJobs.quoteId,
    supplierId: supplierJobs.supplierId,
    sizeQuantityId: supplierJobs.sizeQuantityId,
    quantity: supplierJobs.quantity,
    status: supplierJobs.status,
    createdAt: supplierJobs.createdAt,
    supplierName: users.name,
    supplierCompany: users.companyName,
    supplierAddress: users.address,
  })
    .from(supplierJobs)
    .leftJoin(users, eq(supplierJobs.supplierId, users.id))
    .where(eq(supplierJobs.status, 'in_transit'))
    .orderBy(desc(supplierJobs.createdAt));
}

/**
 * Get courier delivery history
 */
export async function getCourierDeliveryHistory(courierId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db.select({
    id: supplierJobs.id,
    quoteId: supplierJobs.quoteId,
    supplierId: supplierJobs.supplierId,
    quantity: supplierJobs.quantity,
    status: supplierJobs.status,
    createdAt: supplierJobs.createdAt,
    supplierName: users.name,
    supplierCompany: users.companyName,
  })
    .from(supplierJobs)
    .leftJoin(users, eq(supplierJobs.supplierId, users.id))
    .where(eq(supplierJobs.status, 'delivered'))
    .orderBy(desc(supplierJobs.createdAt))
    .limit(limit);
}

/**
 * Confirm pickup
 */
export async function confirmPickup(jobId: number, courierId: number, confirmed: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(supplierJobs)
    .set({ 
      courierConfirmedReady: confirmed,
      status: confirmed ? 'in_transit' : 'ready',
      updatedAt: new Date(),
    })
    .where(eq(supplierJobs.id, jobId));

  await logActivity(courierId, "pickup_confirmed", { jobId, confirmed });

  return { success: true };
}

/**
 * Complete delivery
 */
export async function completeDelivery(jobId: number, courierId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(supplierJobs)
    .set({ 
      status: 'delivered',
      updatedAt: new Date(),
    })
    .where(eq(supplierJobs.id, jobId));

  await logActivity(courierId, "delivery_completed", { jobId });

  return { success: true };
}

/**
 * Get courier statistics
 */
export async function getCourierStats() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, pending: 0 };

  const result = await db.select({
    status: users.status,
    count: sql<number>`count(*)`,
  })
    .from(users)
    .where(eq(users.role, 'courier'))
    .groupBy(users.status);

  const stats = { total: 0, active: 0, pending: 0 };
  
  for (const row of result) {
    const count = Number(row.count);
    stats.total += count;
    if (row.status === 'active') stats.active = count;
    if (row.status === 'pending_approval') stats.pending = count;
  }

  return stats;
}


/**
 * Get courier ready jobs (all statuses for courier view)
 */
export async function getCourierReadyJobs() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      sj.id,
      sj."quoteId",
      sj."supplierId",
      sj."customerId",
      sj."sizeQuantityId",
      sj.quantity,
      sj.status,
      sj."createdAt",
      supplier.name as "supplierName",
      supplier."companyName" as "supplierCompany",
      supplier.address as "supplierAddress",
      supplier.phone as "supplierPhone",
      customer.name as "customerName",
      customer."companyName" as "customerCompany",
      customer.address as "customerAddress",
      customer.phone as "customerPhone",
      ps.name as "sizeName",
      ps.dimensions as "dimensions",
      bp.name as "productName"
    FROM supplier_jobs sj
    LEFT JOIN users supplier ON sj."supplierId" = supplier.id
    LEFT JOIN users customer ON sj."customerId" = customer.id
    LEFT JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
    LEFT JOIN product_sizes ps ON sq.size_id = ps.id
    LEFT JOIN base_products bp ON ps.product_id = bp.id
    WHERE sj.status IN ('ready', 'picked_up', 'delivered')
    ORDER BY 
      CASE sj.status 
        WHEN 'ready' THEN 1
        WHEN 'picked_up' THEN 2
        WHEN 'delivered' THEN 3
      END,
      sj."createdAt" DESC
  `);

  return (result.rows || []).map((job: any) => ({
    id: job.id,
    quoteId: job.quoteId,
    productName: job.productName || 'מוצר',
    sizeName: job.sizeName || '',
    dimensions: job.dimensions,
    quantity: job.quantity,
    supplierName: job.supplierName || job.supplierCompany || '-',
    supplierCompany: job.supplierCompany,
    supplierAddress: job.supplierAddress,
    supplierPhone: job.supplierPhone,
    customerName: job.customerName || job.customerCompany || '-',
    customerCompany: job.customerCompany,
    customerAddress: job.customerAddress,
    customerPhone: job.customerPhone,
    status: job.status,
    createdAt: job.createdAt,
  }));
}


/**
 * Get all couriers list (simple)
 */
export async function getCouriersList() {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(users)
    .where(eq(users.role, 'courier'))
    .orderBy(desc(users.id));
}
