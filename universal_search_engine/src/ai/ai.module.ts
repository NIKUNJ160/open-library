import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { AiController } from './ai.controller';
import { OpenaiService } from './services/openai.service';
import { CitationService } from './services/citation.service';
import { RagService } from './services/rag.service';

@Module({
  imports: [HttpModule, DatabaseModule],
  controllers: [AiController],
  providers: [OpenaiService, CitationService, RagService],
  exports: [OpenaiService, CitationService, RagService],
})
export class AiModule {}
