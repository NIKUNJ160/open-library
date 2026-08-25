const path = require('path');
const engineDir = 'd:/books/universal_search_engine';
const OpenAI = require(path.join(engineDir, 'node_modules/openai'));
const { Client } = require(path.join(engineDir, 'node_modules/pg'));
const dotenv = require(path.join(engineDir, 'node_modules/dotenv'));
dotenv.config({ path: path.join(engineDir, '.env') });

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
});

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'knowledge_db',
});

async function main() {
  await client.connect();

  const passageText = "Retrieval-Augmented Generation (RAG) is an AI framework for retrieving facts from an external knowledge base to ground large language models (LLMs) on the most accurate, up-to-date information and to give users insight into LLMs' generative process.";
  const queryText = "What is RAG in AI?";
  const unrelatedText = "The recipe for chocolate cake requires flour, cocoa powder, sugar, and eggs.";

  console.log('Generating embeddings with Nvidia NIM nv-embedqa-e5-v5...');
  const passageEmb = await openai.embeddings.create({
    model: 'nvidia/nv-embedqa-e5-v5',
    input: passageText,
    input_type: 'passage',
  });

  const queryEmb = await openai.embeddings.create({
    model: 'nvidia/nv-embedqa-e5-v5',
    input: queryText,
    input_type: 'query',
  });

  const unrelatedEmb = await openai.embeddings.create({
    model: 'nvidia/nv-embedqa-e5-v5',
    input: unrelatedText,
    input_type: 'passage',
  });

  const pStr = `[${passageEmb.data[0].embedding.join(',')}]`;
  const qStr = `[${queryEmb.data[0].embedding.join(',')}]`;
  const uStr = `[${unrelatedEmb.data[0].embedding.join(',')}]`;

  const relatedRes = await client.query('SELECT $1::vector <=> $2::vector AS dist;', [pStr, qStr]);
  const unrelatedRes = await client.query('SELECT $1::vector <=> $2::vector AS dist;', [uStr, qStr]);

  console.log('Relevant passage cosine distance:', relatedRes.rows[0].dist);
  console.log('Unrelated passage cosine distance:', unrelatedRes.rows[0].dist);

  await client.end();
}

main().catch(console.error);
