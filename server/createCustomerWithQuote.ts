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

export async function createCustomerWithQuote(input: CreateCustomerWithQuoteInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get next customer number from sequence
  const [customerSeqResult] = await db.execute(sql`SELECT nextval('customer_number_seq') as next_num`);
  const customerNumber = Number((customerSeqResult as any).next_num);

  // Create customer with pending_approval status
  const customerResult = await db
    .insert(users)
    .values({
      openId: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: input.customerInfo.name,
      email: input.customerInfo.email,
      phone: input.customerInfo.phone,
      companyName: input.customerInfo.companyName || null,
      address: input.customerInfo.address || null,
      role: "customer",
      status: "pending_approval",
      customerNumber: customerNumber,
    })
    .returning();

  const customerId = customerResult[0].id;

  // Get next quote number from sequence
  const [quoteSeqResult] = await db.execute(sql`SELECT nextval('quote_number_seq') as next_num`);
  const quoteNumber = Number((quoteSeqResult as any).next_num);

  // Create quote request with pending_approval status
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

  // Log activity directly to avoid circular dependency
  await db.insert(activityLog).values({
    userId: null,
    actionType: "customer_signup_quote_request",
    details: {
      customerId,
      customerNumber,
      customerName: input.customerInfo.name,
      customerEmail: input.customerInfo.email,
      quoteId,
      quoteNumber,
      itemCount: input.quoteItems.length,
    },
  });

  return {
    success: true,
    customerId,
    customerNumber,
    quoteId,
    quoteNumber,
    message: "בקשתך התקבלה בהצלחה! נשלח לך מייל עם פרטים נוספים",
  };
}
