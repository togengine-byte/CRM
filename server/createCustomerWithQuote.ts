import { getDb } from "./db";
import { users, quotes, quoteItems, quoteAttachments, activityLog } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

interface Attachment {
  fileName: string;
  fileUrl: string;
  s3Key: string;
  fileSize?: number;
  mimeType?: string;
}

interface CreateCustomerWithQuoteInput {
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    companyName?: string;
    address?: string;
    billingEmail?: string;
    taxId?: string;
    contactPerson?: string;
  };
  quoteItems: Array<{
    sizeQuantityId: number;
    quantity: number;
    addonIds?: number[]; // Selected addon IDs for this item
    attachment?: Attachment; // File attached to this specific product
  }>;
  notes?: string;
  attachments?: Attachment[]; // General attachments (not linked to specific products)
}

interface CreateCustomerWithFilesOnlyInput {
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    companyName?: string;
    address?: string;
    billingEmail?: string;
    taxId?: string;
    contactPerson?: string;
  };
  description: string;
  attachments: Attachment[];
}

interface CreateCustomerWithQuoteResult {
  success: boolean;
  customerId: number;
  customerNumber?: number;
  quoteId?: number;
  quoteNumber?: number;
  isExistingCustomer: boolean;
  isPendingApproval: boolean;
  message: string;
}

// Helper function to get or create customer
async function getOrCreateCustomer(db: any, customerInfo: CreateCustomerWithQuoteInput['customerInfo']): Promise<{
  customerId: number;
  customerNumber?: number;
  isExistingCustomer: boolean;
  customerStatus: string;
}> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(customerInfo.email)) {
    throw new Error("Invalid email format");
  }

  // Normalize email to lowercase for consistent comparison
  const normalizedEmail = customerInfo.email.toLowerCase().trim();

  // Check if customer with this email already exists
  const [existingCustomer] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      customerNumber: users.customerNumber,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingCustomer) {
    // Customer already exists - use existing customer
    await db.insert(activityLog).values({
      userId: existingCustomer.id,
      actionType: "existing_customer_quote_request",
      details: {
        customerId: existingCustomer.id,
        customerEmail: normalizedEmail,
        customerName: existingCustomer.name,
        customerStatus: existingCustomer.status,
        note: "Quote request from existing customer",
      },
    });

    return {
      customerId: existingCustomer.id,
      customerNumber: existingCustomer.customerNumber ?? undefined,
      isExistingCustomer: true,
      customerStatus: existingCustomer.status,
    };
  }

  // New customer - create with pending_approval status
  const customerSeqResult = await db.execute(sql`SELECT nextval('customer_number_seq') as next_num`) as any;
  const customerNumber = Number(customerSeqResult.rows?.[0]?.next_num || customerSeqResult[0]?.next_num || Date.now());

  const customerResult = await db
    .insert(users)
    .values({
      openId: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: customerInfo.name,
      email: normalizedEmail,
      phone: customerInfo.phone,
      companyName: customerInfo.companyName || null,
      address: customerInfo.address || null,
      billingEmail: customerInfo.billingEmail || null,
      taxId: customerInfo.taxId || null,
      contactPerson: customerInfo.contactPerson || null,
      role: "customer",
      status: "pending_approval",
      customerNumber: customerNumber,
    })
    .returning();

  return {
    customerId: customerResult[0].id,
    customerNumber,
    isExistingCustomer: false,
    customerStatus: "pending_approval",
  };
}

// Helper function to save attachments
async function saveAttachments(db: any, quoteId: number, attachments: Attachment[], quoteItemId?: number) {
  for (const attachment of attachments) {
    await db.insert(quoteAttachments).values({
      quoteId,
      quoteItemId: quoteItemId || null,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      fileSize: attachment.fileSize || null,
      mimeType: attachment.mimeType || null,
    });
  }
}

// Helper function to save pending request data to activity log (for new customers)
async function savePendingRequestData(db: any, customerId: number, input: CreateCustomerWithQuoteInput | CreateCustomerWithFilesOnlyInput, isFilesOnly: boolean) {
  await db.insert(activityLog).values({
    userId: customerId,
    actionType: "pending_quote_request_data",
    details: {
      customerId,
      customerInfo: input.customerInfo,
      quoteItems: isFilesOnly ? [] : (input as CreateCustomerWithQuoteInput).quoteItems,
      notes: isFilesOnly ? (input as CreateCustomerWithFilesOnlyInput).description : (input as CreateCustomerWithQuoteInput).notes,
      attachments: input.attachments || (input as CreateCustomerWithFilesOnlyInput).attachments,
      isFilesOnly,
      savedAt: new Date().toISOString(),
    },
  });
}

