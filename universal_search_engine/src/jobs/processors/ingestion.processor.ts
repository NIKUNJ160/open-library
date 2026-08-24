import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../database/entities/document.entity';
import { SearchAggregatorService } from '../../search/search-aggregator.service';
import { Logger } from '@nestjs/common';

@Processor('ingestion')
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly searchAggregatorService: SearchAggregatorService,
    @InjectQueue('embedding') private readonly embeddingQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { query } = job.data;
    const searchQuery = query || 'artificial intelligence';
    
    this.logger.log(`Starting ingestion sweep for query: "${searchQuery}"`);

    // Call search aggregator service to query all connectors
    const response = await this.searchAggregatorService.search({
      q: searchQuery,
      limit: 10, // pull top 10 items
    });

    if (!response.results || response.results.length === 0) {
      this.logger.warn(`Ingestion sweep returned 0 results for query: "${searchQuery}"`);
      return;
    }

    this.logger.log(`Ingestion sweep fetched ${response.results.length} search results. Processing...`);

    let newDocsCount = 0;

    for (const result of response.results) {
      const sourceUrl = result.url || `ingestion://${result.sourceName}/${result.id}`;

      // Check if document already exists
      const existing = await this.documentRepo.findOne({ where: { sourceUrl } });
      if (existing) {
        continue;
      }

      // Save document stub
      const document = this.documentRepo.create({
        title: result.title || 'Untitled Ingestion Result',
        sourceUrl,
        sourceName: result.sourceName,
        contentType: result.contentType || 'document',
        authors: result.authors ? JSON.stringify(result.authors.map(a => a.name)) : undefined,
        metadata: {
          description: result.description,
          publishedDate: result.publishedDate,
          ...result.metadata,
        },
        chunks: [],
      });

      const savedDoc = await this.documentRepo.save(document);
      newDocsCount++;

      // Enqueue embedding task
      await this.embeddingQueue.add(
        'generate-embeddings',
        { documentId: savedDoc.id },
        { removeOnComplete: true },
      );
    }

    this.logger.log(`Ingestion sweep complete. Ingested ${newDocsCount} new document stubs, queued for embedding.`);
    return { ingestedCount: newDocsCount };
  }
}
