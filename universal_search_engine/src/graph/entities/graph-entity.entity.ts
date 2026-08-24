import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Document } from '../../database/entities/document.entity';

@Entity('graph_entities')
@Index(['name', 'type'], { unique: true })
export class GraphEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  type: string; // 'document' | 'author' | 'institution' | 'dataset' | 'repository' | 'patent' | 'concept'

  @Column({ nullable: true })
  documentId: string | null;

  @ManyToOne(() => Document, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'vector', length: 1024, nullable: true })
  conceptVector: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
