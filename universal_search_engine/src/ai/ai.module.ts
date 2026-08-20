import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiController } from './ai.controller';
import { OpenaiService } from './services/openai.service';
import { CitationService } from './services/citation.service';

@Module({
  imports: [HttpModule],
  controllers: [AiController],
  providers: [OpenaiService, CitationService],
  exports: [OpenaiService, CitationService],
})
export class AiModule {}
