import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { DocumentChunk } from './entities/document-chunk.entity';

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(DocumentChunk)
    private readonly chunkRepo: Repository<DocumentChunk>,
  ) {}

  /**
   * Save a document and its vectorized chunks to PostgreSQL
   */
  async saveDocumentWithChunks(
    documentData: Partial<Document>,
    chunksData: { content: string; embedding: number[]; chunkIndex: number }[],
  ): Promise<Document> {
    const document = this.documentRepo.create(documentData);
    const savedDocument = await this.documentRepo.save(document);

    const chunks = chunksData.map((chunk) => {
      return this.chunkRepo.create({
        documentId: savedDocument.id,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        // Convert number[] to vector string format for pgvector
        embedding: `[${chunk.embedding.join(',')}]`,
      });
    });

    await this.chunkRepo.save(chunks);
    this.logger.debug(`Saved document ${savedDocument.id} with ${chunks.length} vectorized chunks.`);
    
    return savedDocument;
  }

  /**
   * Perform a semantic similarity search using pgvector cosine distance (<=>)
   * @param queryEmbedding The vectorized query
   * @param limit Maximum results to return
   * @param similarityThreshold Threshold for cosine distance (smaller is more similar, 0 is exact)
   */
  async similaritySearch(
    queryEmbedding: number[],
    limit = 5,
    similarityThreshold = 0.5,
  ): Promise<any[]> {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Perform vector similarity search using raw SQL query through TypeORM
    // pgvector uses <=> for cosine distance
    const results = await this.chunkRepo
      .createQueryBuilder('chunk')
      .innerJoinAndSelect('chunk.document', 'document')
      .where('chunk.embedding <=> :embedding <= :threshold', {
        embedding: embeddingStr,
        threshold: similarityThreshold,
      })
      .orderBy('chunk.embedding <=> :embedding', 'ASC')
      .limit(limit)
      .getMany();

    return results;
  }

  /**
   * Initialize HNSW index if it doesn't exist
   * Note: Required only if you have > 1M vectors for performance
   */
  async setupVectorIndex(): Promise<void> {
    try {
      await this.chunkRepo.query(
        `CREATE INDEX IF NOT EXISTS embedding_hnsw_idx ON document_chunks USING hnsw (embedding vector_cosine_ops);`
      );
      this.logger.log('HNSW vector index is ready.');
    } catch (error) {
      this.logger.warn('Failed to create HNSW index (perhaps pgvector is missing?): ' + error.message);
    }
  }
}
