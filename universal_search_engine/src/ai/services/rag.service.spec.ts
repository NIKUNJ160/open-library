import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RagService } from './rag.service';
import { OpenaiService } from './openai.service';
import { VectorStoreService } from '../../database/vector-store.service';

describe('RagService', () => {
  let service: RagService;
  let openaiService: OpenaiService;
  let vectorStoreService: VectorStoreService;

  const mockOpenaiService = {
    createEmbedding: jest.fn(),
    createEmbeddings: jest.fn(),
    generateRagAnswer: jest.fn(),
  };

  const mockVectorStoreService = {
    saveDocumentWithChunks: jest.fn(),
    similaritySearch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        {
          provide: OpenaiService,
          useValue: mockOpenaiService,
        },
        {
          provide: VectorStoreService,
          useValue: mockVectorStoreService,
        },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
    openaiService = module.get<OpenaiService>(OpenaiService);
    vectorStoreService = module.get<VectorStoreService>(VectorStoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chunkText', () => {
    it('should return empty array for empty or whitespace text', () => {
      expect(service.chunkText('')).toEqual([]);
      expect(service.chunkText('   \n\t  ')).toEqual([]);
    });

    it('should return a single chunk if text is smaller than maxChunkSize', () => {
      const text = 'Short document text for testing.';
      const chunks = service.chunkText(text, 500, 50);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it('should split large text into multiple chunks with overlap', () => {
      const paragraph1 = 'Paragraph 1: ' + 'A'.repeat(300) + '.\n\n';
      const paragraph2 = 'Paragraph 2: ' + 'B'.repeat(300) + '.\n\n';
      const paragraph3 = 'Paragraph 3: ' + 'C'.repeat(300) + '.';
      const fullText = paragraph1 + paragraph2 + paragraph3;

      const chunks = service.chunkText(fullText, 400, 50);
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ingestDocument', () => {
    it('should throw BadRequestException if content is empty', async () => {
      await expect(
        service.ingestDocument({ title: 'Test Title', content: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if title is empty', async () => {
      await expect(
        service.ingestDocument({ title: '', content: 'Valid content text.' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should chunk content, embed with passage type, and save to vector store', async () => {
      const mockEmbeddings = [
        new Array(1024).fill(0.1),
        new Array(1024).fill(0.2),
      ];
      mockOpenaiService.createEmbeddings.mockResolvedValue(mockEmbeddings);
      mockVectorStoreService.saveDocumentWithChunks.mockResolvedValue({
        id: 'doc-uuid-1234',
        title: 'Quantum Computing Intro',
      });

      const longContent =
        'Quantum computing is revolutionary. '.repeat(50) +
        '\n\n' +
        'It uses qubits and quantum superposition. '.repeat(50);

      const result = await service.ingestDocument({
        title: 'Quantum Computing Intro',
        content: longContent,
        sourceUrl: 'https://example.com/quantum',
        sourceName: 'Quantum Journal',
        contentType: 'research_paper',
        authors: ['Dr. Alice', 'Dr. Bob'],
        metadata: { field: 'Physics' },
      });

      expect(result.success).toBe(true);
      expect(result.documentId).toBe('doc-uuid-1234');
      expect(result.chunksCount).toBeGreaterThan(0);
      expect(mockOpenaiService.createEmbeddings).toHaveBeenCalledWith(
        expect.any(Array),
        'passage',
      );
      expect(mockVectorStoreService.saveDocumentWithChunks).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Quantum Computing Intro',
          sourceUrl: 'https://example.com/quantum',
          sourceName: 'Quantum Journal',
          contentType: 'research_paper',
        }),
        expect.any(Array),
      );
    });
  });

  describe('query', () => {
    it('should throw BadRequestException if question is empty', async () => {
      await expect(service.query({ question: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return graceful message when no similar chunks are found', async () => {
      const mockQueryEmbedding = new Array(1024).fill(0.05);
      mockOpenaiService.createEmbedding.mockResolvedValue(mockQueryEmbedding);
      mockVectorStoreService.similaritySearch.mockResolvedValue([]);

      const result = await service.query({
        question: 'What is quantum superposition?',
      });

      expect(result.question).toBe('What is quantum superposition?');
      expect(result.sources).toEqual([]);
      expect(result.retrievedChunksCount).toBe(0);
      expect(result.answer).toContain('No relevant context or documents were found');
      expect(mockOpenaiService.createEmbedding).toHaveBeenCalledWith(
        'What is quantum superposition?',
        'query',
      );
    });

    it('should embed question with query type, retrieve chunks, and generate answer', async () => {
      const mockQueryEmbedding = new Array(1024).fill(0.05);
      mockOpenaiService.createEmbedding.mockResolvedValue(mockQueryEmbedding);

      const mockRetrievedChunks = [
        {
          id: 'chunk-1',
          content: 'Quantum superposition allows qubits to exist in states 0 and 1 simultaneously.',
          chunkIndex: 0,
          documentId: 'doc-1',
          document: {
            id: 'doc-1',
            title: 'Quantum Physics Guide',
            sourceUrl: 'https://example.com/guide',
            sourceName: 'Science Direct',
          },
        },
        {
          id: 'chunk-2',
          content: 'Entanglement links qubits such that the state of one instantly influences another.',
          chunkIndex: 1,
          documentId: 'doc-1',
          document: {
            id: 'doc-1',
            title: 'Quantum Physics Guide',
            sourceUrl: 'https://example.com/guide',
            sourceName: 'Science Direct',
          },
        },
      ];

      mockVectorStoreService.similaritySearch.mockResolvedValue(mockRetrievedChunks);
      mockOpenaiService.generateRagAnswer.mockResolvedValue(
        'Quantum superposition allows particles to exist in multiple states at once.',
      );

      const result = await service.query({
        question: 'How does superposition work?',
        topK: 5,
        similarityThreshold: 1.0,
      });

      expect(result.question).toBe('How does superposition work?');
      expect(result.answer).toBe(
        'Quantum superposition allows particles to exist in multiple states at once.',
      );
      expect(result.sources).toHaveLength(2);
      expect(result.sources[0].content).toContain('superposition allows qubits');
      expect(result.sources[0].documentTitle).toBe('Quantum Physics Guide');
      expect(result.retrievedChunksCount).toBe(2);

      expect(mockOpenaiService.createEmbedding).toHaveBeenCalledWith(
        'How does superposition work?',
        'query',
      );
      expect(mockVectorStoreService.similaritySearch).toHaveBeenCalledWith(
        mockQueryEmbedding,
        5,
        1.0,
      );
      expect(mockOpenaiService.generateRagAnswer).toHaveBeenCalledWith(
        expect.stringContaining('Quantum superposition allows qubits'),
        'How does superposition work?',
      );
    });
  });

  describe('handleUnifiedRequest', () => {
    it('should route to ingestDocument if content is provided', async () => {
      const ingestSpy = jest.spyOn(service, 'ingestDocument').mockResolvedValue({
        success: true,
        documentId: 'doc-id-123',
        chunksCount: 2,
        message: 'Ingested',
      });

      const res = await service.handleUnifiedRequest({
        title: 'Quantum Doc',
        content: 'Some quantum text content.',
      });

      expect(ingestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Quantum Doc',
          content: 'Some quantum text content.',
        }),
      );
      expect(res).toEqual({
        success: true,
        documentId: 'doc-id-123',
        chunksCount: 2,
        message: 'Ingested',
      });
    });

    it('should route to query if question is provided', async () => {
      const querySpy = jest.spyOn(service, 'query').mockResolvedValue({
        question: 'What is Qubit?',
        answer: 'A quantum bit',
        sources: [],
        model: 'openai/gpt-oss-120b',
        retrievedChunksCount: 0,
      });

      const res = await service.handleUnifiedRequest({
        question: 'What is Qubit?',
      });

      expect(querySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          question: 'What is Qubit?',
        }),
      );
      expect(res).toEqual({
        question: 'What is Qubit?',
        answer: 'A quantum bit',
        sources: [],
        model: 'openai/gpt-oss-120b',
        retrievedChunksCount: 0,
      });
    });

    it('should throw BadRequestException if neither content nor question is provided', async () => {
      await expect(service.handleUnifiedRequest({})).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
