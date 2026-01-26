/**
 * Quotes Module
 * 
 * Quote management functions including CRUD operations,
 * status management, pricing, and attachments.
 */

import { getDb, eq, and, desc, sql, inArray } from "./connection";
import { 
  quotes, 
  quoteItems, 
  quoteAttachments,
  users,
  activityLog
} from "../../drizzle/schema";
import { logActivity } from "./activity";
import { CreateQuoteRequest, UpdateQuoteRequest, ReviseQuoteRequest } from "./types";

// ==================== QUOTE CRUD ====================

/**
 * Get all quotes with optional filters
 */
export async function getQuotes(filters?: {
  status?: string;
  customerId?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const results = await db.select({
    id: quotes.id,
    customerId: quotes.customerId,
    employeeId: quotes.employeeId,
    status: quotes.status,
    version: quotes.version,
    parentQuoteId: quotes.parentQuoteId,
    finalValue: quotes.finalValue,
    totalSupplierCost: quotes.totalSupplierCost,
    rejectionReason: quotes.rejectionReason,
    dealRating: quotes.dealRating,
    autoProduction: quotes.autoProduction,
    createdAt: quotes.createdAt,
    updatedAt: quotes.updatedAt,
    customerName: users.name,
    customerEmail: users.email,
  })
  .from(quotes)
  .leftJoin(users, eq(quotes.customerId, users.id))
  .orderBy(desc(quotes.id))
  .limit(filters?.limit || 50);
  
  let filtered = results;
  if (filters?.status) {
    filtered = filtered.filter(q => q.status === filters.status);
  }
  if (filters?.customerId) {
    filtered = filtered.filter(q => q.customerId === filters.customerId);
  }

  return filtered;
}

/**
 * Get quote by ID with items and attachments
 */
export async function getQuoteById(quoteId: number) {
  const db = await getDb();
  if (!db) return null;

  const [quote] = await db.select({
    id: quotes.id,
    customerId: quotes.customerId,
    employeeId: quotes.employeeId,
    status: quotes.status,
    version: quotes.version,
    parentQuoteId: quotes.parentQuoteId,
    pricelistId: quotes.pricelistId,
    finalValue: quotes.finalValue,
    rejectionReason: quotes.rejectionReason,
    dealRating: quotes.dealRating,
    autoProduction: quotes.autoProduction,
    createdAt: quotes.createdAt,
    updatedAt: quotes.updatedAt,
  })
  .from(quotes)
  .where(eq(quotes.id, quoteId))
  .limit(1);

  if (!quote) return null;

  const items = await db.select({
    id: quoteItems.id,
    sizeQuantityId: quoteItems.sizeQuantityId,
    quantity: quoteItems.quantity,
    priceAtTimeOfQuote: quoteItems.priceAtTimeOfQuote,
    isUpsell: quoteItems.isUpsell,
    supplierId: quoteItems.supplierId,
    supplierCost: quoteItems.supplierCost,
    deliveryDays: quoteItems.deliveryDays,
    supplierName: users.name,
    supplierCompany: users.companyName,
  })
  .from(quoteItems)
  .leftJoin(users, eq(quoteItems.supplierId, users.id))
  .where(eq(quoteItems.quoteId, quoteId));

  const attachments = await db.select()
  .from(quoteAttachments)
  .where(eq(quoteAttachments.quoteId, quoteId));

  return {
    ...quote,
    items,
    attachments,
  };
}

/**
 * Get quote history (all versions)
 */
export async function getQuoteHistory(quoteId: number) {
  const db = await getDb();
  if (!db) return [];

  if (!Number.isInteger(quoteId) || quoteId <= 0) {
    console.error("[getQuoteHistory] Invalid quoteId:", quoteId);
    return [];
  }

  const [currentQuote] = await db.select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (!currentQuote) return [];

  // Find root quote with circular reference protection
  let rootId = quoteId;
  if (currentQuote.parentQuoteId) {
    let parentId: number | null = currentQuote.parentQuoteId;
    const visitedParents = new Set<number>();
    visitedParents.add(quoteId);
    
    const MAX_PARENT_ITERATIONS = 1000;
    let iterations = 0;
    
    while (parentId && iterations < MAX_PARENT_ITERATIONS) {
      if (visitedParents.has(parentId)) {
        console.warn(`[getQuoteHistory] Circular reference detected at quote ${parentId}. Breaking loop.`);
        break;
      }
      visitedParents.add(parentId);
      iterations++;
      
      const [parent] = await db.select()
        .from(quotes)
        .where(eq(quotes.id, parentId))
        .limit(1);
        
      if (!parent) {
        rootId = parentId;
        break;
      }
      
      if (parent.parentQuoteId) {
        parentId = parent.parentQuoteId;
      } else {
        rootId = parent.id;
        break;
      }
    }
    
    if (iterations >= MAX_PARENT_ITERATIONS) {
      console.error(`[getQuoteHistory] Max iterations reached for quote ${quoteId}. Possible data corruption.`);
    }
  }

  const allQuotes = await db.select({
    id: quotes.id,
    version: quotes.version,
    status: quotes.status,
    finalValue: quotes.finalValue,
    createdAt: quotes.createdAt,
    parentQuoteId: quotes.parentQuoteId,
  })
  .from(quotes)
  .orderBy(quotes.version);

  const history: typeof allQuotes = [];
  const visited = new Set<number>();
  
  const MAX_CHAIN_SIZE = 10000;
  
  const collectChain = async (id: number, depth: number = 0) => {
    if (visited.has(id)) return;
    if (depth > MAX_CHAIN_SIZE) {
      console.error(`[getQuoteHistory] Max chain depth reached. Stopping collection.`);
      return;
    }
    
    visited.add(id);
    
    const quote = allQuotes.find(q => q.id === id);
    if (quote) {
      history.push(quote);
      const children = allQuotes.filter(q => q.parentQuoteId === id);
      for (const child of children) {
        await collectChain(child.id, depth + 1);
      }
    }
  };

  await collectChain(rootId);
  
  return history.sort((a, b) => a.version - b.version);
}

// ==================== QUOTE OPERATIONS ====================

/**
 * Create quote request
 */
export async function createQuoteRequest(data: CreateQuoteRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const seqResult = await db.execute(sql`SELECT nextval('quote_number_seq') as next_num`) as any;
    const quoteNumber = Number(seqResult.rows?.[0]?.next_num || seqResult[0]?.next_num || 1);

    const result = await db.insert(quotes).values({
      customerId: data.customerId,
      status: "draft",
      version: 1,
      quoteNumber: quoteNumber,
    }).returning({ id: quotes.id });

    const quoteId = result[0]?.id;
    if (!quoteId) {
      throw new Error("Failed to create quote - no ID returned");
    }

    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        await db.insert(quoteItems).values({
          quoteId: quoteId,
          sizeQuantityId: item.sizeQuantityId,
          quantity: item.quantity,
          priceAtTimeOfQuote: "0",
        });
      }
    }

    await db.insert(activityLog).values({
      userId: data.customerId,
      actionType: "QUOTE_REQUESTED",
      details: { quoteId: quoteId, quoteNumber: quoteNumber },
    });

    return { id: quoteId, quoteNumber: quoteNumber, success: true };
  } catch (error) {
    console.error("[createQuoteRequest] Failed to create quote:", error);
    throw new Error("Failed to create quote request. Please try again.");
  }
}

