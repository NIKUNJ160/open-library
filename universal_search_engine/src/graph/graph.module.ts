import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphEntity } from './entities/graph-entity.entity';
import { GraphRelation } from './entities/graph-relation.entity';
import { Document } from '../database/entities/document.entity';
import { GraphService } from './graph.service';
import { GraphController } from './graph.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GraphEntity, GraphRelation, Document]),
    AiModule,
  ],
  providers: [GraphService],
  controllers: [GraphController],
  exports: [GraphService],
})
export class GraphModule {}
