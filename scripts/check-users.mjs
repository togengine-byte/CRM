import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = process.env.DATABASE_URL;

const client = new Client({ 
  connectionString: DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

await client.connect();

console.log('=== בדיקת משתמשים במסד הנתונים ===\n');

// בדיקת לקוחות
const customers = await client.query(`SELECT id, name, email, "companyName", role, status FROM users WHERE role = 'customer'`);
console.log(`👥 לקוחות (${customers.rows.length}):`);
customers.rows.forEach(c => console.log(`   - ${c.name} | ${c.companyName} | ${c.status}`));

// בדיקת ספקים
const suppliers = await client.query(`SELECT id, name, email, "companyName", role, status FROM users WHERE role = 'supplier'`);
console.log(`\n🏭 ספקים (${suppliers.rows.length}):`);
suppliers.rows.forEach(s => console.log(`   - ${s.name} | ${s.companyName} | ${s.status}`));

// בדיקת כל המשתמשים
const all = await client.query(`SELECT role, status, count(*) FROM users GROUP BY role, status`);
console.log('\n📊 סיכום:');
all.rows.forEach(r => console.log(`   ${r.role} (${r.status}): ${r.count}`));

await client.end();
