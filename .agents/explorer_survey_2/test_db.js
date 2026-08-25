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
  console.log('Connected to DB');

  // Test pgvector
  const ext = await client.query("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';");
  console.log('Extension:', ext.rows);

  // Test unconstrained vs constrained vector columns
  await client.query('CREATE TEMP TABLE test_vectors (id serial, v_unconstrained vector, v_1024 vector(1024), v_1536 vector(1536));');
  console.log('Created test_vectors temp table successfully');

  // Test inserting 1024-dim vector into unconstrained and 1024
  const vec1024 = '[' + Array(1024).fill(0.01).join(',') + ']';
  await client.query('INSERT INTO test_vectors (v_unconstrained, v_1024) VALUES ($1, $2);', [vec1024, vec1024]);
  console.log('Successfully inserted 1024-dim vector into unconstrained and vector(1024)');

  // Test inserting 1024-dim vector into vector(1536) - should fail
  try {
    await client.query('INSERT INTO test_vectors (v_1536) VALUES ($1);', [vec1024]);
    console.log('Inserted into 1536 (unexpected)');
  } catch (e) {
    console.log('Expected error inserting 1024 into vector(1536):', e.message);
  }

  // Test cosine distance query with parameter
  const res = await client.query('SELECT id, v_1024 <=> $1 AS distance FROM test_vectors ORDER BY v_1024 <=> $1 ASC LIMIT 1;', [vec1024]);
  console.log('Cosine distance query result:', res.rows);

  // Check current public tables
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
  console.log('Current public tables:', tables.rows);

  await client.end();
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
