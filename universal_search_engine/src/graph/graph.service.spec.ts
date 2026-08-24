import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GraphService } from './graph.service';
import { GraphEntity } from './entities/graph-entity.entity';
import { GraphRelation } from './entities/graph-relation.entity';
import { Document } from '../database/entities/document.entity';
import { OpenaiService } from '../ai/services/openai.service';
import { HttpException } from '@nestjs/common';

describe('GraphService', () => {
  let service: GraphService;
  let entityRepo: jest.Mocked<Repository<GraphEntity>>;
  let relationRepo: jest.Mocked<Repository<GraphRelation>>;
  let documentRepo: jest.Mocked<Repository<Document>>;
  let openaiService: jest.Mocked<OpenaiService>;

  const mockEntityRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  });

  const mockRelationRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  });

  const mockDocumentRepo = () => ({
    findOne: jest.fn(),
  });

  const mockOpenaiService = () => ({
    createEmbedding: jest.fn(),
    openai: {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    },
    modelName: 'test-model',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphService,
        {
          provide: getRepositoryToken(GraphEntity),
          useFactory: mockEntityRepo,
        },
        {
          provide: getRepositoryToken(GraphRelation),
          useFactory: mockRelationRepo,
        },
        {
          provide: getRepositoryToken(Document),
          useFactory: mockDocumentRepo,
        },
        {
          provide: OpenaiService,
          useFactory: mockOpenaiService,
        },
      ],
    }).compile();

    service = module.get<GraphService>(GraphService);
    entityRepo = module.get(getRepositoryToken(GraphEntity));
    relationRepo = module.get(getRepositoryToken(GraphRelation));
    documentRepo = module.get(getRepositoryToken(Document));
    openaiService = module.get(OpenaiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsertEntity', () => {
    it('should return existing entity if found', async () => {
      const mockEntity = { id: 'entity-1', name: 'Concept A', type: 'concept', metadata: {} };
      entityRepo.findOne.mockResolvedValue(mockEntity as any);

      const result = await service.upsertEntity('Concept A', 'concept');

      expect(entityRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'Concept A', type: 'concept' },
      });
      expect(result).toEqual(mockEntity);
    });

    it('should generate embeddings and create new entity if not found (concept)', async () => {
      entityRepo.findOne.mockResolvedValue(null);
      openaiService.createEmbedding.mockResolvedValue([0.1, 0.2]);
      entityRepo.create.mockReturnValue({ id: 'new-entity', name: 'Concept B', type: 'concept' } as any);
      entityRepo.save.mockResolvedValue({ id: 'new-entity', name: 'Concept B', type: 'concept', conceptVector: '[0.1,0.2]' } as any);

      const result = await service.upsertEntity('Concept B', 'concept');

      expect(openaiService.createEmbedding).toHaveBeenCalledWith('Concept B', 'passage');
      expect(entityRepo.create).toHaveBeenCalledWith({
        name: 'Concept B',
        type: 'concept',
        documentId: null,
        metadata: {},
        conceptVector: '[0.1,0.2]',
      });
      expect(result.id).toEqual('new-entity');
    });
  });

  describe('upsertRelation', () => {
    it('should return existing relation if found', async () => {
      const mockRelation = { id: 'rel-1', sourceId: 'src', targetId: 'tgt', type: 'MENTIONS', metadata: {} };
      relationRepo.findOne.mockResolvedValue(mockRelation as any);

      const result = await service.upsertRelation('src', 'tgt', 'MENTIONS');

      expect(relationRepo.findOne).toHaveBeenCalledWith({
        where: { sourceId: 'src', targetId: 'tgt', type: 'MENTIONS' },
      });
      expect(result).toEqual(mockRelation);
    });
  });

  describe('getEntityNeighbors', () => {
    it('should throw error if entity does not exist', async () => {
      entityRepo.findOne.mockResolvedValue(null);

      await expect(service.getEntityNeighbors('missing-id')).rejects.toThrow(HttpException);
    });

    it('should resolve inbound and outbound relationships', async () => {
      const mockEntity = { id: 'node-1', name: 'Node 1', type: 'author' };
      entityRepo.findOne.mockResolvedValue(mockEntity as any);

      const mockOutRelation = {
        id: 'out-1',
        type: 'AFFILIATED_WITH',
        metadata: {},
        target: { id: 'node-2', name: 'University', type: 'institution', metadata: {} },
      };
      const mockInRelation = {
        id: 'in-1',
        type: 'AUTHOR',
        metadata: {},
        source: { id: 'node-3', name: 'Attention is All You Need', type: 'document', metadata: {} },
      };

      relationRepo.find.mockResolvedValueOnce([mockOutRelation] as any); // outbound search
      relationRepo.find.mockResolvedValueOnce([mockInRelation] as any); // inbound search

      const result = await service.getEntityNeighbors('node-1');

      expect(result.entity).toEqual(mockEntity);
      expect(result.outbound.length).toBe(1);
      expect(result.outbound[0].target.id).toBe('node-2');
      expect(result.inbound.length).toBe(1);
      expect(result.inbound[0].source.id).toBe('node-3');
    });
  });

  describe('extractTriplesFromText', () => {
    it('should parse Nvidia model chat completion response into triples array', async () => {
      const mockTriples = [
        { subject: 'Attention', subjectType: 'concept', predicate: 'MENTIONS', object: 'Transformer', objectType: 'concept' },
      ];
      const mockChatResult = {
        choices: [
          {
            message: {
              content: JSON.stringify({ triples: mockTriples }),
            },
          },
        ],
      };

      (openaiService as any).openai.chat.completions.create.mockResolvedValue(mockChatResult);

      const result = await service.extractTriplesFromText('Attention mentions Transformer');

      expect(result).toEqual(mockTriples);
    });
  });
});
