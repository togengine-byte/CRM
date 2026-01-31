/**
 * Customers Module
 * 
 * Customer management functions including CRUD operations,
 * pricelist assignments, and customer statistics.
 */

import { getDb, eq, and, desc, sql } from "./connection";
import { users, quotes, quoteItems, quoteAttachments, pricelists, customerPricelists, customerSignupRequests, activityLog } from "../../drizzle/schema";
import { logActivity } from "./activity";
import { CustomerFilters, SignupRequestFile } from "./types";

// ==================== CUSTOMER CRUD ====================

/**
 * Get customers with optional filters
 */
export async function getCustomers(filters: CustomerFilters = {}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  
  const role = filters.role || 'customer';
  conditions.push(eq(users.role, role));
  
  if (filters.status) {
    conditions.push(eq(users.status, filters.status));
  }

  const result = await db.select()
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.id));

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    return result.filter(user => 
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.companyName?.toLowerCase().includes(searchLower) ||
      user.phone?.includes(searchLower)
    );
  }

  return result;
}

/**
 * Get customer by ID with related data
 */
export async function getCustomerById(customerId: number) {
  const db = await getDb();
  if (!db) return null;

  const [customer] = await db.select()
    .from(users)
    .where(eq(users.id, customerId))
    .limit(1);

  if (!customer) return null;

  const quotesResult = await db.select({ count: sql<number>`count(*)` })
    .from(quotes)
    .where(eq(quotes.customerId, customerId));

  const pricelistsResult = await db.select({
    pricelist: pricelists,
  })
    .from(customerPricelists)
    .innerJoin(pricelists, eq(customerPricelists.pricelistId, pricelists.id))
    .where(eq(customerPricelists.customerId, customerId));

  return {
    ...customer,
    quotesCount: quotesResult[0]?.count || 0,
    pricelists: pricelistsResult.map(r => r.pricelist),
  };
}

/**
 * Approve customer and create quote from pending request data
 */
export async function approveCustomer(customerId: number, approvedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update customer status to active
  await db.update(users)
    .set({ status: 'active' })
    .where(eq(users.id, customerId));

  // Get pending quote request data from activity_log
  const pendingRequestResult = await db.select()
    .from(activityLog)
    .where(and(
      eq(activityLog.actionType, 'pending_quote_request_data'),
      eq(activityLog.userId, customerId)
    ))
    .orderBy(desc(activityLog.createdAt))
    .limit(1);

  const pendingRequest = pendingRequestResult[0];
  
  if (pendingRequest && pendingRequest.details) {
    // Parse details
    const details = typeof pendingRequest.details === 'string' 
      ? JSON.parse(pendingRequest.details) 
      : pendingRequest.details;
    
    const quoteItemsData = details.quoteItems || [];
    const attachmentsData = details.attachments || [];
    const notes = details.notes || null;

    if (quoteItemsData.length > 0 || attachmentsData.length > 0) {
      // Calculate total price from size_quantities
      let totalPrice = 0;
      for (const item of quoteItemsData) {
        const priceResult = await db.execute(sql`
          SELECT price FROM size_quantities WHERE id = ${item.sizeQuantityId}
        `);
        const price = priceResult.rows[0]?.price || 0;
        totalPrice += Number(price) * (item.quantity || 1);
      }

      // Create the quote
      const [newQuote] = await db.insert(quotes).values({
        customerId,
        employeeId: approvedBy,
        status: 'draft',
        version: 1,
        finalValue: String(totalPrice),
        notes,
      }).returning();

      // Create quote items
      for (const item of quoteItemsData) {
        const priceResult = await db.execute(sql`
          SELECT price FROM size_quantities WHERE id = ${item.sizeQuantityId}
        `);
        const price = priceResult.rows[0]?.price || 0;

        await db.insert(quoteItems).values({
          quoteId: newQuote.id,
          sizeQuantityId: item.sizeQuantityId,
          quantity: item.quantity || 1,
          priceAtTimeOfQuote: String(Number(price) * (item.quantity || 1)),
          addonIds: item.addonIds || [],
        });
      }

      // Create quote attachments
      for (const att of attachmentsData) {
        await db.insert(quoteAttachments).values({
          quoteId: newQuote.id,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          s3Key: att.s3Key || '',
          fileSize: att.fileSize,
          mimeType: att.mimeType,
        });
      }

      await logActivity(approvedBy, "customer_approved", { 
        customerId, 
        quoteId: newQuote.id,
        itemCount: quoteItemsData.length,
        attachmentCount: attachmentsData.length 
      });

      return { success: true, quoteId: newQuote.id };
    }
  }

  // If no pending request data, just activate existing draft quotes
  const customerQuotes = await db.select({ id: quotes.id })
    .from(quotes)
    .where(and(eq(quotes.customerId, customerId), eq(quotes.status, 'draft')));

  for (const quote of customerQuotes) {
    await db.update(quotes)
      .set({ status: 'sent' })
      .where(eq(quotes.id, quote.id));
  }

  await logActivity(approvedBy, "customer_approved", { customerId });

  return { success: true };
}

