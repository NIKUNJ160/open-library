import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from './entities/collection.entity';
import { Document } from '../database/entities/document.entity';
import { CreateCollectionDto, AddItemDto, ExportCitationsDto } from './dto';
import { CitationService } from '../ai/services/citation.service';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly citationService: CitationService,
  ) {}

  async create(dto: CreateCollectionDto): Promise<Collection> {
    const collection = this.collectionRepo.create({
      name: dto.name.trim(),
      description: dto.description?.trim(),
      documents: [],
    });
    return this.collectionRepo.save(collection);
  }

  async findAll(): Promise<Collection[]> {
    return this.collectionRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Collection> {
    const collection = await this.collectionRepo.findOne({
      where: { id },
      relations: { documents: true },
    });
    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found.`);
    }
    return collection;
  }

  async update(id: string, dto: CreateCollectionDto): Promise<Collection> {
    const collection = await this.findOne(id);
    collection.name = dto.name.trim();
    if (dto.description !== undefined) {
      collection.description = dto.description.trim();
    }
    return this.collectionRepo.save(collection);
  }

  async delete(id: string): Promise<void> {
    const collection = await this.findOne(id);
    await this.collectionRepo.remove(collection);
  }

  async addItem(collectionId: string, dto: AddItemDto): Promise<Collection> {
    const collection = await this.findOne(collectionId);
    let document: Document | null = null;

    if (dto.documentId) {
      document = await this.documentRepo.findOne({ where: { id: dto.documentId } });
      if (!document) {
        throw new NotFoundException(`Document with ID ${dto.documentId} not found.`);
      }
    } else {
      if (!dto.title) {
        throw new BadRequestException('A title is required when adding an external item without a documentId.');
      }
      
      const sourceUrl = dto.sourceUrl || `collection-item://${Date.now()}`;
      const sourceName = dto.sourceName || 'Collection Manual Add';

      // Check if document stub already exists to prevent duplicate entries
      const existingDoc = await this.documentRepo.findOne({ where: { sourceUrl } });
      if (existingDoc) {
        document = existingDoc;
      } else {
        document = this.documentRepo.create({
          title: dto.title.trim(),
          sourceUrl,
          sourceName,
          contentType: dto.contentType || 'document',
          authors: dto.authors ? JSON.stringify(dto.authors) : undefined,
          metadata: dto.metadata || {},
          chunks: [],
        });
        document = await this.documentRepo.save(document);
      }
    }

    // Check if document is already in collection
    const alreadyExists = collection.documents.some((doc) => doc.id === document!.id);
    if (!alreadyExists) {
      collection.documents.push(document);
      return this.collectionRepo.save(collection);
    }

    return collection;
  }

  async removeItem(collectionId: string, documentId: string): Promise<Collection> {
    const collection = await this.findOne(collectionId);
    const initialCount = collection.documents.length;
    collection.documents = collection.documents.filter((doc) => doc.id !== documentId);
    
    if (collection.documents.length === initialCount) {
      throw new NotFoundException(`Document with ID ${documentId} is not in this collection.`);
    }

    return this.collectionRepo.save(collection);
  }

  async exportCitations(dto: ExportCitationsDto): Promise<string[]> {
    let itemsToCite: Record<string, any>[] = [];

    if (dto.collectionId) {
      const collection = await this.findOne(dto.collectionId);
      itemsToCite = collection.documents.map((doc) => ({
        title: doc.title,
        authors: doc.authors,
        publishedDate: doc.metadata?.publishedDate || doc.metadata?.year || undefined,
        sourceName: doc.sourceName,
        sourceUrl: doc.sourceUrl,
        metadata: doc.metadata,
      }));
    } else if (dto.documentIds && dto.documentIds.length > 0) {
      const docs = await this.documentRepo.find({
        where: dto.documentIds.map((id) => ({ id })),
      });
      itemsToCite = docs.map((doc) => ({
        title: doc.title,
        authors: doc.authors,
        publishedDate: doc.metadata?.publishedDate || doc.metadata?.year || undefined,
        sourceName: doc.sourceName,
        sourceUrl: doc.sourceUrl,
        metadata: doc.metadata,
      }));
    } else if (dto.items && dto.items.length > 0) {
      itemsToCite = dto.items;
    } else {
      throw new BadRequestException('You must provide either a collectionId, documentIds, or raw items to export citations.');
    }

    const citationPromises = itemsToCite.map((item) =>
      this.citationService.generateCitation(item, dto.format),
    );

    return Promise.all(citationPromises);
  }
}
