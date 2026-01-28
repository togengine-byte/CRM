/**
 * Jobs Module
 * 
 * Job management functions including supplier jobs,
 * courier jobs, and job status tracking.
 */

import { getDb, eq, and, desc, sql, inArray } from "./connection";
import { 
  supplierJobs,
  quoteItems,
  quotes,
  users,
  sizeQuantities,
  productSizes,
  baseProducts
} from "../../drizzle/schema";
import { logActivity } from "./activity";

// ==================== SUPPLIER JOBS ====================

/**
 * Get supplier jobs with filters
 */
export async function getSupplierJobs(filters?: {
  supplierId?: number;
  status?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.supplierId) {
    conditions.push(eq(supplierJobs.supplierId, filters.supplierId));
  }
  if (filters?.status) {
    conditions.push(eq(supplierJobs.status, filters.status));
  }

  let query = db.select({
    id: supplierJobs.id,
    quoteId: supplierJobs.quoteId,
    supplierId: supplierJobs.supplierId,
    sizeQuantityId: supplierJobs.sizeQuantityId,
    quantity: supplierJobs.quantity,
    pricePerUnit: supplierJobs.pricePerUnit,
    status: supplierJobs.status,
    supplierMarkedReady: supplierJobs.supplierMarkedReady,
    supplierReadyAt: supplierJobs.supplierReadyAt,
    courierConfirmedReady: supplierJobs.courierConfirmedReady,
    supplierRating: supplierJobs.supplierRating,
    promisedDeliveryDays: supplierJobs.promisedDeliveryDays,
    createdAt: supplierJobs.createdAt,
    supplierName: users.name,
    supplierCompany: users.companyName,
  })
    .from(supplierJobs)
    .leftJoin(users, eq(supplierJobs.supplierId, users.id))
    .orderBy(desc(supplierJobs.createdAt))
    .limit(filters?.limit || 100);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query;
}

/**
 * Get supplier job by ID with customer and product details
 */
export async function getSupplierJobById(jobId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(sql`
    SELECT 
      sj.*,
      q."customerId",
      u.name as "customerName",
      u.email as "customerEmail",
      bp.name as "productName"
    FROM supplier_jobs sj
    LEFT JOIN quotes q ON sj."quoteId" = q.id
    LEFT JOIN users u ON q."customerId" = u.id
    LEFT JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
    LEFT JOIN product_sizes ps ON sq."sizeId" = ps.id
    LEFT JOIN base_products bp ON ps."productId" = bp.id
    WHERE sj.id = ${jobId}
    LIMIT 1
  `);

  const job = result.rows[0];
  if (!job) return null;

  return {
    ...job,
    customer: {
      id: job.customerId,
      name: job.customerName,
      email: job.customerEmail,
    },
    productName: job.productName,
  };
}

/**
 * Create supplier job
 */
