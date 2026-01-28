/**
 * Users Module
 * 
 * Core user management functions including authentication,
 * dashboard stats, and user CRUD operations.
 */

import { getDb, eq, and, desc, sql, inArray } from "./connection";
import { users, quotes, activityLog } from "../../drizzle/schema";
import { logActivity } from "./activity";
import { UserPermissions, DEFAULT_PERMISSIONS } from "./types";

// ==================== AUTHENTICATION ====================

/**
 * Get user by OpenID (for OAuth login)
 */
export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;

  const [user] = await db.select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return user || null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result || null;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result || null;
}

/**
 * Create or update user from OAuth
 */
export async function upsertUser(data: {
  openId: string;
  email?: string;
  name?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserByOpenId(data.openId);
  
  if (existing) {
    await db.update(users)
      .set({
        email: data.email || existing.email,
        name: data.name || existing.name,
        updatedAt: new Date(),
      })
      .where(eq(users.openId, data.openId));
    
    return await getUserByOpenId(data.openId);
  }

  const [newUser] = await db.insert(users).values({
    openId: data.openId,
    email: data.email || null,
    name: data.name || null,
    role: 'customer',
    status: 'pending_approval',
  }).returning();

  return newUser;
}

// ==================== DASHBOARD ====================

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return {
    totalQuotes: 0,
    pendingQuotes: 0,
    totalCustomers: 0,
    totalRevenue: 0,
  };

  const [quotesStats] = await db.select({
    total: sql<number>`count(*)`,
    pending: sql<number>`SUM(CASE WHEN ${quotes.status} = 'draft' THEN 1 ELSE 0 END)`,
    revenue: sql<number>`COALESCE(SUM(CASE WHEN ${quotes.status} IN ('approved', 'in_production', 'ready', 'delivered') THEN CAST(${quotes.finalValue} AS DECIMAL) ELSE 0 END), 0)`,
  }).from(quotes);

  const [customersStats] = await db.select({
    total: sql<number>`count(*)`,
  })
    .from(users)
    .where(and(eq(users.role, 'customer'), eq(users.status, 'active')));

  return {
    totalQuotes: Number(quotesStats?.total || 0),
    pendingQuotes: Number(quotesStats?.pending || 0),
    totalCustomers: Number(customersStats?.total || 0),
    totalRevenue: Number(quotesStats?.revenue || 0),
  };
}

/**
 * Get recent activity for dashboard
 */
export async function getRecentActivity(limit: number = 10) {
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

// ==================== USER MANAGEMENT ====================

/**
 * Get pending users awaiting approval
 */
export async function getPendingUsers(role?: string) {
  const db = await getDb();
  if (!db) return [];

  let conditions = [eq(users.status, 'pending_approval')];
  if (role) {
    conditions.push(eq(users.role, role as any));
  }

  return await db.select()
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.id));
}

/**
 * Get all staff members (admin, employee, supplier, courier)
 */
export async function getAllStaff() {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(users)
    .where(
      inArray(users.role, ['admin', 'employee', 'supplier', 'courier'])
    )
    .orderBy(users.role, users.name);
}

/**
 * Create a new staff user
 */
export async function createStaffUser(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  companyName?: string;
  role: 'employee' | 'supplier' | 'courier';
  permissions?: UserPermissions;
}, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if email already exists
  const existing = await getUserByEmail(data.email);
  if (existing) {
    throw new Error("כתובת המייל כבר קיימת במערכת");
  }

  // Hash the password
  const bcrypt = await import('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(data.password, salt);

  const openId = `${data.role}-${crypto.randomUUID()}`;
  const defaultPerms = DEFAULT_PERMISSIONS[data.role] || {};
  
  const [newUser] = await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    password: hashedPassword,
    phone: data.phone || null,
    companyName: data.companyName || null,
    role: data.role,
    status: 'active',
    permissions: data.permissions || defaultPerms,
    loginMethod: 'email',
  }).returning();

  await logActivity(adminId, 'staff_user_created', { 
    userId: newUser.id, 
    role: data.role,
    email: data.email 
  });

  return newUser;
}

/**
 * Update user permissions
 */
export async function updateUserPermissions(userId: number, permissions: UserPermissions, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ 
      permissions,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'user_permissions_updated', { userId, permissions });

  return { success: true };
}

/**
 * Update user role
 */
export async function updateUserRole(userId: number, role: string, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const defaultPerms = DEFAULT_PERMISSIONS[role as keyof typeof DEFAULT_PERMISSIONS] || {};

  await db.update(users)
    .set({ 
      role: role as any,
      permissions: defaultPerms,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'user_role_updated', { userId, role });

  return { success: true };
}

/**
 * Update staff user details
 */
export async function updateStaffUser(userId: number, data: {
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
}, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.email) {
    const existing = await getUserByEmail(data.email);
    if (existing && existing.id !== userId) {
      throw new Error("כתובת המייל כבר קיימת במערכת");
    }
  }

  await db.update(users)
    .set({ 
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'staff_user_updated', { userId, ...data });

  return { success: true };
}

/**
 * Delete (deactivate) staff user
 */
export async function deleteStaffUser(userId: number, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (userId === adminId) {
    throw new Error("לא ניתן למחוק את המשתמש שלך");
  }

  await db.update(users)
    .set({ 
      status: 'deactivated',
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'staff_user_deleted', { userId });

  return { success: true };
}

/**
 * Approve user
 */
export async function approveUser(userId: number, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ status: 'active' })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'user_approved', { userId });

  return { success: true };
}

/**
 * Reject user
 */
export async function rejectUser(userId: number, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ status: 'rejected' })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'user_rejected', { userId });

  return { success: true };
}

/**
 * Deactivate user
 */
export async function deactivateUser(userId: number, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ status: 'deactivated' })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'user_deactivated', { userId });

  return { success: true };
}

/**
 * Reactivate user
 */
export async function reactivateUser(userId: number, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ status: 'active' })
    .where(eq(users.id, userId));

  await logActivity(adminId, 'user_reactivated', { userId });

  return { success: true };
}
