import { Controller, Get, Post, Body, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  SearchQueryDto,
  SearchResponseDto,
  RagIngestDto,
  RagIngestResponseDto,
  RagQueryDto,
  RagQueryResponseDto,
  RagUnifiedDto,
} from './dto';
import { SearchAggregatorService } from './search-aggregator.service';
import { SearchCacheInterceptor } from '../cache/search-cache.interceptor';
import { Public } from '../auth/decorators/public.decorator';
import { RagService } from '../ai/services/rag.service';

@ApiTags('Search')
@Controller('search')
@UseInterceptors(SearchCacheInterceptor)
export class SearchController {
  constructor(
    private readonly searchAggregatorService: SearchAggregatorService,
    private readonly ragService: RagService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Search across 22 open knowledge sources',
    description:
      'Aggregates knowledge results across 7 categories (Books, Research Papers, Datasets, Patents, Repos, Gov, Docs) with parallel fault-tolerant execution.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved aggregated search results',
    type: SearchResponseDto,
  })
  async search(@Query() query: SearchQueryDto): Promise<SearchResponseDto> {
    return this.searchAggregatorService.search(query);
  }

  @Public()
  @Post('rag/ingest')
  @ApiOperation({
    summary: 'Ingest and vectorize document into pgvector knowledge base',
    description:
      'Splits text content into clean semantic chunks, generates 1024-dimensional embeddings via Nvidia NIM nv-embedqa-e5-v5 with passage input type, and persists them to PostgreSQL.',
  })
  @ApiResponse({
    status: 201,
    description: 'Document successfully ingested and vectorized',
    type: RagIngestResponseDto,
  })
  async ingestDocument(@Body() dto: RagIngestDto): Promise<RagIngestResponseDto> {
    return this.ragService.ingestDocument(dto);
  }

  @Public()
  @Post('rag/query')
  @ApiOperation({
    summary: 'RAG query using pgvector semantic retrieval and Nvidia 120B model',
    description:
      'Vectorizes natural language question with query input type, retrieves top similar chunks from pgvector database, and generates an accurate, context-grounded answer using Nvidia openai/gpt-oss-120b.',
  })
  @ApiResponse({
    status: 200,
    description: 'Generated answer with context source citations',
    type: RagQueryResponseDto,
  })
  async queryRag(@Body() dto: RagQueryDto): Promise<RagQueryResponseDto> {
    return this.ragService.query(dto);
  }

  @Public()
  @Post('rag')
  @ApiOperation({
    summary: 'Unified RAG endpoint for document ingestion or question answering',
    description:
      'Accepts either a question (for RAG Q&A retrieval) or document content (for pgvector ingestion).',
  })
  @ApiResponse({
    status: 200,
    description: 'Result of ingestion or RAG query',
  })
  async unifiedRag(
    @Body() dto: RagUnifiedDto,
  ): Promise<RagIngestResponseDto | RagQueryResponseDto> {
    return this.ragService.handleUnifiedRequest(dto);
  }
}