// Create customer with quote (with products)
export async function createCustomerWithQuote(input: CreateCustomerWithQuoteInput): Promise<CreateCustomerWithQuoteResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { customerId, customerNumber, isExistingCustomer, customerStatus } = await getOrCreateCustomer(db, input.customerInfo);

  // If new customer (pending approval) - don't create quote yet, just save the request data
  if (!isExistingCustomer) {
    // Save the request data for later (when customer is approved)
    await savePendingRequestData(db, customerId, input, false);

    // Log activity
    await db.insert(activityLog).values({
      userId: null,
      actionType: "new_customer_signup_pending",
      details: {
        customerId,
        customerNumber,
        customerName: input.customerInfo.name,
        customerEmail: input.customerInfo.email.toLowerCase().trim(),
        customerPhone: input.customerInfo.phone,
        customerCompany: input.customerInfo.companyName,
        itemCount: input.quoteItems.length,
        attachmentCount: input.attachments?.length || 0,
        notes: input.notes || null,
        message: "New customer pending approval - quote will be created after approval",
      },
    });

    return {
      success: true,
      customerId,
      customerNumber,
      isExistingCustomer: false,
      isPendingApproval: true,
      message: "בקשתך התקבלה בהצלחה! נבדוק את הפרטים ונחזור אליך בהקדם.",
    };
  }

  // Existing customer - create quote directly
  // Get next quote number from sequence
  const quoteSeqResult = await db.execute(sql`SELECT nextval('quote_number_seq') as next_num`) as any;
  const quoteNumber = Number(quoteSeqResult.rows?.[0]?.next_num || quoteSeqResult[0]?.next_num || Date.now());

  // Create quote request
  const quoteResult = await db
    .insert(quotes)
    .values({
      customerId: customerId,
      status: "draft",
      version: 1,
      quoteNumber: quoteNumber,
    })
    .returning();

  const quoteId = quoteResult[0].id;

  // Add quote items
  for (const item of input.quoteItems) {
    await db.insert(quoteItems).values({
      quoteId: quoteId,
      sizeQuantityId: item.sizeQuantityId,
      quantity: item.quantity,
      priceAtTimeOfQuote: "0", // Will be calculated by employee
      addonIds: item.addonIds && item.addonIds.length > 0 
        ? JSON.stringify(item.addonIds) 
        : null,
    });
  }

  // Save attachments if provided
  if (input.attachments && input.attachments.length > 0) {
    await saveAttachments(db, quoteId, input.attachments);
  }

  // Log activity
  await db.insert(activityLog).values({
    userId: null,
    actionType: "existing_customer_new_quote",
    details: {
      customerId,
      customerNumber,
      customerName: input.customerInfo.name,
      customerEmail: input.customerInfo.email.toLowerCase().trim(),
      quoteId,
      quoteNumber,
      itemCount: input.quoteItems.length,
      attachmentCount: input.attachments?.length || 0,
      notes: input.notes || null,
      isExistingCustomer: true,
    },
  });

  return {
    success: true,
    customerId,
    customerNumber,
    quoteId,
    quoteNumber,
    isExistingCustomer: true,
    isPendingApproval: false,
    message: "הצעת המחיר נוצרה בהצלחה! נחזור אליך בהקדם עם פרטים נוספים.",
  };
}

// Create quote with files only (no products selected)
export async function createCustomerWithFilesOnly(input: CreateCustomerWithFilesOnlyInput): Promise<CreateCustomerWithQuoteResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { customerId, customerNumber, isExistingCustomer, customerStatus } = await getOrCreateCustomer(db, input.customerInfo);

  // If new customer (pending approval) - don't create quote yet, just save the request data
  if (!isExistingCustomer) {
    // Save the request data for later (when customer is approved)
    await savePendingRequestData(db, customerId, input, true);

    // Log activity
    await db.insert(activityLog).values({
      userId: null,
      actionType: "new_customer_files_only_pending",
      details: {
        customerId,
        customerNumber,
        customerName: input.customerInfo.name,
        customerEmail: input.customerInfo.email.toLowerCase().trim(),
        customerPhone: input.customerInfo.phone,
        customerCompany: input.customerInfo.companyName,
        description: input.description,
        attachmentCount: input.attachments.length,
        attachmentNames: input.attachments.map(a => a.fileName),
        message: "New customer pending approval - quote will be created after approval",
      },
    });

    return {
      success: true,
      customerId,
      customerNumber,
      isExistingCustomer: false,
      isPendingApproval: true,
      message: "בקשתך התקבלה בהצלחה! הקבצים נשמרו ונחזור אליך בהקדם.",
    };
  }

  // Existing customer - create quote directly
  // Get next quote number from sequence
  const quoteSeqResult = await db.execute(sql`SELECT nextval('quote_number_seq') as next_num`) as any;
  const quoteNumber = Number(quoteSeqResult.rows?.[0]?.next_num || quoteSeqResult[0]?.next_num || Date.now());

  // Create quote request (without items - files only)
  const quoteResult = await db
    .insert(quotes)
    .values({
      customerId: customerId,
      status: "draft",
      version: 1,
      quoteNumber: quoteNumber,
    })
    .returning();

  const quoteId = quoteResult[0].id;

  // Save attachments
  await saveAttachments(db, quoteId, input.attachments);

  // Log activity with description
  await db.insert(activityLog).values({
    userId: null,
    actionType: "existing_customer_files_only_quote",
    details: {
      customerId,
      customerNumber,
      customerName: input.customerInfo.name,
      customerEmail: input.customerInfo.email.toLowerCase().trim(),
      quoteId,
      quoteNumber,
      description: input.description,
      attachmentCount: input.attachments.length,
      attachmentNames: input.attachments.map(a => a.fileName),
      isExistingCustomer: true,
      isFilesOnlyQuote: true,
    },
  });

  return {
    success: true,
    customerId,
    customerNumber,
    quoteId,
    quoteNumber,
    isExistingCustomer: true,
    isPendingApproval: false,
    message: "בקשתך התקבלה! הקבצים הועלו בהצלחה. ניצור איתך קשר בהקדם.",
  };
}
