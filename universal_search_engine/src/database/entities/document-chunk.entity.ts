import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Document } from './document.entity';

@Entity('document_chunks')
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  documentId: string;

  @ManyToOne(() => Document, document => document.chunks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column({ type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  // pgvector column for storing 1536-dimensional OpenAI embeddings (or varying depending on model)
  // We specify vector as the column type and length 1536 as default for text-embedding-ada-002 / text-embedding-3-small
  @Column({ type: 'vector', length: 1536, nullable: true })
  @Index('embedding_hnsw_idx', {
    synchronize: false, // We'll manage this index manually or via migrations if needed
  })
  embedding: string; // TypeORM maps pgvector 'vector' type to string internally (e.g. "[0.1, 0.2, ...]")
}
