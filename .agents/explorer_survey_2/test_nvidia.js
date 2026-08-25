const path = require('path');
const engineDir = 'd:/books/universal_search_engine';
const OpenAI = require(path.join(engineDir, 'node_modules/openai'));
const dotenv = require(path.join(engineDir, 'node_modules/dotenv'));
dotenv.config({ path: path.join(engineDir, '.env') });

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
});

async function main() {
  console.log('Testing Nvidia NIM embedding API with input_type parameter...');
  const model = process.env.NVIDIA_EMBEDDING_MODEL || 'nvidia/nv-embedqa-e5-v5';

  try {
    // In OpenAI SDK, extra parameters can be passed directly or as extra_body
    const resPassage = await openai.embeddings.create({
      model: model,
      input: 'Universal Search Engine Knowledge Base sample document chunk.',
      input_type: 'passage',
    });
    console.log('Passage embedding received successfully!');
    console.log('Dimension:', resPassage.data[0].embedding.length);
    console.log('Sample values:', resPassage.data[0].embedding.slice(0, 5));

    const resQuery = await openai.embeddings.create({
      model: model,
      input: 'What is Universal Search Engine?',
      input_type: 'query',
    });
    console.log('Query embedding received successfully!');
    console.log('Dimension:', resQuery.data[0].embedding.length);
    console.log('Sample values:', resQuery.data[0].embedding.slice(0, 5));
  } catch (err) {
    console.error('Nvidia Embedding API error:', err);
  }
}

main();
