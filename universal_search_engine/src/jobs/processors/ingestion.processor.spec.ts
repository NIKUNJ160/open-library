import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestionProcessor } from './ingestion.processor';
import { Document } from '../../database/entities/document.entity';
import { SearchAggregatorService } from '../../search/search-aggregator.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';

describe('IngestionProcessor', () => {
  let processor: IngestionProcessor;
  let documentRepo: jest.Mocked<Repository<Document>>;
  let searchAggregatorService: jest.Mocked<SearchAggregatorService>;
  let embeddingQueue: jest.Mocked<Queue>;

  const mockDocumentRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  });

  const mockSearchAggregatorService = () => ({
    search: jest.fn(),
  });

  const mockQueue = () => ({
    add: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionProcessor,
        {
          provide: getRepositoryToken(Document),
          useFactory: mockDocumentRepo,
        },
        {
          provide: SearchAggregatorService,
          useFactory: mockSearchAggregatorService,
        },
        {
          provide: getQueueToken('embedding'),
          useFactory: mockQueue,
        },
      ],
    }).compile();

    processor = module.get<IngestionProcessor>(IngestionProcessor);
    documentRepo = module.get(getRepositoryToken(Document));
    searchAggregatorService = module.get(SearchAggregatorService);
    embeddingQueue = module.get(getQueueToken('embedding')) as any;
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should search connectors, save stubs and enqueue embedding jobs', async () => {
      const mockResult = {
        id: 'arxiv:1',
        title: 'Title',
        url: 'https://arxiv.org/1',
        sourceName: 'arxiv',
        contentType: 'paper',
        authors: [{ name: 'Author A' }],
        description: 'Description',
        metadata: {},
      };

      searchAggregatorService.search.mockResolvedValue({
        results: [mockResult],
        total: 1,
        page: 1,
        limit: 10,
      } as any);

      documentRepo.findOne.mockResolvedValue(null);
      documentRepo.create.mockReturnValue({ ...mockResult, id: 'saved-doc-1' } as any);
      documentRepo.save.mockResolvedValue({ ...mockResult, id: 'saved-doc-1' } as any);

      const mockJob = {
        data: { query: 'test' },
      } as Job;

      const result = await processor.process(mockJob);

      expect(searchAggregatorService.search).toHaveBeenCalledWith({
        q: 'test',
        limit: 10,
      });
      expect(documentRepo.create).toHaveBeenCalled();
      expect(documentRepo.save).toHaveBeenCalled();
      expect(embeddingQueue.add).toHaveBeenCalledWith(
        'generate-embeddings',
        { documentId: 'saved-doc-1' },
        { removeOnComplete: true },
      );
      expect(result).toEqual({ ingestedCount: 1 });
    });

    it('should skip if document already exists', async () => {
      const mockResult = {
        url: 'https://arxiv.org/1',
      };

      searchAggregatorService.search.mockResolvedValue({
        results: [mockResult],
        total: 1,
        page: 1,
        limit: 10,
      } as any);

      documentRepo.findOne.mockResolvedValue({ id: 'existing-doc' } as any);

      const mockJob = {
        data: { query: 'test' },
      } as Job;

      const result = await processor.process(mockJob);

      expect(documentRepo.create).not.toHaveBeenCalled();
      expect(embeddingQueue.add).not.toHaveBeenCalled();
      expect(result).toEqual({ ingestedCount: 0 });
    });
  });
});