export async function createSupplierJob(input: {
  quoteId: number;
  supplierId: number;
  sizeQuantityId: number;
  quantity: number;
  pricePerUnit: number;
  promisedDeliveryDays?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(supplierJobs).values({
    quoteId: input.quoteId,
    supplierId: input.supplierId,
    sizeQuantityId: input.sizeQuantityId,
    quantity: input.quantity,
    pricePerUnit: input.pricePerUnit.toString(),
    promisedDeliveryDays: input.promisedDeliveryDays || 3,
    status: 'pending',
  }).returning();

  await logActivity(null, "supplier_job_created", { 
    jobId: result[0].id, 
    quoteId: input.quoteId,
    supplierId: input.supplierId 
  });

  return result[0];
}

/**
 * Update supplier job status
 */
export async function updateSupplierJobStatus(jobId: number, status: string, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(supplierJobs)
    .set({ 
      status,
      updatedAt: new Date(),
    })
    .where(eq(supplierJobs.id, jobId));

  await logActivity(userId || null, "supplier_job_status_updated", { jobId, status });

  return { success: true };
}

/**
 * Mark supplier job as ready
 */
export async function markSupplierJobReady(jobId: number, supplierId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [job] = await db.select()
    .from(supplierJobs)
    .where(and(
      eq(supplierJobs.id, jobId),
      eq(supplierJobs.supplierId, supplierId)
    ))
    .limit(1);

  if (!job) {
    throw new Error("Job not found or not assigned to this supplier");
  }

  await db.update(supplierJobs)
    .set({ 
      supplierMarkedReady: true,
      supplierReadyAt: new Date(),
      status: 'ready',
      updatedAt: new Date(),
    })
    .where(eq(supplierJobs.id, jobId));

  await logActivity(supplierId, "supplier_marked_job_ready", { jobId });

  return { success: true };
}

/**
 * Confirm supplier job ready (by courier)
 */
export async function confirmSupplierJobReady(jobId: number, courierId: number, confirmed: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(supplierJobs)
    .set({ 
      courierConfirmedReady: confirmed,
      updatedAt: new Date(),
    })
    .where(eq(supplierJobs.id, jobId));

  await logActivity(courierId, "courier_confirmed_job_ready", { jobId, confirmed });

  return { success: true };
}

/**
 * Rate supplier job
 */
export async function rateSupplierJob(jobId: number, rating: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (rating < 1 || rating > 10) {
    throw new Error("Rating must be between 1 and 10");
  }

  await db.update(supplierJobs)
    .set({ 
      supplierRating: rating.toString(),
      updatedAt: new Date(),
    })
    .where(eq(supplierJobs.id, jobId));

  await logActivity(userId, "supplier_job_rated", { jobId, rating });

  return { success: true };
}

/**
 * Update supplier job data (admin only)
 */
export async function updateSupplierJobData(
  jobId: number, 
  data: {
    supplierRating?: number;
    courierConfirmedReady?: boolean;
    promisedDeliveryDays?: number;
    supplierReadyAt?: Date | null;
  },
  adminId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!Number.isInteger(jobId) || jobId <= 0) {
    throw new Error("Invalid job ID");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.supplierRating !== undefined) {
    if (typeof data.supplierRating !== 'number' || data.supplierRating < 0 || data.supplierRating > 10) {
      throw new Error("Invalid supplier rating - must be between 0 and 10");
    }
    updateData.supplierRating = data.supplierRating.toString();
  }
  
  if (data.courierConfirmedReady !== undefined) {
    if (typeof data.courierConfirmedReady !== 'boolean') {
      throw new Error("Invalid courierConfirmedReady value - must be boolean");
    }
    updateData.courierConfirmedReady = data.courierConfirmedReady;
  }
  
  if (data.promisedDeliveryDays !== undefined) {
    if (!Number.isInteger(data.promisedDeliveryDays) || data.promisedDeliveryDays < 0 || data.promisedDeliveryDays > 365) {
      throw new Error("Invalid promisedDeliveryDays - must be integer between 0 and 365");
    }
    updateData.promisedDeliveryDays = data.promisedDeliveryDays;
  }
  
  if (data.supplierReadyAt !== undefined) {
    if (data.supplierReadyAt !== null && !(data.supplierReadyAt instanceof Date)) {
      throw new Error("Invalid supplierReadyAt - must be Date or null");
    }
    updateData.supplierReadyAt = data.supplierReadyAt;
  }

  if (Object.keys(updateData).length <= 1) {
    return { success: false, error: 'No fields to update' };
  }

  await db.update(supplierJobs)
    .set(updateData)
    .where(eq(supplierJobs.id, jobId));

  await logActivity(adminId, 'supplier_job_data_updated', { jobId, ...data });

  return { success: true };
}

/**
 * Get supplier completed jobs
 */
