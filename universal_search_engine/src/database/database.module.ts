import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { DocumentChunk } from './entities/document-chunk.entity';
import { VectorStoreService } from './vector-store.service';

@Module({
  imports: [TypeOrmModule.forFeature([Document, DocumentChunk])],
  providers: [VectorStoreService],
  exports: [VectorStoreService, TypeOrmModule],
})
export class DatabaseModule {}
