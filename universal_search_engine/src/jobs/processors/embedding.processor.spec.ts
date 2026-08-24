import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmbeddingProcessor } from './embedding.processor';
import { Document } from '../../database/entities/document.entity';
import { RagService } from '../../ai/services/rag.service';
import { OpenaiService } from '../../ai/services/openai.service';
import { VectorStoreService } from '../../database/vector-store.service';
import { Job } from 'bullmq';

describe('EmbeddingProcessor', () => {
  let processor: EmbeddingProcessor;
  let documentRepo: jest.Mocked<Repository<Document>>;
  let ragService: jest.Mocked<RagService>;
  let openaiService: jest.Mocked<OpenaiService>;
  let vectorStoreService: jest.Mocked<VectorStoreService>;

  const mockDocumentRepo = () => ({
    findOne: jest.fn(),
  });

  const mockRagService = () => ({
    chunkText: jest.fn(),
  });

  const mockOpenaiService = () => ({
    createEmbeddings: jest.fn(),
  });

  const mockVectorStoreService = () => ({
    saveChunksForDocument: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingProcessor,
        {
          provide: getRepositoryToken(Document),
          useFactory: mockDocumentRepo,
        },
        {
          provide: RagService,
          useFactory: mockRagService,
        },
        {
          provide: OpenaiService,
          useFactory: mockOpenaiService,
        },
        {
          provide: VectorStoreService,
          useFactory: mockVectorStoreService,
        },
      ],
    }).compile();

    processor = module.get<EmbeddingProcessor>(EmbeddingProcessor);
    documentRepo = module.get(getRepositoryToken(Document));
    ragService = module.get(RagService);
    openaiService = module.get(OpenaiService);
    vectorStoreService = module.get(VectorStoreService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should chunk, generate embeddings and save chunks for document', async () => {
      const mockDocument = {
        id: 'doc-1',
        title: 'Title',
        metadata: { description: 'Description' },
        chunks: [],
      };

      const mockJob = {
        data: { documentId: 'doc-1' },
      } as Job;

      documentRepo.findOne.mockResolvedValue(mockDocument as any);
      ragService.chunkText.mockReturnValue(['Chunk 1']);
      openaiService.createEmbeddings.mockResolvedValue([[0.1, 0.2]]);
      vectorStoreService.saveChunksForDocument.mockResolvedValue(undefined);

      await processor.process(mockJob);

      expect(documentRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        relations: { chunks: true },
      });
      expect(ragService.chunkText).toHaveBeenCalledWith('Description');
      expect(openaiService.createEmbeddings).toHaveBeenCalledWith(['Chunk 1'], 'passage');
      expect(vectorStoreService.saveChunksForDocument).toHaveBeenCalledWith('doc-1', [
        { content: 'Chunk 1', chunkIndex: 0, embedding: [0.1, 0.2] },
      ]);
    });

    it('should skip if document already has chunks', async () => {
      const mockDocument = {
        id: 'doc-1',
        chunks: [{ id: 'chunk-1' }],
      };

      const mockJob = {
        data: { documentId: 'doc-1' },
      } as Job;

      documentRepo.findOne.mockResolvedValue(mockDocument as any);

      await processor.process(mockJob);

      expect(ragService.chunkText).not.toHaveBeenCalled();
      expect(openaiService.createEmbeddings).not.toHaveBeenCalled();
    });
  });
});
