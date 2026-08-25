const path = require('path');
const engineDir = 'd:/books/universal_search_engine';
const { DataSource } = require(path.join(engineDir, 'node_modules/typeorm'));
const dotenv = require(path.join(engineDir, 'node_modules/dotenv'));
dotenv.config({ path: path.join(engineDir, '.env') });

// Require compiled or dynamic entities
const { EntitySchema } = require(path.join(engineDir, 'node_modules/typeorm'));

const DocumentSchema = new EntitySchema({
  name: 'Document',
  tableName: 'documents',
  columns: {
    id: { primary: true, type: 'uuid', generated: 'uuid' },
    sourceUrl: { type: 'varchar', length: 255 },
    sourceName: { type: 'varchar', length: 100 },
    contentType: { type: 'varchar', length: 50, nullable: true },
    title: { type: 'varchar', length: 500 },
    authors: { type: 'text', nullable: true },
    metadata: { type: 'jsonb', nullable: true },
    createdAt: { createDate: true },
    updatedAt: { updateDate: true },
  },
  relations: {
    chunks: {
      type: 'one-to-many',
      target: 'DocumentChunk',
      inverseSide: 'document',
      cascade: true,
    },
  },
});

const DocumentChunkSchema = new EntitySchema({
  name: 'DocumentChunk',
  tableName: 'document_chunks',
  columns: {
    id: { primary: true, type: 'uuid', generated: 'uuid' },
    documentId: { type: 'uuid' },
    chunkIndex: { type: 'int' },
    content: { type: 'text' },
    embedding: { type: 'vector', length: 1024, nullable: true },
  },
  relations: {
    document: {
      type: 'many-to-one',
      target: 'Document',
      joinColumn: { name: 'documentId' },
      onDelete: 'CASCADE',
    },
  },
});

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'knowledge_db',
    entities: [DocumentSchema, DocumentChunkSchema],
    synchronize: true, // test auto-creation of tables
    logging: ['error', 'warn', 'schema'],
  });

  try {
    await dataSource.initialize();
    console.log('DataSource initialized and schema synchronized successfully!');

    const docRepo = dataSource.getRepository('Document');
    const chunkRepo = dataSource.getRepository('DocumentChunk');

    // Create a mock doc
    const doc = docRepo.create({
      sourceUrl: 'https://example.com/quantum',
      sourceName: 'SampleSource',
      contentType: 'paper',
      title: 'Introduction to Quantum Computing',
      authors: JSON.stringify(['Alice', 'Bob']),
      metadata: { year: 2024, topic: 'Quantum' },
    });
    const savedDoc = await docRepo.save(doc);
    console.log('Saved doc ID:', savedDoc.id);

    // Create 1024-dim chunk vector
    const dummyEmbedding = Array(1024).fill(0.01);
    dummyEmbedding[0] = 0.5; // give distinct direction

    const chunk = chunkRepo.create({
      documentId: savedDoc.id,
      chunkIndex: 0,
      content: 'Quantum computing uses qubits to represent superposition states.',
      embedding: `[${dummyEmbedding.join(',')}]`,
    });
    await chunkRepo.save(chunk);
    console.log('Saved chunk successfully!');

    // Test similaritySearch query builder matching VectorStoreService
    const queryEmbedding = Array(1024).fill(0.01);
    queryEmbedding[0] = 0.5; // exact match
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    const similarityThreshold = 0.5;

    console.log('Testing similarity search with TypeORM queryBuilder...');
    const results = await chunkRepo
      .createQueryBuilder('chunk')
      .innerJoinAndSelect('chunk.document', 'document')
      .where('chunk.embedding <=> :embedding <= :threshold', {
        embedding: embeddingStr,
        threshold: similarityThreshold,
      })
      .orderBy('chunk.embedding <=> :embedding', 'ASC')
      .limit(5)
      .getMany();

    console.log('Query results count:', results.length);
    if (results.length > 0) {
      console.log('Found chunk content:', results[0].content);
      console.log('Attached document title:', results[0].document.title);
    }

    // Clean up test data
    await docRepo.delete(savedDoc.id);
    console.log('Cleaned up test document.');

    await dataSource.destroy();
  } catch (err) {
    console.error('TypeORM Test Error:', err);
  }
}

main();
