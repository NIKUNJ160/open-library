# Survey Report: Search Architecture, Vector Storage, and Nvidia NIM Integration (Phase 4 RAG)

**Agent**: `explorer_survey_3`  
**Date**: 2026-08-23  
**Target Codebase**: `d:\books\universal_search_engine`  
**Parent Agent**: `fea90591-7e28-426c-ad26-82dafa67699f`

---

## 1. Observation

### 1.1 Existing Search Architecture
* **`SearchController`** (`src/search/search.controller.ts`):
  * Class decorated with `@ApiTags('Search')`, `@Controller('search')`, `@UseInterceptors(SearchCacheInterceptor)`.
  * With the global prefix set in `src/main.ts` line 19 (`app.setGlobalPrefix('api/v1', { exclude: ['api/docs'] })`), the search base route is `/api/v1/search`.
  * Currently exposes a single endpoint:
    * `GET /api/v1/search` (`search(@Query() query: SearchQueryDto): Promise<SearchResponseDto>`)
  * Protected by global `ApiKeyGuard` (`src/auth/api-key.guard.ts`). Requests require header `x-api-key: demo-api-key-12345` (or `process.env.API_KEY`) unless marked with `@Public()`.
* **`SearchAggregatorService`** (`src/search/search-aggregator.service.ts`):
  * Aggregates 33 connectors across 7 knowledge categories (Books, Research Papers, Datasets, Patents, Repos, Gov, Docs).
  * Parses advanced query syntax via `parseAdvancedQuery` (`src/search/utils/query-parser.util.ts`).
  * Concurrently queries matching connectors via `Promise.allSettled()`.
  * Performs client-side metadata filtering, deduplication by `item.id`, and pagination (`page`, `limit`).
* **`SearchModule`** (`src/search/search.module.ts`):
  * Imports: `ConnectorsModule`, `CacheModule`, `DatabaseModule`.
  * Controllers: `[SearchController]`.
  * Providers: `[SearchAggregatorService]`.
  * Exports: `[SearchAggregatorService]`.

### 1.2 Existing Request/Response DTOs
* **Search DTOs** (`src/search/dto/`):
  * `SearchQueryDto`: `q`, `category` (enum `ContentType`), `source`, `page`, `limit`, `after`, `before`, `dateFrom`, `dateTo`, `author`, `sort`, `type`, `doi`, `isbn`, `year`, `journal`, `publisher`, `free`, `pdf`, `open_access`, `peer_reviewed`.
  * `SearchResponseDto`: `query` (string), `total` (number), `page` (number), `limit` (number), `results` (`SearchResultDto[]`), `warnings?` (`WarningDto[]`).
  * `SearchResultDto`: `id`, `title`, `url`, `authors`, `description`, `snippet`, `sourceName`, `contentType`, `publishedDate`, `score`, `metadata`, `citationCount`, `openAccess`, `license`.
* **AI DTOs** (`src/ai/dto/`):
  * `SummarizeRequestDto` / `SummarizeResponseDto`
  * `Eli5RequestDto` / `Eli5ResponseDto`
  * `CiteRequestDto` / `CiteResponseDto`
  * `AskRequestDto` / `AskResponseDto` (single doc Q&A without vector retrieval)
  * `RecommendationsQueryDto` / `RecommendationsResponseDto`

### 1.3 Database & Vector Store Integration
* **Database Configuration** (`src/app.module.ts`, `.env`):
  * PostgreSQL running on port `5433`, database name `knowledge_db`.
  * Extensions verified in Postgres: `plpgsql`, `vector`, `uuid-ossp`.
  * Tables in database: `documents`, `document_chunks`.
* **`Document` Entity** (`src/database/entities/document.entity.ts`):
  * Fields: `id` (UUID), `sourceUrl`, `sourceName`, `contentType`, `title`, `authors` (text), `metadata` (jsonb), `chunks` (`OneToMany` to `DocumentChunk`), `createdAt`, `updatedAt`.
* **`DocumentChunk` Entity** (`src/database/entities/document-chunk.entity.ts`):
  * Fields: `id` (UUID), `documentId` (UUID), `chunkIndex` (int), `content` (text), `embedding` (vector).
  * **Observed Mismatch**: Line 24 specifies `@Column({ type: 'vector', length: 1536, nullable: true })`. However, PostgreSQL table `document_chunks.embedding` is `vector(1024)`, matching the 1024 dimensions of `nvidia/nv-embedqa-e5-v5`. Entity length should be updated to `1024`.
* **`VectorStoreService`** (`src/database/vector-store.service.ts`):
  * `saveDocumentWithChunks(documentData, chunksData)`: Persists document and chunk records, formatting embeddings as string `"[v1,v2,...]"`.
  * `similaritySearch(queryEmbedding, limit = 5, similarityThreshold = 0.5)`: Uses pgvector cosine distance operator `<=>` via TypeORM QueryBuilder.