export async function getSupplierCompletedJobs(supplierId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      sj.id,
      sj."quoteId",
      sj."sizeQuantityId",
      sj.quantity,
      sj."pricePerUnit",
      sj.status,
      sj."supplierMarkedReady",
      sj."supplierReadyAt",
      sj."courierConfirmedReady",
      sj."supplierRating",
      sj."promisedDeliveryDays",
      sj."createdAt",
      q."customerId",
      u.name as "customerName",
      u."companyName" as "customerCompany",
      bp.name || ' - ' || ps.name as "productName",
      EXTRACT(EPOCH FROM (sj."supplierReadyAt" - sj."createdAt")) / 86400 as "actualDeliveryDays"
    FROM supplier_jobs sj
    LEFT JOIN quotes q ON sj."quoteId" = q.id
    LEFT JOIN users u ON q."customerId" = u.id
    LEFT JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
    LEFT JOIN product_sizes ps ON sq.size_id = ps.id
    LEFT JOIN base_products bp ON ps.product_id = bp.id
    WHERE sj."supplierId" = ${supplierId}
    AND sj.status IN ('ready', 'delivered', 'completed')
    ORDER BY sj."createdAt" DESC
  `);

  return result.rows.map((row: any) => ({
    id: row.id,
    quoteId: row.quoteId,
    customerId: row.customerId,
    sizeQuantityId: row.sizeQuantityId,
    quantity: row.quantity,
    pricePerUnit: row.pricePerUnit,
    status: row.status,
    supplierMarkedReady: row.supplierMarkedReady,
    supplierReadyAt: row.supplierReadyAt,
    courierConfirmedReady: row.courierConfirmedReady,
    supplierRating: row.supplierRating ? parseFloat(row.supplierRating) : null,
    promisedDeliveryDays: row.promisedDeliveryDays,
    createdAt: row.createdAt,
    customerName: row.customerName || 'לקוח לא מזוהה',
    customerCompany: row.customerCompany,
    productName: row.productName ? `${row.productName}` : 'מוצר לא מזוהה',
    actualDeliveryDays: row.actualDeliveryDays ? parseFloat(row.actualDeliveryDays) : null,
  }));
}

/**
 * Get supplier score details
 */
export async function getSupplierScoreDetails(supplierId: number) {
  const db = await getDb();
  if (!db) return null;

  const jobsResult = await db.execute(sql`
    SELECT 
      id,
      "supplierRating",
      "courierConfirmedReady",
      "promisedDeliveryDays",
      "createdAt",
      "supplierReadyAt",
      status
    FROM supplier_jobs
    WHERE "supplierId" = ${supplierId}
  `);

  const jobs = jobsResult.rows as any[];
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.supplierReadyAt !== null);

  let baseScore: number;
  if (totalJobs === 0) {
    baseScore = 70;
  } else if (totalJobs < 5) {
    baseScore = 80;
  } else if (totalJobs < 10) {
    baseScore = 90;
  } else {
    baseScore = 100;
  }

  const priceResult = await db.execute(sql`
    WITH supplier_avg AS (
      SELECT AVG(CAST("pricePerUnit" AS DECIMAL)) as avg_price
      FROM supplier_prices
      WHERE "supplierId" = ${supplierId}
    ),
    market_avg AS (
      SELECT AVG(CAST("pricePerUnit" AS DECIMAL)) as avg_price
      FROM supplier_prices
    )
    SELECT 
      supplier_avg.avg_price as supplier_price,
      market_avg.avg_price as market_price
    FROM supplier_avg, market_avg
  `);

  const priceRow = priceResult.rows[0] as any;
  const supplierPrice = parseFloat(priceRow?.supplier_price) || 0;
  const marketPrice = parseFloat(priceRow?.market_price) || 0;

  let priceScore = 0;
  let priceDiff = 0;
  if (marketPrice > 0 && supplierPrice > 0) {
    priceDiff = ((marketPrice - supplierPrice) / marketPrice) * 100;
    priceScore = Math.max(-10, Math.min(10, priceDiff * 0.5));
  }

  let promiseScore = 0;
  let promiseRate = 0;
  const jobsWithPromise = completedJobs.filter(j => j.promisedDeliveryDays !== null);
  if (jobsWithPromise.length > 0) {
    const onTimeJobs = jobsWithPromise.filter(j => {
      const actualDays = (new Date(j.supplierReadyAt).getTime() - new Date(j.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return actualDays <= j.promisedDeliveryDays;
    });
    promiseRate = (onTimeJobs.length / jobsWithPromise.length) * 100;
    promiseScore = Math.max(-8, Math.min(8, (promiseRate - 80) * 0.4));
  }

  let courierScore = 0;
  let courierRate = 0;
  const jobsWithCourierData = completedJobs.filter(j => j.courierConfirmedReady !== null);
  if (jobsWithCourierData.length > 0) {
    const confirmedJobs = jobsWithCourierData.filter(j => j.courierConfirmedReady === true);
    courierRate = (confirmedJobs.length / jobsWithCourierData.length) * 100;
    courierScore = Math.max(-6, Math.min(6, (courierRate - 80) * 0.3));
  }

  let earlyBonus = 0;
  let avgEarlyDays = 0;
  if (jobsWithPromise.length > 0) {
    const earlyDays = jobsWithPromise.map(j => {
      const actualDays = (new Date(j.supplierReadyAt).getTime() - new Date(j.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return j.promisedDeliveryDays - actualDays;
    }).filter(d => d > 0);
    
    if (earlyDays.length > 0) {
      avgEarlyDays = earlyDays.reduce((a, b) => a + b, 0) / earlyDays.length;
      earlyBonus = Math.min(3, avgEarlyDays);
    }
  }

  const openJobsResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM supplier_jobs
    WHERE "supplierId" = ${supplierId} AND status IN ('pending', 'in_progress')
  `);
  const openJobs = parseInt((openJobsResult.rows[0] as any)?.count) || 0;
  const workloadPenalty = Math.min(3, openJobs * 0.5);

  let consistencyScore = 0;
  if (completedJobs.length >= 3) {
    const deliveryTimes = completedJobs.map(j => {
      return (new Date(j.supplierReadyAt).getTime() - new Date(j.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    });
    const avgTime = deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length;
    const variance = deliveryTimes.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / deliveryTimes.length;
    const stdDev = Math.sqrt(variance);
    const cv = avgTime > 0 ? (stdDev / avgTime) * 100 : 0;
    consistencyScore = Math.max(0, Math.min(2, 2 - cv * 0.1));
  }

  const totalScore = baseScore + priceScore + promiseScore + courierScore + earlyBonus - workloadPenalty + consistencyScore;

  return {
    supplierId,
    totalJobs,
    completedJobs: completedJobs.length,
    scores: {
      base: {
        value: baseScore,
        description: totalJobs === 0 ? 'ספק חדש' : 
                     totalJobs < 5 ? '1-4 עבודות' :
                     totalJobs < 10 ? '5-9 עבודות' : '10+ עבודות'
      },
      price: {
        value: Math.round(priceScore * 10) / 10,
        diff: Math.round(priceDiff * 10) / 10,
        supplierAvg: Math.round(supplierPrice),
        marketAvg: Math.round(marketPrice),
        description: priceDiff > 0 ? `זול ב-${Math.round(priceDiff)}%` : 
                     priceDiff < 0 ? `יקר ב-${Math.round(Math.abs(priceDiff))}%` : 'ממוצע'
      },
      promise: {
        value: Math.round(promiseScore * 10) / 10,
        rate: Math.round(promiseRate),
        description: `${Math.round(promiseRate)}% עמידה בהבטחות`
      },
      courier: {
        value: Math.round(courierScore * 10) / 10,
        rate: Math.round(courierRate),
        description: `${Math.round(courierRate)}% אישור שליח`
      },
      early: {
        value: Math.round(earlyBonus * 10) / 10,
        avgDays: Math.round(avgEarlyDays * 10) / 10,
        description: avgEarlyDays > 0 ? `ממוצע ${Math.round(avgEarlyDays * 10) / 10} ימים מוקדם` : 'ללא סיום מוקדם'
      },
      workload: {
        value: -Math.round(workloadPenalty * 10) / 10,
        openJobs,
        description: `${openJobs} עבודות פתוחות`
      },
      consistency: {
        value: Math.round(consistencyScore * 10) / 10,
        description: consistencyScore > 1.5 ? 'עקבי מאוד' :
                     consistencyScore > 0.5 ? 'עקבי' : 'משתנה'
      }
    },
    totalScore: Math.round(totalScore * 10) / 10
  };
}

// ==================== COURIER JOBS ====================

/**
 * Get courier jobs
 */
export async function getCourierJobs(courierId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    inArray(supplierJobs.status, ['ready', 'in_transit'])
  ];
  
  if (courierId) {
    // Add courier-specific filter if needed
  }

  return await db.select({
    id: supplierJobs.id,
    quoteId: supplierJobs.quoteId,
    supplierId: supplierJobs.supplierId,
    sizeQuantityId: supplierJobs.sizeQuantityId,
    quantity: supplierJobs.quantity,
    status: supplierJobs.status,
    supplierMarkedReady: supplierJobs.supplierMarkedReady,
    supplierReadyAt: supplierJobs.supplierReadyAt,
    courierConfirmedReady: supplierJobs.courierConfirmedReady,
    createdAt: supplierJobs.createdAt,
    supplierName: users.name,
    supplierCompany: users.companyName,
    supplierAddress: users.address,
  })
    .from(supplierJobs)
    .leftJoin(users, eq(supplierJobs.supplierId, users.id))
    .where(and(...conditions))
    .orderBy(desc(supplierJobs.supplierReadyAt));
}

