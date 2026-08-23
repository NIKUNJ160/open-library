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
   * @param similarityThreshold Optional threshold for cosine distance (smaller is more similar, e.g. 0.5 to 1.0; <=0 means no distance filter)
   */
  async similaritySearch(
    queryEmbedding: number[],
    limit = 5,
    similarityThreshold = 1.0,
  ): Promise<any[]> {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const qb = this.chunkRepo
      .createQueryBuilder('chunk')
      .innerJoinAndSelect('chunk.document', 'document');

    if (similarityThreshold && similarityThreshold > 0 && similarityThreshold < 2.0) {
      qb.where('chunk.embedding <=> :embedding <= :threshold', {
        threshold: similarityThreshold,
      });
    }

    qb.orderBy('chunk.embedding <=> :embedding', 'ASC')
      .setParameter('embedding', embeddingStr)
      .limit(limit);

    const results = await qb.getMany();
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