/**
 * Reject customer
 */
export async function rejectCustomer(customerId: number, rejectedBy: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ status: 'rejected' })
    .where(eq(users.id, customerId));

  await logActivity(rejectedBy, "customer_rejected", { customerId, reason });

  return { success: true };
}

/**
 * Update customer details
 */
export async function updateCustomer(input: {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  address?: string;
  billingEmail?: string;
  status?: 'pending_approval' | 'active' | 'rejected' | 'deactivated';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.companyName !== undefined) updateData.companyName = input.companyName;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.billingEmail !== undefined) updateData.billingEmail = input.billingEmail;
  if (input.status !== undefined) updateData.status = input.status;

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields to update");
  }

  await db.update(users)
    .set(updateData)
    .where(eq(users.id, input.id));

  await logActivity(null, "customer_updated", { customerId: input.id, changes: updateData });

  return await getCustomerById(input.id);
}

// ==================== CUSTOMER PRICELISTS ====================

/**
 * Get pricelists assigned to a customer
 */
export async function getCustomerPricelists(customerId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    pricelist: pricelists,
  })
    .from(customerPricelists)
    .innerJoin(pricelists, eq(customerPricelists.pricelistId, pricelists.id))
    .where(eq(customerPricelists.customerId, customerId));

  return result.map(r => r.pricelist);
}

/**
 * Assign pricelist to customer
 */
export async function assignPricelistToCustomer(customerId: number, pricelistId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select()
    .from(customerPricelists)
    .where(and(
      eq(customerPricelists.customerId, customerId),
      eq(customerPricelists.pricelistId, pricelistId)
    ))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Pricelist already assigned to customer");
  }

  await db.insert(customerPricelists).values({
    customerId,
    pricelistId,
  });

  await logActivity(null, "pricelist_assigned", { customerId, pricelistId });

  return { success: true };
}

/**
 * Remove pricelist from customer
 */
export async function removePricelistFromCustomer(customerId: number, pricelistId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(customerPricelists)
    .where(and(
      eq(customerPricelists.customerId, customerId),
      eq(customerPricelists.pricelistId, pricelistId)
    ));

  await logActivity(null, "pricelist_removed", { customerId, pricelistId });

  return { success: true };
}

/**
 * Set customer's default pricelist (stored in users.pricelistId)
 */
export async function setCustomerDefaultPricelist(customerId: number, pricelistId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users)
    .set({ pricelistId })
    .where(eq(users.id, customerId));

  await logActivity(null, "customer_pricelist_updated", { customerId, pricelistId });

  return { success: true };
}

// ==================== CUSTOMER STATISTICS ====================

/**
 * Get customer statistics
 */
export async function getCustomerStats() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, pending: 0, rejected: 0 };

  const result = await db.select({
    status: users.status,
    count: sql<number>`count(*)`,
  })
    .from(users)
    .where(eq(users.role, 'customer'))
    .groupBy(users.status);

  const stats = { total: 0, active: 0, pending: 0, rejected: 0 };
  
  for (const row of result) {
    const count = Number(row.count);
    stats.total += count;
    if (row.status === 'active') stats.active = count;
    if (row.status === 'pending_approval') stats.pending = count;
    if (row.status === 'rejected') stats.rejected = count;
  }

  return stats;
}

