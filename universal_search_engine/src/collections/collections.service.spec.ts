import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectionsService } from './collections.service';
import { Collection } from './entities/collection.entity';
import { Document } from '../database/entities/document.entity';
import { CitationService } from '../ai/services/citation.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CollectionsService', () => {
  let service: CollectionsService;
  let collectionRepo: jest.Mocked<Repository<Collection>>;
  let documentRepo: jest.Mocked<Repository<Document>>;
  let citationService: jest.Mocked<CitationService>;

  const mockCollectionRepo = () => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  });

  const mockDocumentRepo = () => ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  });

  const mockCitationService = () => ({
    generateCitation: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionsService,
        {
          provide: getRepositoryToken(Collection),
          useFactory: mockCollectionRepo,
        },
        {
          provide: getRepositoryToken(Document),
          useFactory: mockDocumentRepo,
        },
        {
          provide: CitationService,
          useFactory: mockCitationService,
        },
      ],
    }).compile();

    service = module.get<CollectionsService>(CollectionsService);
    collectionRepo = module.get(getRepositoryToken(Collection));
    documentRepo = module.get(getRepositoryToken(Document));
    citationService = module.get(CitationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create and save a collection', async () => {
      const dto = { name: 'Test Col', description: 'Test Desc' };
      const createdVal = { id: 'col-1', ...dto, documents: [], createdAt: new Date(), updatedAt: new Date() };

      collectionRepo.create.mockReturnValue(createdVal as any);
      collectionRepo.save.mockResolvedValue(createdVal as any);

      const result = await service.create(dto);

      expect(collectionRepo.create).toHaveBeenCalledWith({
        name: 'Test Col',
        description: 'Test Desc',
        documents: [],
      });
      expect(collectionRepo.save).toHaveBeenCalledWith(createdVal);
      expect(result).toEqual(createdVal);
    });
  });

  describe('findOne', () => {
    it('should return a collection if found', async () => {
      const collection = { id: 'col-1', name: 'Col', documents: [] };
      collectionRepo.findOne.mockResolvedValue(collection as any);

      const result = await service.findOne('col-1');

      expect(collectionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'col-1' },
        relations: { documents: true },
      });
      expect(result).toEqual(collection);
    });

    it('should throw NotFoundException if not found', async () => {
      collectionRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addItem', () => {
    it('should associate an existing document', async () => {
      const collection = { id: 'col-1', name: 'Col', documents: [] };
      const document = { id: 'doc-1', title: 'Doc' };

      collectionRepo.findOne.mockResolvedValue(collection as any);
      documentRepo.findOne.mockResolvedValue(document as any);
      collectionRepo.save.mockImplementation(async (c: any) => c);

      const result = await service.addItem('col-1', { documentId: 'doc-1' });

      expect(documentRepo.findOne).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
      expect(collection.documents).toContainEqual(document);
      expect(result.documents).toContainEqual(document);
    });

    it('should create and associate a document stub if documentId is not provided', async () => {
      const collection = { id: 'col-1', name: 'Col', documents: [] };
      const stubDto = { title: 'Stub Doc', sourceUrl: 'https://test.com', sourceName: 'test' };
      const createdStub = { id: 'doc-stub-1', ...stubDto };

      collectionRepo.findOne.mockResolvedValue(collection as any);
      documentRepo.findOne.mockResolvedValue(null); // No existing doc
      documentRepo.create.mockReturnValue(createdStub as any);
      documentRepo.save.mockResolvedValue(createdStub as any);
      collectionRepo.save.mockImplementation(async (c: any) => c);

      const result = await service.addItem('col-1', stubDto);

      expect(documentRepo.create).toHaveBeenCalled();
      expect(documentRepo.save).toHaveBeenCalled();
      expect(collection.documents).toContainEqual(createdStub);
      expect(result.documents).toContainEqual(createdStub);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from collection', async () => {
      const document = { id: 'doc-1', title: 'Doc' };
      const collection = { id: 'col-1', name: 'Col', documents: [document] };

      collectionRepo.findOne.mockResolvedValue(collection as any);
      collectionRepo.save.mockImplementation(async (c: any) => c);

      const result = await service.removeItem('col-1', 'doc-1');

      expect(result.documents).not.toContainEqual(document);
    });

    it('should throw NotFoundException if document is not in collection', async () => {
      const collection = { id: 'col-1', name: 'Col', documents: [] };
      collectionRepo.findOne.mockResolvedValue(collection as any);

      await expect(service.removeItem('col-1', 'doc-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('exportCitations', () => {
    it('should format citations using CitationService', async () => {
      const doc = { title: 'Doc Title', authors: '["Author A"]', sourceName: 'src', sourceUrl: 'url', metadata: {} };
      const collection = { id: 'col-1', name: 'Col', documents: [doc] };

      collectionRepo.findOne.mockResolvedValue(collection as any);
      citationService.generateCitation.mockResolvedValue('APA formatted citation');

      const result = await service.exportCitations({ format: 'apa', collectionId: 'col-1' });

      expect(citationService.generateCitation).toHaveBeenCalledWith(
        {
          title: doc.title,
          authors: doc.authors,
          publishedDate: undefined,
          sourceName: doc.sourceName,
          sourceUrl: doc.sourceUrl,
          metadata: doc.metadata,
        },
        'apa',
      );
      expect(result).toEqual(['APA formatted citation']);
    });
  });
});
