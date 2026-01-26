/**
 * Activity Log Module
 * 
 * Handles activity logging for audit trail and user activity tracking.
 */

import { getDb, eq, desc, sql } from "./connection";
import { activityLog, users } from "../../drizzle/schema";

/**
 * Log an activity to the audit trail
 */
export async function logActivity(
  userId: number | null, 
  actionType: string, 
  details?: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(activityLog).values({
      userId: userId,
      actionType: actionType,
      details: details || {},
    });
  } catch (error) {
    console.error("[logActivity] Failed to log activity:", error);
  }
}

/**
 * Get recent activity log entries
 */
export async function getActivityLog(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db.select({
    id: activityLog.id,
    userId: activityLog.userId,
    actionType: activityLog.actionType,
    details: activityLog.details,
    createdAt: activityLog.createdAt,
    userName: users.name,
  })
    .from(activityLog)
    .leftJoin(users, eq(activityLog.userId, users.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

/**
 * Get activity log for a specific user
 */
export async function getUserActivityLog(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(activityLog)
    .where(eq(activityLog.userId, userId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

/**
 * Get activity log for a specific entity (quote, customer, etc.)
 */
export async function getEntityActivityLog(
  entityType: string, 
  entityId: number, 
  limit: number = 50
) {
  const db = await getDb();
  if (!db) return [];

  return await db.select({
    id: activityLog.id,
    userId: activityLog.userId,
    actionType: activityLog.actionType,
    details: activityLog.details,
    createdAt: activityLog.createdAt,
    userName: users.name,
  })
    .from(activityLog)
    .leftJoin(users, eq(activityLog.userId, users.id))
    .where(sql`${activityLog.details}->>'${entityType}Id' = ${entityId.toString()}`)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

// ==================== ACTIVITY FILTERS ====================

import { and, like, gte, lte, SQL } from "./connection";

export interface ActivityFilters {
  userId?: number;
  customerName?: string;
  employeeName?: string;
  actionType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Get filtered activity log
 */
export async function getFilteredActivity(filters: ActivityFilters = {}) {
  const db = await getDb();
  if (!db) {
    return { activities: [], total: 0 };
  }

  const conditions: SQL[] = [];

  if (filters.userId) {
    conditions.push(eq(activityLog.userId, filters.userId));
  }

  if (filters.customerName) {
    conditions.push(like(users.name, `%${filters.customerName}%`));
  }

  if (filters.employeeName) {
    conditions.push(like(users.name, `%${filters.employeeName}%`));
  }

  if (filters.actionType) {
    conditions.push(eq(activityLog.actionType, filters.actionType));
  }

  if (filters.startDate) {
    conditions.push(gte(activityLog.createdAt, filters.startDate));
  }

  if (filters.endDate) {
    conditions.push(lte(activityLog.createdAt, filters.endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(activityLog)
    .leftJoin(users, eq(activityLog.userId, users.id))
    .where(whereClause);

  const total = Number(countResult[0]?.count || 0);

  // Get activities
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const offset = (page - 1) * limit;

  const activities = await db.select({
    id: activityLog.id,
    userId: activityLog.userId,
    actionType: activityLog.actionType,
    details: activityLog.details,
    createdAt: activityLog.createdAt,
    userName: users.name,
    userEmail: users.email,
  })
    .from(activityLog)
    .leftJoin(users, eq(activityLog.userId, users.id))
    .where(whereClause)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)
    .offset(offset);

  return { activities, total };
}

/**
 * Get all unique action types
 */
export async function getActivityActionTypes() {
  const db = await getDb();
  if (!db) return [];

  const types = await db.selectDistinct({ actionType: activityLog.actionType })
    .from(activityLog)
    .orderBy(activityLog.actionType);

  return types.map(t => t.actionType);
}