/**
 * Update quote
 */
export async function updateQuote(data: UpdateQuoteRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {
    employeeId: data.employeeId,
  };
  
  if (data.items && data.items.length > 0) {
    const calculatedFinalValue = data.items.reduce((sum, item) => {
      return sum + (item.priceAtTimeOfQuote * item.quantity);
    }, 0);
    updateData.finalValue = calculatedFinalValue.toString();
  } else if (data.finalValue !== undefined) {
    updateData.finalValue = data.finalValue.toString();
  }

  await db.update(quotes)
    .set(updateData)
    .where(eq(quotes.id, data.quoteId));

  if (data.items) {
    await db.delete(quoteItems).where(eq(quoteItems.quoteId, data.quoteId));
    
    for (const item of data.items) {
      await db.insert(quoteItems).values({
        quoteId: data.quoteId,
        sizeQuantityId: item.sizeQuantityId,
        quantity: item.quantity,
        priceAtTimeOfQuote: item.priceAtTimeOfQuote.toString(),
        isUpsell: item.isUpsell || false,
        supplierId: item.supplierId || null,
        supplierCost: item.supplierCost?.toString() || null,
        deliveryDays: item.deliveryDays || null,
      });
    }
  }

  await db.insert(activityLog).values({
    userId: data.employeeId,
    actionType: "QUOTE_UPDATED",
    details: { quoteId: data.quoteId },
  });

  return { success: true };
}

/**
 * Revise quote (create new version)
 */