### 1.4 Nvidia NIM API Integration (Live Verified)
* **Configuration** (`.env`):
  * `NVIDIA_API_KEY`: `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`
  * `NVIDIA_BASE_URL`: `https://integrate.api.nvidia.com/v1`
  * `NVIDIA_MODEL`: `openai/gpt-oss-120b`
  * Embedding Model: `nvidia/nv-embedqa-e5-v5`
* **Embeddings API (`nvidia/nv-embedqa-e5-v5`)**:
  * **Endpoint**: `POST https://integrate.api.nvidia.com/v1/embeddings`
  * **Headers**: `Authorization: Bearer <NVIDIA_API_KEY>`, `Content-Type: application/json`
  * **Embedding Dimension**: Exactly **1024** floating point values (verified live via API response).
  * **Dual-Mode Input Types (`input_type`)**:
    * Ingestion/Indexing: `"input_type": "passage"`
    * Search/Retrieval: `"input_type": "query"`
  * **Payload Structure**:
    ```json
    {
      "model": "nvidia/nv-embedqa-e5-v5",
      "input": ["Text chunk to vectorize"],
      "input_type": "passage",
      "encoding_format": "float",
      "truncate": "END"
    }
    ```
  * **Token Limit**: Context length is **512 tokens** per chunk. Text chunker must split text to ~300-500 characters (or ~100-200 words) with overlap to guarantee no truncation loss.
* **LLM Chat Completion (`openai/gpt-oss-120b`)**:
  * **Endpoint**: `POST https://integrate.api.nvidia.com/v1/chat/completions` (OpenAI-compatible)
  * **Model Type**: 117-Billion parameter Mixture-of-Experts (MoE) reasoning model.
  * **Response Format**: Generates reasoning steps first (`reasoning_content` in choice message) followed by final response `content`.
  * **Configuration Advice**: `max_tokens` should be set to `2048` - `4096` (if `max_tokens` is set too low like <100, token limit is consumed by reasoning, returning `content: null`).

---

## 2. Logic Chain

1. **R1: Vector Ingestion Pipeline**:
   * A service (`RagService`) receives an ingestion payload containing text, title, and metadata.
   * The text is split into chunks (e.g. 500 characters, 50 character overlap).
   * For each chunk (or batch of chunks), an embedding request is sent to `https://integrate.api.nvidia.com/v1/embeddings` with `model: "nvidia/nv-embedqa-e5-v5"` and `input_type: "passage"`.
   * The returned 1024-dimension float vectors and chunk contents are saved via `VectorStoreService.saveDocumentWithChunks`.

2. **R2: RAG Query Execution**:
   * A user asks a natural language question.
   * `RagService` embeds the question using `nvidia/nv-embedqa-e5-v5` with `input_type: "query"`.
   * `VectorStoreService.similaritySearch` is called with the 1024-dim query vector and `limit = 5` to retrieve the top 5 semantically relevant chunks from `knowledge_db`.
   * `RagService` constructs a prompt containing the 5 retrieved chunk contexts and instructs `openai/gpt-oss-120b` via `https://integrate.api.nvidia.com/v1/chat/completions` to answer strictly grounded in the context.
   * The answer and source citations are returned.

3. **R3: API Endpoints & Controller Placement**:
   * Under requirement R3, `SearchController` should expose the RAG endpoints to allow users to ingest documents and ask questions.
   * Recommended clean design:
     * `POST /api/v1/search/rag/ingest`: Accepts `RagIngestRequestDto`, returns `RagIngestResponseDto`.
     * `POST /api/v1/search/rag/query`: Accepts `RagQueryRequestDto`, returns `RagQueryResponseDto`.
     * (Optionally also support `POST /api/v1/search/rag` or `GET /api/v1/search/rag` for unified access).
   * In addition, `@Public()` should be placed on the RAG endpoints so that public cURL commands work seamlessly without authentication errors.

---

## 3. Caveats

* **`document-chunk.entity.ts` Dimension**: Line 24 currently has `length: 1536`. When TypeORM connects, if it attempts to enforce or recreate 1536 against 1024 vectors, Postgres will throw a dimension mismatch error. It must be updated to `length: 1024`.
* **Cosine Distance in pgvector**: `VectorStoreService.similaritySearch` currently filters with `chunk.embedding <=> :embedding <= :threshold` with default `similarityThreshold = 0.5`. If the similarity threshold is too low, valid contexts may be filtered out. The threshold should default to `1.0` or allow optional filtering, ordering strictly by cosine distance ASC.
* **Token Limits for Chunking**: `nv-embedqa-e5-v5` has a 512-token max input length. The text chunker must enforce chunk sizes well within 512 tokens (e.g., 500-1000 characters).

---

## 4. Conclusion & Required Additions

### Summary Table of Required Artifacts

