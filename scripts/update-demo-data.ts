/**
 * Script to update demo data in supplier_jobs with higher values
 * Run with: npx tsx scripts/update-demo-data.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

async function updateDemoData() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const db = drizzle(DATABASE_URL);
  
  // Monthly revenue targets (growing trend towards year end)
  const monthlyData = [
    { month: '2025-01', pricePerUnit: 15000, quantity: 50 },  // ~750K
    { month: '2025-02', pricePerUnit: 16000, quantity: 52 },  // ~832K
    { month: '2025-03', pricePerUnit: 17000, quantity: 48 },  // ~816K
    { month: '2025-04', pricePerUnit: 18000, quantity: 50 },  // ~900K
    { month: '2025-05', pricePerUnit: 19000, quantity: 52 },  // ~988K
    { month: '2025-06', pricePerUnit: 20000, quantity: 48 },  // ~960K
    { month: '2025-07', pricePerUnit: 18000, quantity: 45 },  // ~810K (summer dip)
    { month: '2025-08', pricePerUnit: 17000, quantity: 42 },  // ~714K (summer dip)
    { month: '2025-09', pricePerUnit: 21000, quantity: 50 },  // ~1.05M
    { month: '2025-10', pricePerUnit: 22000, quantity: 52 },  // ~1.14M
    { month: '2025-11', pricePerUnit: 23000, quantity: 55 },  // ~1.26M
    { month: '2025-12', pricePerUnit: 24000, quantity: 58 },  // ~1.39M
  ];

  console.log("Updating demo data in supplier_jobs...");

  for (const data of monthlyData) {
    const [year, month] = data.month.split('-');
    const startDate = `${data.month}-01`;
    const nextMonth = parseInt(month) === 12 ? '01' : String(parseInt(month) + 1).padStart(2, '0');
    const nextYear = parseInt(month) === 12 ? String(parseInt(year) + 1) : year;
    const endDate = `${nextYear}-${nextMonth}-01`;

    try {
      const result = await db.execute(sql`
        UPDATE supplier_jobs 
        SET "pricePerUnit" = ${data.pricePerUnit}, quantity = ${data.quantity}
        WHERE status = 'delivered' 
        AND "createdAt" >= ${startDate}::timestamp 
        AND "createdAt" < ${endDate}::timestamp
      `);
      
      console.log(`Updated ${data.month}: pricePerUnit=${data.pricePerUnit}, quantity=${data.quantity}`);
    } catch (error) {
      console.error(`Error updating ${data.month}:`, error);
    }
  }

  console.log("Done!");
  process.exit(0);
}

updateDemoData();
