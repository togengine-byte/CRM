import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = process.env.DATABASE_URL;

const client = new Client({ 
  connectionString: DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

await client.connect();

const res = await client.query(`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'users'
  ORDER BY ordinal_position
`);

console.log('Columns in users table:');
res.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

await client.end();