| Component | Target Location | Description |
|---|---|---|
| **DTOs** | `src/search/dto/rag-ingest.dto.ts`<br>`src/search/dto/rag-query.dto.ts` | Request/Response DTOs with Swagger annotations and class-validator decorators. |
| **Entity Fix** | `src/database/entities/document-chunk.entity.ts` | Update `@Column({ type: 'vector', length: 1024, nullable: true })`. |
| **RagService** | `src/search/rag.service.ts` (or `src/ai/services/rag.service.ts`) | Implements chunking, Nvidia embeddings (`input_type: passage/query`), pgvector store/search, Nvidia LLM prompt execution. |
| **SearchController** | `src/search/search.controller.ts` | Expose `POST /search/rag/ingest` and `POST /search/rag/query` (and/or `POST /search/rag`), decorated with `@Public()` and Swagger documentation. |
| **SearchModule** | `src/search/search.module.ts` | Register `RagService`, `OpenaiService` (or `AiModule`), and `DatabaseModule`. |

### Specific DTO Definitions Needed

1. **`RagIngestRequestDto`**:
   ```typescript
   export class RagIngestRequestDto {
     @ApiProperty({ description: 'Title of the document', example: 'Quantum Computing Overview' })
     @IsString()
     title: string;

     @ApiProperty({ description: 'Raw document text content to chunk and vectorize' })
     @IsString()
     text: string;

     @ApiPropertyOptional({ description: 'Source URL of the document' })
     @IsString()
     @IsOptional()
     sourceUrl?: string;

     @ApiPropertyOptional({ description: 'Source connector name', default: 'manual_ingest' })
     @IsString()
     @IsOptional()
     sourceName?: string;

     @ApiPropertyOptional({ description: 'Content type', default: 'document' })
     @IsString()
     @IsOptional()
     contentType?: string;

     @ApiPropertyOptional({ description: 'List of authors or author string' })
     @IsOptional()
     authors?: string[] | string;

     @ApiPropertyOptional({ description: 'Additional metadata' })
     @IsOptional()
     metadata?: Record<string, any>;

     @ApiPropertyOptional({ description: 'Chunk size in characters', default: 500 })
     @IsInt()
     @IsOptional()
     chunkSize?: number;

     @ApiPropertyOptional({ description: 'Chunk overlap in characters', default: 50 })
     @IsInt()
     @IsOptional()
     chunkOverlap?: number;
   }
   ```

2. **`RagIngestResponseDto`**:
   ```typescript
   export class RagIngestResponseDto {
     @ApiProperty({ example: true })
     success: boolean;

     @ApiProperty({ description: 'ID of saved document' })
     documentId: string;

     @ApiProperty()
     title: string;

     @ApiProperty({ description: 'Number of chunks created and stored' })
     chunksCount: number;

     @ApiProperty()
     message: string;
   }
   ```

3. **`RagQueryRequestDto`**:
   ```typescript
   export class RagQueryRequestDto {
     @ApiProperty({ description: 'Natural language question to ask', example: 'What is quantum superposition?' })
     @IsString()
     query: string;

     @ApiPropertyOptional({ description: 'Max number of similar chunks to retrieve', default: 5 })
     @IsInt()
     @IsOptional()
     limit?: number;

     @ApiPropertyOptional({ description: 'Max cosine distance threshold', default: 1.0 })
     @IsNumber()
     @IsOptional()
     similarityThreshold?: number;
   }
   ```

4. **`RagQueryResponseDto`**:
   ```typescript
   export class RagQuerySourceDto {
     @ApiProperty()
     documentId: string;

     @ApiProperty()
     title: string;

     @ApiPropertyOptional()
     sourceUrl?: string;

     @ApiProperty()
     chunkIndex: number;

     @ApiProperty()
     content: string;

     @ApiPropertyOptional()
     similarityScore?: number;
   }

   export class RagQueryResponseDto {
     @ApiProperty()
     query: string;

     @ApiProperty({ description: 'Generated answer from openai/gpt-oss-120b' })
     answer: string;

     @ApiProperty({ type: [RagQuerySourceDto] })
     sources: RagQuerySourceDto[];

     @ApiProperty()
     totalChunksRetrieved: number;
   }
   ```

---

## 5. Verification Method

### 5.1 Project Build & Unit Tests
Run in `d:\books\universal_search_engine`:
```bash
npm run build
npm test
```

### 5.2 cURL Ingestion Verification
```bash
curl -X POST "http://localhost:3000/api/v1/search/rag/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Quantum Computing Fundamentals",
    "text": "Quantum computing is a rapidly-emerging technology that harnesses the laws of quantum mechanics to solve problems too complex for classical computers. Qubits can exist in superposition, allowing simultaneous representation of 0 and 1. Entanglement links qubits such that the state of one instantly influences another.",
    "sourceUrl": "https://example.com/quantum",
    "sourceName": "quantum_manual"
  }'
```
* **Expected Output**: HTTP 201/200, returning `{"success": true, "documentId": "...", "chunksCount": 1, ...}`.

### 5.3 cURL RAG Query Verification
```bash
curl -X POST "http://localhost:3000/api/v1/search/rag/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What allows qubits to represent 0 and 1 simultaneously?"
  }'
```
* **Expected Output**: HTTP 200 OK, returning `{"query": "...", "answer": "...superposition...", "sources": [...]}`.
