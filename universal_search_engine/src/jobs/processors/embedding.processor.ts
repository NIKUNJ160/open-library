import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../database/entities/document.entity';
import { RagService } from '../../ai/services/rag.service';
import { OpenaiService } from '../../ai/services/openai.service';
import { VectorStoreService } from '../../database/vector-store.service';
import { Logger } from '@nestjs/common';

@Processor('embedding')
export class EmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly ragService: RagService,
    private readonly openaiService: OpenaiService,
    private readonly vectorStoreService: VectorStoreService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { documentId } = job.data;
    this.logger.log(`Processing background embedding for Document ${documentId}`);

    const document = await this.documentRepo.findOne({
      where: { id: documentId },
      relations: { chunks: true },
    });

    if (!document) {
      this.logger.warn(`Document ${documentId} not found.`);
      return;
    }

    if (document.chunks && document.chunks.length > 0) {
      this.logger.log(`Document ${documentId} already has ${document.chunks.length} chunks. Skipping.`);
      return;
    }

    const textContent = document.metadata?.content || document.metadata?.description || document.title;

    if (!textContent || textContent.trim().length === 0) {
      this.logger.warn(`No text content found for Document ${documentId}. Cannot embed.`);
      return;
    }

    const chunks = this.ragService.chunkText(textContent);
    if (chunks.length === 0) {
      this.logger.warn(`No chunks extracted for Document ${documentId}`);
      return;
    }

    this.logger.log(`Generating passage embeddings for ${chunks.length} chunks...`);
    const embeddings = await this.openaiService.createEmbeddings(chunks, 'passage');

    const chunksData = chunks.map((content, index) => ({
      content,
      chunkIndex: index,
      embedding: embeddings[index],
    }));

    await this.vectorStoreService.saveChunksForDocument(document.id, chunksData);
    this.logger.log(`Successfully vectorized and stored ${chunks.length} chunks in background for Document ${documentId}`);
  }
}
