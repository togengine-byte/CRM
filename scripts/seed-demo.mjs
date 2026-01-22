/**
 * Demo Data Seed Script
 * Creates 5 customers, 5 suppliers, 5 products with variants, and 5 quotes
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

async function seed() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

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
    const [result] = await connection.execute(
      `INSERT INTO users (openId, name, email, loginMethod, role, status, phone, companyName, address) 
       VALUES (?, ?, ?, 'demo', 'customer', 'active', ?, ?, ?)`,
      [generateOpenId(), c.name, c.email, c.phone, c.company, c.address]
    );
    customerIds.push(result.insertId);
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
    const [result] = await connection.execute(
      `INSERT INTO users (openId, name, email, loginMethod, role, status, phone, companyName, address, totalRatingPoints, ratedDealsCount) 
       VALUES (?, ?, ?, 'demo', 'supplier', 'active', ?, ?, ?, ?, ?)`,
      [generateOpenId(), s.name, s.email, s.phone, s.company, s.address, Math.floor(Math.random() * 50) + 40, Math.floor(Math.random() * 20) + 5]
    );
    supplierIds.push(result.insertId);
    console.log(`  ✓ ${s.company}`);
  }

  // ==================== 5 BASE PRODUCTS + VARIANTS ====================
  console.log('\n📦 Creating 5 products with variants...');
  const products = [
    { 
      name: 'כרטיסי ביקור', 
      description: 'כרטיסי ביקור מקצועיים בגדלים שונים',
      category: 'כרטיסים',
      variants: [
        { sku: 'BC-STD-100', name: 'כרטיסי ביקור סטנדרט - 100 יח\'', attrs: { size: '9x5cm', paper: '350gsm', finish: 'מט' }, price: 120 },
        { sku: 'BC-STD-500', name: 'כרטיסי ביקור סטנדרט - 500 יח\'', attrs: { size: '9x5cm', paper: '350gsm', finish: 'מט' }, price: 280 },
        { sku: 'BC-PRE-100', name: 'כרטיסי ביקור פרימיום - 100 יח\'', attrs: { size: '9x5cm', paper: '400gsm', finish: 'למינציה' }, price: 180 },
      ]
    },
    { 
      name: 'ברושורים', 
      description: 'ברושורים מקופלים לפרסום ושיווק',
      category: 'דפוס',
      variants: [
        { sku: 'BR-A4-100', name: 'ברושור A4 מקופל - 100 יח\'', attrs: { size: 'A4', folds: 2, paper: '170gsm' }, price: 450 },
        { sku: 'BR-A4-500', name: 'ברושור A4 מקופל - 500 יח\'', attrs: { size: 'A4', folds: 2, paper: '170gsm' }, price: 1200 },
        { sku: 'BR-A5-100', name: 'ברושור A5 מקופל - 100 יח\'', attrs: { size: 'A5', folds: 2, paper: '170gsm' }, price: 280 },
      ]
    },
    { 
      name: 'פוסטרים', 
      description: 'פוסטרים בגדלים שונים להדפסה',
      category: 'דפוס גדול',
      variants: [
        { sku: 'PO-A3-10', name: 'פוסטר A3 - 10 יח\'', attrs: { size: 'A3', paper: '200gsm', finish: 'מבריק' }, price: 150 },
        { sku: 'PO-A2-10', name: 'פוסטר A2 - 10 יח\'', attrs: { size: 'A2', paper: '200gsm', finish: 'מבריק' }, price: 280 },
        { sku: 'PO-A1-5', name: 'פוסטר A1 - 5 יח\'', attrs: { size: 'A1', paper: '200gsm', finish: 'מבריק' }, price: 350 },
      ]
    },
    { 
      name: 'קופסאות מתנה', 
      description: 'קופסאות קרטון מעוצבות למתנות ומוצרים',
      category: 'אריזות',
      variants: [
        { sku: 'BX-SM-50', name: 'קופסה קטנה 10x10x10 - 50 יח\'', attrs: { size: '10x10x10cm', material: 'קרטון 300gsm' }, price: 320 },
        { sku: 'BX-MD-50', name: 'קופסה בינונית 20x15x10 - 50 יח\'', attrs: { size: '20x15x10cm', material: 'קרטון 350gsm' }, price: 480 },
        { sku: 'BX-LG-25', name: 'קופסה גדולה 30x20x15 - 25 יח\'', attrs: { size: '30x20x15cm', material: 'קרטון 400gsm' }, price: 520 },
      ]
    },
    { 
      name: 'מדבקות', 
      description: 'מדבקות בגזירה מותאמת אישית',
      category: 'מדבקות',
      variants: [
        { sku: 'ST-CIR-100', name: 'מדבקות עגולות 5cm - 100 יח\'', attrs: { shape: 'עגול', size: '5cm', material: 'ויניל' }, price: 85 },
        { sku: 'ST-SQR-100', name: 'מדבקות מרובעות 5x5 - 100 יח\'', attrs: { shape: 'מרובע', size: '5x5cm', material: 'ויניל' }, price: 85 },
        { sku: 'ST-CUS-100', name: 'מדבקות גזירה מותאמת - 100 יח\'', attrs: { shape: 'מותאם', material: 'ויניל פרימיום' }, price: 150 },
      ]
    },
  ];

  const productVariantIds = [];
  for (const p of products) {
    const [productResult] = await connection.execute(
      `INSERT INTO base_products (name, description, category, isActive) VALUES (?, ?, ?, true)`,
      [p.name, p.description, p.category]
    );
    const productId = productResult.insertId;
    console.log(`  ✓ ${p.name}`);

    for (const v of p.variants) {
      const [variantResult] = await connection.execute(
        `INSERT INTO product_variants (baseProductId, sku, name, attributes, isActive) VALUES (?, ?, ?, ?, true)`,
        [productId, `${v.sku}-${timestamp}`, v.name, JSON.stringify(v.attrs)]
      );
      productVariantIds.push({ id: variantResult.insertId, price: v.price, name: v.name });
      console.log(`    - ${v.name}`);
    }
  }

  // ==================== DEFAULT PRICELIST ====================
  console.log('\n💰 Creating default pricelist...');
  const [pricelistResult] = await connection.execute(
    `INSERT INTO pricelists (name, description, isDefault, isActive) VALUES (?, ?, true, true)`,
    ['מחירון ברירת מחדל', 'מחירון סטנדרטי לכל הלקוחות']
  );
  const pricelistId = pricelistResult.insertId;

  for (const pv of productVariantIds) {
    await connection.execute(
      `INSERT INTO pricelist_items (pricelistId, productVariantId, minQuantity, pricePerUnit) VALUES (?, ?, 1, ?)`,
      [pricelistId, pv.id, pv.price]
    );
  }
  console.log(`  ✓ מחירון ברירת מחדל עם ${productVariantIds.length} פריטים`);

  // ==================== SUPPLIER PRICES ====================
  console.log('\n🏷️ Creating supplier prices...');
  for (const supplierId of supplierIds) {
    // Each supplier offers some products at different prices
    const selectedVariants = productVariantIds.slice(0, Math.floor(Math.random() * 5) + 3);
    for (const pv of selectedVariants) {
      const supplierCost = Math.round(pv.price * (0.5 + Math.random() * 0.2)); // 50-70% of retail
      const deliveryDays = Math.floor(Math.random() * 5) + 2;
      await connection.execute(
        `INSERT INTO supplier_prices (supplierId, productVariantId, minQuantity, pricePerUnit, deliveryDays, qualityRating) 
         VALUES (?, ?, 1, ?, ?, ?)`,
        [supplierId, pv.id, supplierCost, deliveryDays, (Math.random() * 2 + 3).toFixed(2)]
      );
    }
  }
  console.log(`  ✓ מחירי ספקים נוצרו`);

  // ==================== 5 QUOTES ====================
  console.log('\n📋 Creating 5 quotes with different statuses...');
  const quoteStatuses = ['draft', 'sent', 'approved', 'in_production', 'ready'];
  const quoteData = [
    { customerId: customerIds[0], status: 'draft', items: [0, 1] },
    { customerId: customerIds[1], status: 'sent', items: [3, 4] },
    { customerId: customerIds[2], status: 'approved', items: [6, 7, 8] },
    { customerId: customerIds[3], status: 'in_production', items: [9, 10] },
    { customerId: customerIds[4], status: 'ready', items: [11, 12, 13] },
  ];

  for (let i = 0; i < quoteData.length; i++) {
    const q = quoteData[i];
    const [quoteResult] = await connection.execute(
      `INSERT INTO quotes (customerId, quote_status, version) VALUES (?, ?, 1)`,
      [q.customerId, q.status]
    );
    const quoteId = quoteResult.insertId;

    let totalValue = 0;
    for (const itemIdx of q.items) {
      if (itemIdx < productVariantIds.length) {
        const pv = productVariantIds[itemIdx];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const price = pv.price * quantity;
        totalValue += price;

        // Assign supplier for approved/in_production/ready quotes
        const assignedSupplier = ['approved', 'in_production', 'ready'].includes(q.status) 
          ? supplierIds[Math.floor(Math.random() * supplierIds.length)] 
          : null;
        const supplierCost = assignedSupplier ? Math.round(price * 0.6) : null;

        await connection.execute(
          `INSERT INTO quote_items (quoteId, productVariantId, quantity, priceAtTimeOfQuote, supplierId, supplierCost, deliveryDays) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [quoteId, pv.id, quantity, pv.price, assignedSupplier, supplierCost, assignedSupplier ? 3 : null]
        );
      }
    }

    // Update finalValue for approved quotes
    if (['approved', 'in_production', 'ready'].includes(q.status)) {
      await connection.execute(
        `UPDATE quotes SET finalValue = ? WHERE id = ?`,
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
    await connection.execute(
      `INSERT INTO activity_log (userId, actionType, details) VALUES (?, ?, ?)`,
      [1, a.action, JSON.stringify(a.details)]
    );
  }
  console.log(`  ✓ ${activities.length} פעולות נרשמו`);

  console.log('\n✅ Demo data seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   • 5 לקוחות פעילים`);
  console.log(`   • 5 ספקים פעילים`);
  console.log(`   • 5 מוצרים עם ${productVariantIds.length} וריאנטים`);
  console.log(`   • 5 הצעות מחיר בסטטוסים שונים`);
  console.log(`   • מחירון ברירת מחדל`);
  console.log(`   • מחירי ספקים`);

  await connection.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