// ==================== CREATE CUSTOMER ====================

/**
 * Create a new customer directly (by employee/admin)
 */
export async function createCustomer(data: {
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  address?: string;
  billingEmail?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if email already exists
  const existing = await db.select().from(users).where(eq(users.email, data.email));
  if (existing.length > 0) {
    throw new Error("לקוח עם כתובת אימייל זו כבר קיים במערכת");
  }

  const [result] = await db.insert(users).values({
    name: data.name,
    email: data.email,
    phone: data.phone,
    companyName: data.companyName || null,
    address: data.address || null,
    billingEmail: data.billingEmail || null,
    role: 'customer',
    status: 'active', // Created by employee = already approved
    openId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }).returning();

  await logActivity(null, 'customer_created', {
    customerId: result.id,
    name: data.name,
    email: data.email,
  });

  return result;
}

// ==================== CUSTOMER SIGNUP REQUESTS ====================

/**
 * Create customer signup request
 */
export async function createCustomerSignupRequest(data: {
  name: string;
  email: string;
  phone: string;
  companyName: string | null;
  description: string;
  requestId: string;
  files: SignupRequestFile[];
  productId?: number | null;
  fileValidationWarnings?: any[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [result] = await db.insert(customerSignupRequests).values({
      requestId: data.requestId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      companyName: data.companyName,
      description: data.description,
      files: data.files,
      fileValidationWarnings: data.fileValidationWarnings || [],
      status: 'pending',
      productId: data.productId || null,
    }).returning();
    return result;
  } catch (error: any) {
    if (error.message?.includes('fileValidationWarnings') || error.code === '42703') {
      console.log('[createCustomerSignupRequest] Falling back without fileValidationWarnings column');
      const [result] = await db.insert(customerSignupRequests).values({
        requestId: data.requestId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        companyName: data.companyName,
        description: data.description,
        files: data.files,
        status: 'pending',
        productId: data.productId || null,
      } as any).returning();

      await logActivity(null, 'customer_signup_request', {
        requestId: data.requestId,
        name: data.name,
        email: data.email,
        filesCount: data.files.length,
      });

      return result;
    }
    throw error;
  }
}

/**
 * Get customer signup requests
 */
export async function getCustomerSignupRequests(status?: string) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(customerSignupRequests);
  
  if (status) {
    query = query.where(eq(customerSignupRequests.status, status)) as any;
  }

  return await query.orderBy(desc(customerSignupRequests.createdAt));
}

/**
 * Get customer signup request by ID
 */
export async function getCustomerSignupRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.select()
    .from(customerSignupRequests)
    .where(eq(customerSignupRequests.id, id))
    .limit(1);

  return result || null;
}

/**
 * Approve customer signup request
 */
export async function approveCustomerSignupRequest(requestId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const request = await getCustomerSignupRequestById(requestId);
  if (!request) throw new Error("Request not found");

  const openId = `customer-${crypto.randomUUID()}`;
  await db.insert(users).values({
    openId,
    name: request.name,
    email: request.email,
    phone: request.phone,
    companyName: request.companyName,
    role: 'customer',
    status: 'active',
  });

  await db.update(customerSignupRequests)
    .set({
      status: 'approved',
      processedAt: new Date(),
      processedBy: userId,
    })
    .where(eq(customerSignupRequests.id, requestId));

  await logActivity(userId, 'customer_signup_approved', { requestId, email: request.email });

  return { success: true };
}

/**
 * Reject customer signup request
 */
export async function rejectCustomerSignupRequest(requestId: number, userId: number, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(customerSignupRequests)
    .set({
      status: 'rejected',
      processedAt: new Date(),
      processedBy: userId,
      notes,
    })
    .where(eq(customerSignupRequests.id, requestId));

  await logActivity(userId, 'customer_signup_rejected', { requestId, notes });

  return { success: true };
}
