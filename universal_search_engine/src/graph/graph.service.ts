import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GraphEntity } from './entities/graph-entity.entity';
import { GraphRelation } from './entities/graph-relation.entity';
import { Document } from '../database/entities/document.entity';
import { OpenaiService } from '../ai/services/openai.service';

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);

  constructor(
    @InjectRepository(GraphEntity)
    private readonly entityRepo: Repository<GraphEntity>,
    @InjectRepository(GraphRelation)
    private readonly relationRepo: Repository<GraphRelation>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly openaiService: OpenaiService,
  ) {}

  /**
   * Upsert a GraphEntity node by name and type to ensure uniqueness.
   */
  async upsertEntity(
    name: string,
    type: string,
    documentId?: string,
    metadata?: Record<string, any>,
  ): Promise<GraphEntity> {
    const trimmedName = name.trim();
    const cleanType = type.toLowerCase().trim();

    let entity = await this.entityRepo.findOne({
      where: { name: trimmedName, type: cleanType },
    });

    if (entity) {
      let updated = false;
      if (documentId && entity.documentId !== documentId) {
        entity.documentId = documentId;
        updated = true;
      }
      if (metadata) {
        entity.metadata = { ...entity.metadata, ...metadata };
        updated = true;
      }
      if (updated) {
        entity = await this.entityRepo.save(entity);
      }
      return entity;
    }

    // Generate concept vector for concepts to enable semantic matching
    let conceptVector: string | undefined = undefined;
    if (cleanType === 'concept') {
      try {
        const embedding = await this.openaiService.createEmbedding(trimmedName, 'passage');
        conceptVector = `[${embedding.join(',')}]`;
      } catch (err: any) {
        this.logger.warn(`Failed to generate concept vector for "${trimmedName}": ${err.message}`);
      }
    }

    const newEntity = this.entityRepo.create({
      name: trimmedName,
      type: cleanType,
      documentId: documentId || null,
      metadata: metadata || {},
      conceptVector,
    });

    return this.entityRepo.save(newEntity);
  }

  /**
   * Upsert a directed relation/edge between two nodes.
   */
  async upsertRelation(
    sourceId: string,
    targetId: string,
    type: string,
    metadata?: Record<string, any>,
  ): Promise<GraphRelation> {
    const cleanType = type.toUpperCase().trim();

    let relation = await this.relationRepo.findOne({
      where: { sourceId, targetId, type: cleanType },
    });

    if (relation) {
      if (metadata) {
        relation.metadata = { ...relation.metadata, ...metadata };
        relation = await this.relationRepo.save(relation);
      }
      return relation;
    }

    const newRelation = this.relationRepo.create({
      sourceId,
      targetId,
      type: cleanType,
      metadata: metadata || {},
    });

    return this.relationRepo.save(newRelation);
  }

  /**
   * Get an entity and all its 1st-degree inbound and outbound connections.
   */
  async getEntityNeighbors(entityId: string): Promise<any> {
    const entity = await this.entityRepo.findOne({
      where: { id: entityId },
      relations: { document: true },
    });

    if (!entity) {
      throw new HttpException('Entity not found', HttpStatus.NOT_FOUND);
    }

    const outRelations = await this.relationRepo.find({
      where: { sourceId: entityId },
      relations: { target: true },
    });

    const inRelations = await this.relationRepo.find({
      where: { targetId: entityId },
      relations: { source: true },
    });

    return {
      entity,
      outbound: outRelations.map((rel) => ({
        relationId: rel.id,
        type: rel.type,
        metadata: rel.metadata,
        target: {
          id: rel.target.id,
          name: rel.target.name,
          type: rel.target.type,
          metadata: rel.target.metadata,
        },
      })),
      inbound: inRelations.map((rel) => ({
        relationId: rel.id,
        type: rel.type,
        metadata: rel.metadata,
        source: {
          id: rel.source.id,
          name: rel.source.name,
          type: rel.source.type,
          metadata: rel.source.metadata,
        },
      })),
    };
  }

  /**
   * Extract semantic triples using Nvidia NIM 120B Chat model.
   */
  async extractTriplesFromText(text: string): Promise<any[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    try {
      const prompt = `Extract a list of key semantic entities and relationships (triples) from the text below.
Identify entities of these types only: 'document', 'author', 'institution', 'dataset', 'repository', 'patent', 'concept'.
Formulate predicates clearly (e.g. AUTHOR, AFFILIATED_WITH, USES_DATASET, HAS_REPO, MENTIONS, CITES).

Format your output STRICTLY as a JSON object containing a "triples" array. Do not output markdown, explanations, or triple-quotes.
Format:
{
  "triples": [
    {
      "subject": "Name of Subject Entity",
      "subjectType": "author",
      "predicate": "AFFILIATED_WITH",
      "object": "Name of Object Entity",
      "objectType": "institution"
    }
  ]
}

Text to extract from:
"${text}"`;

      // Call Nvidia Chat Completions model (OpenaiService has client setup)
      const chatResponse = await (this.openaiService as any).openai.chat.completions.create({
        model: (this.openaiService as any).modelName,
        messages: [
          { role: 'system', content: 'You are an elite Knowledge Graph extraction engine. Output valid JSON matching the schema precisely.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      });

      const content = chatResponse.choices[0]?.message?.content || '{"triples":[]}';
      const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return parsed.triples || [];
    } catch (error: any) {
      this.logger.error(`Failed to extract triples: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Automatically extracts triples from document content and populates the graph.
   */
  async autoGraphDocument(documentId: string): Promise<any> {
    const document = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    const textToAnalyze = document.metadata?.description || document.metadata?.content || document.title;
    this.logger.log(`Starting graph extraction for document "${document.title}"`);

    // Create hub node for the document itself
    const docNode = await this.upsertEntity(document.title, 'document', document.id, {
      sourceName: document.sourceName,
      url: document.sourceUrl,
    });

    // Extract triples
    const triples = await this.extractTriplesFromText(textToAnalyze);
    this.logger.log(`Extracted ${triples.length} triples for document "${document.title}"`);

    const createdEntities = new Set<string>();
    const createdRelations = new Set<string>();

    for (const triple of triples) {
      try {
        if (!triple.subject || !triple.object || !triple.predicate) {
          continue;
        }

        // 1. Upsert subject and object
        const subjectNode = await this.upsertEntity(
          triple.subject,
          triple.subjectType || 'concept',
          triple.subjectType?.toLowerCase() === 'document' ? document.id : undefined,
        );

        const objectNode = await this.upsertEntity(
          triple.object,
          triple.objectType || 'concept',
          triple.objectType?.toLowerCase() === 'document' ? document.id : undefined,
        );

        // 2. Link subject and object relation
        await this.upsertRelation(subjectNode.id, objectNode.id, triple.predicate);

        // 3. Link document hub to both nodes to keep the graph cohesive
        await this.upsertRelation(docNode.id, subjectNode.id, 'MENTIONS');
        await this.upsertRelation(docNode.id, objectNode.id, 'MENTIONS');

        createdEntities.add(subjectNode.id);
        createdEntities.add(objectNode.id);
        createdRelations.add(`${subjectNode.id}->${objectNode.id}`);
      } catch (err: any) {
        this.logger.warn(`Failed to process triple in loop: ${err.message}`);
      }
    }

    return {
      documentNodeId: docNode.id,
      nodesCreated: createdEntities.size + 1,
      relationsCreated: createdRelations.size + (createdEntities.size * 2),
    };
  }
}
