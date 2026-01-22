/**
 * Simple Seed Script - Creates only 5 customers and 5 suppliers
 */

import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

async function seed() {
  const client = new Client({ 
    connectionString: DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
  });
  await client.connect();
  
  try {
    console.log('🌱 Starting seed...\n');

    const generateOpenId = () => `demo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // ==================== 5 CUSTOMERS ====================
    console.log('👥 Creating 5 customers...');
    const customers = [
      { name: 'דפוס אלון בע"מ', email: 'alon@demo.com', company: 'דפוס אלון', phone: '050-1234567', address: 'רחוב הרצל 15, תל אביב' },
      { name: 'מיכל כהן', email: 'michal@demo.com', company: 'סטודיו מיכל', phone: '052-2345678', address: 'שדרות רוטשילד 42, תל אביב' },
      { name: 'יוסי לוי', email: 'yossi@demo.com', company: 'לוי מדיה', phone: '054-3456789', address: 'רחוב ויצמן 8, רמת גן' },
      { name: 'שרה אברהם', email: 'sara@demo.com', company: 'אברהם פרסום', phone: '053-4567890', address: 'רחוב בן יהודה 100, ירושלים' },
      { name: 'דוד ישראלי', email: 'david@demo.com', company: 'ישראלי הפקות', phone: '058-5678901', address: 'רחוב העצמאות 25, חיפה' },
    ];

    for (const c of customers) {
      await client.query(
        `INSERT INTO users ("openId", name, email, "loginMethod", role, status, phone, "companyName", address) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [generateOpenId(), c.name, c.email, 'demo', 'customer', 'active', c.phone, c.company, c.address]
      );
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

    for (const s of suppliers) {
      await client.query(
        `INSERT INTO users ("openId", name, email, "loginMethod", role, status, phone, "companyName", address, "totalRatingPoints", "ratedDealsCount") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [generateOpenId(), s.name, s.email, 'demo', 'supplier', 'active', s.phone, s.company, s.address, Math.floor(Math.random() * 50) + 40, Math.floor(Math.random() * 20) + 5]
      );
      console.log(`  ✓ ${s.company}`);
    }

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   • 5 לקוחות פעילים');
    console.log('   • 5 ספקים פעילים');

  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
