import { getDb } from "./db";
import { users, quotes, quoteItems, activityLog } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

interface CreateCustomerWithQuoteInput {
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    companyName?: string;
    address?: string;
  };
  quoteItems: Array<{
    sizeQuantityId: number;
    quantity: number;
  }>;
  notes?: string;
}

interface CreateCustomerWithQuoteResult {
  success: boolean;
  customerId: number;
  customerNumber?: number;
  quoteId: number;
  quoteNumber: number;
  isExistingCustomer: boolean;
  message: string;
}

// EMAIL UNIQUENESS FIX: Check if customer exists before creating new one
// If customer exists, create quote for existing customer and route directly to quotes list
export async function createCustomerWithQuote(input: CreateCustomerWithQuoteInput): Promise<CreateCustomerWithQuoteResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.customerInfo.email)) {
    throw new Error("Invalid email format");
  }

  // Normalize email to lowercase for consistent comparison
  const normalizedEmail = input.customerInfo.email.toLowerCase().trim();

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

  let customerId: number;
  let customerNumber: number | undefined;
  let isExistingCustomer = false;

  if (existingCustomer) {
    // Customer already exists - use existing customer
    customerId = existingCustomer.id;
    customerNumber = existingCustomer.customerNumber ?? undefined;
    isExistingCustomer = true;

    // Log that we're using existing customer
    await db.insert(activityLog).values({
      userId: customerId,
      actionType: "existing_customer_quote_request",
      details: {
        customerId,
        customerEmail: normalizedEmail,
        customerName: existingCustomer.name,
        customerStatus: existingCustomer.status,
        note: "Quote created for existing customer - skipping pending approvals",
      },
    });
  } else {
    // New customer - create with pending_approval status
    const customerSeqResult = await db.execute(sql`SELECT nextval('customer_number_seq') as next_num`) as any;
    customerNumber = Number(customerSeqResult.rows?.[0]?.next_num || customerSeqResult[0]?.next_num || Date.now());

    const customerResult = await db
      .insert(users)
      .values({
        openId: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: input.customerInfo.name,
        email: normalizedEmail,
        phone: input.customerInfo.phone,
        companyName: input.customerInfo.companyName || null,
        address: input.customerInfo.address || null,
        role: "customer",
        status: "pending_approval",
        customerNumber: customerNumber,
      })
      .returning();

    customerId = customerResult[0].id;
  }

  // Get next quote number from sequence
  const quoteSeqResult = await db.execute(sql`SELECT nextval('quote_number_seq') as next_num`) as any;
  const quoteNumber = Number(quoteSeqResult.rows?.[0]?.next_num || quoteSeqResult[0]?.next_num || Date.now());

  // Create quote request
  // For existing customers: status is 'draft' and goes directly to quotes list
  // For new customers: status is 'draft' and waits for customer approval first
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
    });
  }

  // Log activity
  await db.insert(activityLog).values({
    userId: null,
    actionType: isExistingCustomer ? "existing_customer_new_quote" : "customer_signup_quote_request",
    details: {
      customerId,
      customerNumber,
      customerName: input.customerInfo.name,
      customerEmail: normalizedEmail,
      quoteId,
      quoteNumber,
      itemCount: input.quoteItems.length,
      isExistingCustomer,
    },
  });

  // Return different messages based on whether customer is new or existing
  const message = isExistingCustomer
    ? "הצעת המחיר נוצרה בהצלחה! הלקוח כבר קיים במערכת - ההצעה נוספה לרשימת הצעות המחיר."
    : "בקשתך התקבלה בהצלחה! נשלח לך מייל עם פרטים נוספים";

  return {
    success: true,
    customerId,
    customerNumber,
    quoteId,
    quoteNumber,
    isExistingCustomer,
    message,
  };
}
