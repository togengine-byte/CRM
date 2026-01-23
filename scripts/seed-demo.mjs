/**
 * Demo Data Seed Script for PostgreSQL
 * Creates 5 customers, 5 suppliers, 5 products with sizes and quantities, and 5 quotes
 * Updated for new schema: productSizes + sizeQuantities (no variants)
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  try {
    const db = drizzle(client);

    console.log('🌱 Starting demo data seed...\n');

    // Generate unique openIds
    const generateOpenId = () => `demo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const timestamp = Date.now();

    // ==================== 5 CUSTOMERS ====================
    console.log('👥 Creating 5 customers...');
    const customers = [
      { name: 'דפוס אלון בע"מ', email: 'alon@demo.com', company: 'דפוס אלון', phone: '050-1234567', address: 'רחוב הרצל 15, תל אביב' },
      { name: 'מיכל כהן', email: 'michal@demo.com', company: 'סטודיו מיכל', phone: '052-2345678', address: 'שדרות רוטשילד 42, תל אביב' },
      { name: 'יוסי לוי', email: 'yossi@demo.com', company: 'לוי מדיה', phone: '054-3456789', address: 'רחוב ויצמן 8, רמת גן' },
      { name: 'שרה אברהם', email: 'sara@demo.com', company: 'אברהם פרסום', phone: '053-4567890', address: 'רחוב בן יהודה 100, ירושלים' },
      { name: 'דוד ישראלי', email: 'david@demo.com', company: 'ישראלי הפקות', phone: '058-5678901', address: 'רחוב העצמאות 25, חיפה' },
    ];

    const customerIds = [];
    for (const c of customers) {
      const result = await client.query(
        `INSERT INTO users ("openId", name, email, "loginMethod", role, status, phone, "companyName", address) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [generateOpenId(), c.name, c.email, 'demo', 'customer', 'active', c.phone, c.company, c.address]
      );
      customerIds.push(result.rows[0].id);
      console.log(`  ✓ ${c.name} (${c.company})`);
    }

    // ==================== 5 SUPPLIERS ====================
    console.log('\n🏭 Creating 5 suppliers...');
    const suppliers = [
      { name: 'דפוס הצפון', email: 'north@demo.com', company: 'דפוס הצפון בע"מ', phone: '04-1234567', address: 'אזור תעשייה צפון, חיפה' },
      { name: 'פרינט פלוס', email: 'print@demo.com', company: 'פרינט פלוס', phone: '03-2345678', address: 'אזור תעשייה הרצליה' },
      { name: 'אריזות ישראל', email: 'pack@demo.com', company: 'אריזות ישראל', phone: '08-3456789', address: 'אזור תעשייה באר שבע' },
      { name: 'מדבקות המרכז', email: 'stickers@demo.com', company: 'מדבקות המרכז', phone: '09-4567890', address: 'אזור תעשייה נתניה' },
      { name: 'דיגיטל פרינט', email: 'digital@demo.com', company: 'דיגיטל פרינט בע"מ', phone: '03-5678901', address: 'אזור תעשייה ראשון לציון' },
    ];

    const supplierIds = [];
    for (const s of suppliers) {
      const result = await client.query(
        `INSERT INTO users ("openId", name, email, "loginMethod", role, status, phone, "companyName", address, "totalRatingPoints", "ratedDealsCount") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [generateOpenId(), s.name, s.email, 'demo', 'supplier', 'active', s.phone, s.company, s.address, Math.floor(Math.random() * 50) + 40, Math.floor(Math.random() * 20) + 5]
      );
      supplierIds.push(result.rows[0].id);
      console.log(`  ✓ ${s.company}`);
    }

    // ==================== 5 BASE PRODUCTS + SIZES + QUANTITIES ====================
    console.log('\n📦 Creating 5 products with sizes and quantities...');
    const products = [
      { 
        name: 'כרטיסי ביקור', 
        description: 'כרטיסי ביקור מקצועיים בגדלים שונים',
        category: 'כרטיסים',
        sizes: [
          { name: 'סטנדרט', dimensions: '9x5cm', quantities: [{ qty: 100, price: 120 }, { qty: 500, price: 280 }] },
          { name: 'פרימיום', dimensions: '9x5cm למינציה', quantities: [{ qty: 100, price: 180 }, { qty: 500, price: 400 }] },
        ]
      },
      { 
        name: 'ברושורים', 
        description: 'ברושורים מקופלים לפרסום ושיווק',
        category: 'דפוס',
        sizes: [
          { name: 'A4 מקופל', dimensions: 'A4', quantities: [{ qty: 100, price: 450 }, { qty: 500, price: 1200 }] },
          { name: 'A5 מקופל', dimensions: 'A5', quantities: [{ qty: 100, price: 280 }, { qty: 500, price: 750 }] },
        ]
      },
      { 
        name: 'פוסטרים', 
        description: 'פוסטרים בגדלים שונים להדפסה',
        category: 'דפוס גדול',
        sizes: [
          { name: 'A3', dimensions: '297x420mm', quantities: [{ qty: 10, price: 150 }, { qty: 50, price: 500 }] },
          { name: 'A2', dimensions: '420x594mm', quantities: [{ qty: 10, price: 280 }, { qty: 50, price: 900 }] },
          { name: 'A1', dimensions: '594x841mm', quantities: [{ qty: 5, price: 350 }, { qty: 20, price: 1000 }] },
        ]
      },
      { 
        name: 'קופסאות מתנה', 
        description: 'קופסאות קרטון מעוצבות למתנות ומוצרים',
        category: 'אריזות',
        sizes: [
          { name: 'קטנה', dimensions: '10x10x10cm', quantities: [{ qty: 50, price: 320 }, { qty: 100, price: 550 }] },
          { name: 'בינונית', dimensions: '20x15x10cm', quantities: [{ qty: 50, price: 480 }, { qty: 100, price: 850 }] },
          { name: 'גדולה', dimensions: '30x20x15cm', quantities: [{ qty: 25, price: 520 }, { qty: 50, price: 900 }] },
        ]
      },
      { 
        name: 'מדבקות', 
        description: 'מדבקות בגזירה מותאמת אישית',
        category: 'מדבקות',
        sizes: [
          { name: 'עגולות 5cm', dimensions: 'קוטר 5cm', quantities: [{ qty: 100, price: 85 }, { qty: 500, price: 300 }] },
          { name: 'מרובעות 5x5', dimensions: '5x5cm', quantities: [{ qty: 100, price: 85 }, { qty: 500, price: 300 }] },
          { name: 'גזירה מותאמת', dimensions: 'מותאם אישית', quantities: [{ qty: 100, price: 150 }, { qty: 500, price: 550 }] },
        ]
      },
    ];

    const sizeQuantityIds = [];
    for (const p of products) {
      const productResult = await client.query(
        `INSERT INTO base_products (name, description, category, "isActive") VALUES ($1, $2, $3, $4) RETURNING id`,
        [p.name, p.description, p.category, true]
      );
      const productId = productResult.rows[0].id;
      console.log(`  ✓ ${p.name}`);

      for (const size of p.sizes) {
        const sizeResult = await client.query(
          `INSERT INTO product_sizes ("productId", name, dimensions, "isActive") VALUES ($1, $2, $3, $4) RETURNING id`,
          [productId, size.name, size.dimensions, true]
        );
        const sizeId = sizeResult.rows[0].id;
        console.log(`    - ${size.name} (${size.dimensions})`);

        for (const q of size.quantities) {
          const sqResult = await client.query(
            `INSERT INTO size_quantities ("sizeId", quantity, price, "isActive") VALUES ($1, $2, $3, $4) RETURNING id`,
            [sizeId, q.qty, q.price, true]
          );
          sizeQuantityIds.push({ 
            id: sqResult.rows[0].id, 
            price: q.price, 
            productName: p.name, 
            sizeName: size.name,
            quantity: q.qty 
          });
          console.log(`      • ${q.qty} יח' - ₪${q.price}`);
        }
      }
    }

    // ==================== DEFAULT PRICELIST ====================
    console.log('\n💰 Creating default pricelist...');
    const pricelistResult = await client.query(
      `INSERT INTO pricelists (name, description, "isDefault", "isActive") VALUES ($1, $2, $3, $4) RETURNING id`,
      ['מחירון ברירת מחדל', 'מחירון סטנדרטי לכל הלקוחות', true, true]
    );
    const pricelistId = pricelistResult.rows[0].id;

    for (const sq of sizeQuantityIds) {
      await client.query(
        `INSERT INTO pricelist_items ("pricelistId", "sizeQuantityId", "pricePerUnit") VALUES ($1, $2, $3)`,
        [pricelistId, sq.id, sq.price]
      );
    }
    console.log(`  ✓ מחירון ברירת מחדל עם ${sizeQuantityIds.length} פריטים`);

    // ==================== SUPPLIER PRICES ====================
    console.log('\n🏷️ Creating supplier prices...');
    for (const supplierId of supplierIds) {
      const selectedItems = sizeQuantityIds.slice(0, Math.floor(Math.random() * 8) + 5);
      for (const sq of selectedItems) {
        const supplierCost = Math.round(sq.price * (0.5 + Math.random() * 0.2));
        const deliveryDays = Math.floor(Math.random() * 5) + 2;
        await client.query(
          `INSERT INTO supplier_prices ("supplierId", "sizeQuantityId", "pricePerUnit", "deliveryDays") 
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [supplierId, sq.id, supplierCost, deliveryDays]
        );
      }
    }
    console.log(`  ✓ מחירי ספקים נוצרו`);

    // ==================== 5 QUOTES ====================
    console.log('\n📋 Creating 5 quotes with different statuses...');
    const quoteData = [
      { customerId: customerIds[0], status: 'draft', items: [0, 1] },
      { customerId: customerIds[1], status: 'sent', items: [3, 4] },
      { customerId: customerIds[2], status: 'approved', items: [6, 7, 8] },
      { customerId: customerIds[3], status: 'in_production', items: [9, 10] },
      { customerId: customerIds[4], status: 'ready', items: [11, 12, 13] },
    ];

    for (let i = 0; i < quoteData.length; i++) {
      const q = quoteData[i];
      const quoteResult = await client.query(
        `INSERT INTO quotes ("customerId", quote_status, version) VALUES ($1, $2, $3) RETURNING id`,
        [q.customerId, q.status, 1]
      );
      const quoteId = quoteResult.rows[0].id;

      let totalValue = 0;
      for (const itemIdx of q.items) {
        if (itemIdx < sizeQuantityIds.length) {
          const sq = sizeQuantityIds[itemIdx];
          const quantity = Math.floor(Math.random() * 3) + 1;
          const price = sq.price * quantity;
          totalValue += price;

          const assignedSupplier = ['approved', 'in_production', 'ready'].includes(q.status) 
            ? supplierIds[Math.floor(Math.random() * supplierIds.length)] 
            : null;
          const supplierCost = assignedSupplier ? Math.round(price * 0.6) : null;

          await client.query(
            `INSERT INTO quote_items ("quoteId", "sizeQuantityId", quantity, "priceAtTimeOfQuote", "supplierId", "supplierCost", "deliveryDays") 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [quoteId, sq.id, quantity, sq.price, assignedSupplier, supplierCost, assignedSupplier ? 3 : null]
          );
        }
      }

      if (['approved', 'in_production', 'ready'].includes(q.status)) {
        await client.query(
          `UPDATE quotes SET "finalValue" = $1 WHERE id = $2`,
          [totalValue, quoteId]
        );
      }

      console.log(`  ✓ הצעה #${quoteId} - ${q.status} (₪${totalValue})`);
    }

    // ==================== ACTIVITY LOG ====================
    console.log('\n📝 Creating activity log entries...');
    const activities = [
      { action: 'quote_created', details: { quoteId: 1 } },
      { action: 'customer_approved', details: { customerId: customerIds[0] } },
      { action: 'quote_sent', details: { quoteId: 2 } },
      { action: 'supplier_assigned', details: { quoteId: 3, supplierId: supplierIds[0] } },
      { action: 'quote_approved', details: { quoteId: 3 } },
    ];

    for (const a of activities) {
      await client.query(
        `INSERT INTO activity_log ("userId", "actionType", details) VALUES ($1, $2, $3)`,
        [1, a.action, JSON.stringify(a.details)]
      );
    }
    console.log(`  ✓ ${activities.length} פעולות נרשמו`);

    console.log('\n✅ Demo data seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • 5 לקוחות פעילים`);
    console.log(`   • 5 ספקים פעילים`);
    console.log(`   • 5 מוצרים עם ${sizeQuantityIds.length} אפשרויות גודל/כמות`);
    console.log(`   • 5 הצעות מחיר בסטטוסים שונים`);
    console.log(`   • מחירון ברירת מחדל`);
    console.log(`   • מחירי ספקים`);

  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
