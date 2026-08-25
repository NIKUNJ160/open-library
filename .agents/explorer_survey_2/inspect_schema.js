const path = require('path');
const engineDir = 'd:/books/universal_search_engine';
const { Client } = require(path.join(engineDir, 'node_modules/pg'));
const dotenv = require(path.join(engineDir, 'node_modules/dotenv'));
dotenv.config({ path: path.join(engineDir, '.env') });

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'knowledge_db',
});

async function main() {
  await client.connect();

  console.log('--- TABLES & COLUMNS ---');
  const cols = await client.query(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);
  console.table(cols.rows);

  console.log('--- CONSTRAINTS & FOREIGN KEYS ---');
  const constraints = await client.query(`
    SELECT
      tc.table_name, 
      tc.constraint_name, 
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public';
  `);
  console.table(constraints.rows);

  console.log('--- INDEXES ---');
  const idx = await client.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public';
  `);
  console.table(idx.rows);

  await client.end();
}

main().catch(err => console.error(err));
