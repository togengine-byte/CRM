import { getDb } from "./db";
import { users, quotes, quoteItems } from "../drizzle/schema";
import { logActivity } from "./db";

interface CreateCustomerWithQuoteInput {
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    companyName?: string;
    address?: string;
  };
  quoteItems: Array<{
    productVariantId: number;
    quantity: number;
  }>;
  notes?: string;
}

export async function createCustomerWithQuote(input: CreateCustomerWithQuoteInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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
    })
    .returning();

  const customerId = customerResult[0].id;

  // Create quote request with pending_approval status
  const quoteResult = await db
    .insert(quotes)
    .values({
      customerId: customerId,
      status: "draft",
      version: 1,
    })
    .returning();

  const quoteId = quoteResult[0].id;

  // Add quote items
  for (const item of input.quoteItems) {
    await db.insert(quoteItems).values({
      quoteId: quoteId,
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      priceAtTimeOfQuote: 0, // Will be calculated by employee
    });
  }

  // Log activity
  await logActivity(null, "customer_signup_quote_request", {
    customerId,
    customerName: input.customerInfo.name,
    customerEmail: input.customerInfo.email,
    quoteId,
    itemCount: input.quoteItems.length,
  });

  return {
    success: true,
    customerId,
    quoteId,
    message: "בקשתך התקבלה בהצלחה! נשלח לך מייל עם פרטים נוספים",
  };
}