export async function reviseQuote(data: ReviseQuoteRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [currentQuote] = await db.select()
    .from(quotes)
    .where(eq(quotes.id, data.quoteId))
    .limit(1);

  if (!currentQuote) throw new Error("Quote not found");

  await db.update(quotes)
    .set({ status: "superseded" })
    .where(eq(quotes.id, data.quoteId));

  const result = await db.insert(quotes).values({
    customerId: currentQuote.customerId,
    employeeId: data.employeeId,
    status: "draft",
    version: currentQuote.version + 1,
    parentQuoteId: data.quoteId,
  }).returning();

  const newQuoteId = result[0].id;

  const items = await db.select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, data.quoteId));

  for (const item of items) {
    await db.insert(quoteItems).values({
      quoteId: Number(newQuoteId),
      sizeQuantityId: item.sizeQuantityId,
      quantity: item.quantity,
      priceAtTimeOfQuote: item.priceAtTimeOfQuote,
      isUpsell: item.isUpsell,
      supplierId: item.supplierId,
      supplierCost: item.supplierCost,
      deliveryDays: item.deliveryDays,
    });
  }

  await db.insert(activityLog).values({
    userId: data.employeeId,
    actionType: "QUOTE_REVISED",
    details: { oldQuoteId: data.quoteId, newQuoteId: Number(newQuoteId), version: currentQuote.version + 1 },
  });

  return { id: Number(newQuoteId), version: currentQuote.version + 1, success: true };
}

/**
 * Update quote status
 */
export async function updateQuoteStatus(quoteId: number, status: string, employeeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(quotes)
    .set({ status: status as any })
    .where(eq(quotes.id, quoteId));

  await db.insert(activityLog).values({
    userId: employeeId,
    actionType: `QUOTE_${status.toUpperCase()}`,
    details: { quoteId },
  });

  return { success: true };
}

/**
 * Reject quote
 */
export async function rejectQuote(quoteId: number, reason: string, employeeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(quotes)
    .set({ 
      status: "rejected",
      rejectionReason: reason,
    })
    .where(eq(quotes.id, quoteId));

  await db.insert(activityLog).values({
    userId: employeeId,
    actionType: "QUOTE_REJECTED",
    details: { quoteId, reason },
  });

  return { success: true };
}

/**
 * Rate deal
 */
export async function rateDeal(quoteId: number, rating: number, employeeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (rating < 1 || rating > 10) {
    throw new Error("Rating must be between 1 and 10");
  }

  const [quote] = await db.select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (!quote) throw new Error("Quote not found");

  await db.update(quotes)
    .set({ dealRating: rating })
    .where(eq(quotes.id, quoteId));

  await db.update(users)
    .set({
      totalRatingPoints: sql`${users.totalRatingPoints} + ${rating}`,
      ratedDealsCount: sql`${users.ratedDealsCount} + 1`,
    })
    .where(eq(users.id, quote.customerId));

  await db.insert(activityLog).values({
    userId: employeeId,
    actionType: "DEAL_RATED",
    details: { quoteId, rating },
  });

  return { success: true };
}

/**
 * Send quote to customer
 */
export async function sendQuoteToCustomer(quoteId: number, employeeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!Number.isInteger(quoteId) || quoteId <= 0) {
    throw new Error("Invalid quote ID");
  }

  const [quote] = await db.select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (!quote) {
    throw new Error("Quote not found");
  }

  if (quote.status !== 'draft') {
    throw new Error("Only draft quotes can be sent to customers");
  }

  // Get customer info - use email field (not billingEmail)
  const [customer] = await db.select({
    id: users.id,
    name: users.name,
    email: users.email, // Primary email for quote notifications
    billingEmail: users.billingEmail, // Only for invoices
  })
    .from(users)
    .where(eq(users.id, quote.customerId))
    .limit(1);

  if (!customer) {
    throw new Error("Customer not found");
  }

  const items = await db.select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quoteId));

  if (items.length === 0) {
    throw new Error("Cannot send empty quote");
  }

  const hasUnpricedItems = items.some(item => 
    !item.priceAtTimeOfQuote || parseFloat(item.priceAtTimeOfQuote.toString()) <= 0
  );

  if (hasUnpricedItems) {
    throw new Error("All items must have prices before sending to customer");
  }

  await db.update(quotes)
    .set({ 
      status: 'sent',
      employeeId: employeeId,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId));

  await logActivity(employeeId, "quote_sent_to_customer", { 
    quoteId, 
    customerId: quote.customerId,
    customerEmail: customer.email, // Log which email was used
    finalValue: quote.finalValue 
  });

  // TODO: Implement actual email sending here
  // Use customer.email (not customer.billingEmail) for quote notifications
  console.log(`[Quote ${quoteId}] Would send email to: ${customer.email}`);

  return { 
    success: true, 
    status: 'sent',
    customerEmail: customer.email, // Return the email for frontend confirmation
  };
}
