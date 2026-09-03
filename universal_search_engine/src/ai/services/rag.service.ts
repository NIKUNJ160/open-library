import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { VectorStoreService } from '../../database/vector-store.service';
import {
  RagIngestDto,
  RagIngestResponseDto,
  RagQueryDto,
  RagQueryResponseDto,
  RagSourceChunkDto,
  RagUnifiedDto,
} from '../dto';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  /**
   * Split input text into clean semantic chunks with configurable size and overlap.
   * Target size: ~1500 characters (~500 tokens), overlap: ~200 characters.
   */
  chunkText(text: string, maxChunkSize = 1500, overlap = 200): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const cleanedText = text.replace(/\r\n/g, '\n').trim();
    if (cleanedText.length <= maxChunkSize) {
      return [cleanedText];
    }

    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < cleanedText.length) {
      let endIndex = startIndex + maxChunkSize;

      if (endIndex >= cleanedText.length) {
        const lastChunk = cleanedText.slice(startIndex).trim();
        if (lastChunk.length > 0) {
          chunks.push(lastChunk);
        }
        break;
      }

      // Priority 1: Break at a paragraph boundary (\n\n)
      let breakIndex = cleanedText.lastIndexOf('\n\n', endIndex);
      if (breakIndex > startIndex + maxChunkSize * 0.5) {
        endIndex = breakIndex + 2;
      } else {
        // Priority 2: Break at a sentence boundary (. , ! , ? , single newline)
        const slice = cleanedText.slice(startIndex, endIndex);
        const sentencePattern = /[.!?\n]\s+/g;
        let match: RegExpExecArray | null;
        let lastSentenceEnd = -1;

        while ((match = sentencePattern.exec(slice)) !== null) {
          lastSentenceEnd = match.index + match[0].length;
        }

        if (lastSentenceEnd > maxChunkSize * 0.4) {
          endIndex = startIndex + lastSentenceEnd;
        } else {
          // Priority 3: Fall back to word boundary
          const lastSpace = cleanedText.lastIndexOf(' ', endIndex);
          if (lastSpace > startIndex + maxChunkSize * 0.4) {
            endIndex = lastSpace + 1;
          }
        }
      }

      const chunk = cleanedText.slice(startIndex, endIndex).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Slide start window forward by chunk length minus overlap
      const step = Math.max(1, endIndex - startIndex - overlap);
      startIndex += step;
    }

    return chunks;
  }

  /**
   * Ingest a document, split into chunks, generate passage embeddings with Nvidia NIM, and persist to pgvector.
   */
  async ingestDocument(dto: RagIngestDto): Promise<RagIngestResponseDto> {
    if (!dto.content || dto.content.trim().length === 0) {
      throw new BadRequestException('Document content cannot be empty.');
    }
    if (!dto.title || dto.title.trim().length === 0) {
      throw new BadRequestException('Document title cannot be empty.');
    }

    const chunks = this.chunkText(dto.content);
    if (chunks.length === 0) {
      throw new BadRequestException('Failed to extract any text chunks from the provided content.');
    }

    this.logger.log(
      `Ingesting document "${dto.title}": splitting into ${chunks.length} chunks for passage embedding.`,
    );

    // Generate passage embeddings for each chunk using Nvidia NIM nv-embedqa-e5-v5
    const embeddings = await this.openaiService.createEmbeddings(chunks, 'passage');

    const chunksData = chunks.map((content, index) => ({
      content,
      chunkIndex: index,
      embedding: embeddings[index],
    }));

    const documentData = {
      title: dto.title.trim(),
      sourceUrl: dto.sourceUrl || `internal://rag-ingest/${Date.now()}`,
      sourceName: dto.sourceName || 'RAG Document Ingest',
      contentType: dto.contentType || 'document',
      authors: dto.authors
        ? Array.isArray(dto.authors)
          ? JSON.stringify(dto.authors)
          : dto.authors
        : undefined,
      metadata: dto.metadata || {},
    };

    const savedDocument = await this.vectorStoreService.saveDocumentWithChunks(
      documentData,
      chunksData,
    );

    this.logger.log(
      `Successfully persisted document ${savedDocument.id} with ${chunks.length} vectorized chunks.`,
    );

    return {
      success: true,
      documentId: savedDocument.id,
      chunksCount: chunks.length,
      message: `Successfully ingested document "${dto.title}" with ${chunks.length} chunks.`,
    };
  }

  /**
   * Query the knowledge base: embed question with 'query' type, retrieve top-5 pgvector chunks, and generate answer via Nvidia 120B.
   */
  async query(dto: RagQueryDto): Promise<RagQueryResponseDto> {
    if (!dto.question || dto.question.trim().length === 0) {
      throw new BadRequestException('Query question cannot be empty.');
    }

    const topK = dto.topK || 5;
    const similarityThreshold =
      dto.similarityThreshold !== undefined ? dto.similarityThreshold : 1.0;

    this.logger.log(
      `Executing RAG query for question: "${dto.question}" (topK: ${topK}, threshold: ${similarityThreshold})`,
    );

    // 1. Generate query embedding using Nvidia NIM nv-embedqa-e5-v5 with input_type: 'query'
    const queryEmbedding = await this.openaiService.createEmbedding(dto.question, 'query');

    // 2. Perform cosine similarity search against pgvector database
    const retrievedChunks = await this.vectorStoreService.similaritySearch(
      queryEmbedding,
      topK,
      similarityThreshold,
    );

    const modelName = process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct';

    // 3. If no chunks found, return helpful response
    if (!retrievedChunks || retrievedChunks.length === 0) {
      this.logger.warn(`No relevant chunks found in database for query: "${dto.question}"`);
      return {
        question: dto.question,
        answer:
          'No relevant context or documents were found in the knowledge database to answer this question. Please ingest relevant documents into the system first.',
        sources: [],
        model: modelName,
        retrievedChunksCount: 0,
      };
    }

    // 4. Map retrieved chunks to source DTOs
    const sources: RagSourceChunkDto[] = retrievedChunks.map((chunk) => ({
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      documentId: chunk.documentId,
      documentTitle: chunk.document?.title,
      sourceUrl: chunk.document?.sourceUrl,
      sourceName: chunk.document?.sourceName,
    }));

    // 5. Construct grounding context string for LLM
    const contextText = retrievedChunks
      .map((chunk, index) => {
        const title = chunk.document?.title ? `Document: ${chunk.document.title}` : `Document ID: ${chunk.documentId}`;
        const source = chunk.document?.sourceName ? ` (Source: ${chunk.document.sourceName})` : '';
        return `[Source ${index + 1} - ${title}${source} | Chunk ${chunk.chunkIndex}]\n${chunk.content}`;
      })
      .join('\n\n---\n\n');

    // 6. Invoke Nvidia 120B model with context and question
    const answer = await this.openaiService.generateRagAnswer(contextText, dto.question);

    this.logger.log(
      `Generated RAG response using ${sources.length} context chunks with model ${modelName}.`,
    );

    return {
      question: dto.question,
      answer,
      sources,
      model: modelName,
      retrievedChunksCount: sources.length,
    };
  }

  /**
   * Handle unified /search/rag endpoint supporting both document ingestion and questioning.
   */
  async handleUnifiedRequest(
    dto: RagUnifiedDto,
  ): Promise<RagIngestResponseDto | RagQueryResponseDto> {
    if (dto.content && dto.content.trim().length > 0) {
      return this.ingestDocument({
        title: dto.title || 'Untitled Ingested Document',
        content: dto.content,
        sourceUrl: dto.sourceUrl,
        sourceName: dto.sourceName,
        contentType: dto.contentType,
        authors: dto.authors,
        metadata: dto.metadata,
      });
    }

    if (dto.question && dto.question.trim().length > 0) {
      return this.query({
        question: dto.question,
        topK: dto.topK,
        similarityThreshold: dto.similarityThreshold,
      });
    }

    throw new BadRequestException(
      'Invalid request: provide "question" to query the RAG pipeline or "content" (with optional "title") to ingest documents.',
    );
  }
}
