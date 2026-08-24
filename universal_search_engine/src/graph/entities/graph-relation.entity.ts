import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { GraphEntity } from './graph-entity.entity';

@Entity('graph_relations')
@Index(['sourceId', 'targetId', 'type'], { unique: true })
export class GraphRelation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sourceId: string;

  @ManyToOne(() => GraphEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sourceId' })
  source: GraphEntity;

  @Column()
  targetId: string;

  @ManyToOne(() => GraphEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'targetId' })
  target: GraphEntity;

  @Column()
  type: string; // e.g. 'AUTHOR', 'AFFILIATED_WITH', 'USES_DATASET', 'HAS_REPO', 'MENTIONS', 'CITES'

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