/**
 * Mark job as picked up
 */
export async function markJobPickedUp(jobId: number, courierId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(supplierJobs)
    .set({ 
      status: 'in_transit',
      updatedAt: new Date(),
    })
    .where(eq(supplierJobs.id, jobId));

  await logActivity(courierId, "job_picked_up", { jobId });

  return { success: true };
}

/**
 * Mark job as delivered
 */
export async function markJobDelivered(jobId: number, courierId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(supplierJobs)
    .set({ 
      status: 'delivered',
      updatedAt: new Date(),
    })
    .where(eq(supplierJobs.id, jobId));

  await logActivity(courierId, "job_delivered", { jobId });

  return { success: true };
}


/**
 * Get all jobs history for a specific supplier
 */
export async function getSupplierJobsHistory(supplierId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      sj.id,
      sj."quoteId",
      sj."customerId",
      sj."sizeQuantityId",
      sj.quantity,
      sj."pricePerUnit",
      sj.status,
      sj."supplierMarkedReady",
      sj."supplierReadyAt",
      sj."courierConfirmedReady",
      sj."supplierRating",
      sj."promisedDeliveryDays",
      sj."createdAt",
      customer.name as "customerName",
      customer."companyName" as "customerCompany",
      ps.name as "sizeName",
      bp.name as "productName",
      CASE 
        WHEN sj."supplierReadyAt" IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (sj."supplierReadyAt" - sj."createdAt")) / 86400
        ELSE NULL
      END as "actualDeliveryDays"
    FROM supplier_jobs sj
    LEFT JOIN users customer ON sj."customerId" = customer.id
    LEFT JOIN size_quantities sq ON sj."sizeQuantityId" = sq.id
    LEFT JOIN product_sizes ps ON sq.size_id = ps.id
    LEFT JOIN base_products bp ON ps.product_id = bp.id
    WHERE sj."supplierId" = ${supplierId}
    ORDER BY sj.id DESC
  `);

  return result.rows.map((row: any) => ({
    id: row.id,
    quoteId: row.quoteId,
    customerId: row.customerId,
    sizeQuantityId: row.sizeQuantityId,
    quantity: row.quantity,
    pricePerUnit: row.pricePerUnit,
    status: row.status,
    supplierMarkedReady: row.supplierMarkedReady,
    supplierReadyAt: row.supplierReadyAt,
    courierConfirmedReady: row.courierConfirmedReady,
    supplierRating: row.supplierRating ? parseFloat(row.supplierRating) : null,
    promisedDeliveryDays: row.promisedDeliveryDays,
    createdAt: row.createdAt,
    customerName: row.customerName || 'לקוח לא מזוהה',
    customerCompany: row.customerCompany,
    sizeName: row.sizeName,
    productName: row.productName || 'מוצר לא מזוהה',
    actualDeliveryDays: row.actualDeliveryDays ? parseFloat(row.actualDeliveryDays) : null,
  }));
}


/**
 * Update job status with timestamps
 */
export async function updateJobStatus(jobId: number, status: string, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update based on status - separate queries to avoid SQL syntax issues
  if (status === 'ready') {
    await db.execute(sql`
      UPDATE supplier_jobs 
      SET status = ${status}, "supplierMarkedReady" = true, "supplierReadyAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${jobId}
    `);
  } else if (status === 'picked_up') {
    await db.execute(sql`
      UPDATE supplier_jobs 
      SET status = ${status}, "pickedUpAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${jobId}
    `);
  } else if (status === 'delivered') {
    await db.execute(sql`
      UPDATE supplier_jobs 
      SET status = ${status}, "deliveredAt" = NOW(), "actualDeliveryDate" = CURRENT_DATE, "updatedAt" = NOW()
      WHERE id = ${jobId}
    `);
  } else {
    await db.execute(sql`
      UPDATE supplier_jobs 
      SET status = ${status}, "updatedAt" = NOW()
      WHERE id = ${jobId}
    `);
  }

  if (userId) {
    await logActivity(userId, 'job_status_updated', { jobId, status });
  }

  return { success: true };
}
