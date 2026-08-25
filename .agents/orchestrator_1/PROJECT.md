# Project: Universal Open Knowledge Search Engine - Phase 4 RAG Pipeline

## Architecture
- **Framework**: NestJS v10 (`d:\books\universal_search_engine`)
- **Database**: PostgreSQL (`knowledge_db` on port 5433) + `pgvector`
- **Embedding Model**: Nvidia NIM API (`nvidia/nv-embedqa-e5-v5`, 1024-dim, asymmetric `input_type: 'passage' | 'query'`)
- **LLM Model**: Nvidia NIM API (`openai/gpt-oss-120b`, endpoint `/chat/completions`)
- **Core Modules & Services**:
  - `DatabaseModule` / `VectorStoreService`: Entity `DocumentChunk` with `vector(1024)` column and cosine similarity `<=>` search.
  - `AiModule` / `OpenaiService`: Low-level wrapper for Nvidia NIM API embeddings and chat completions.
  - `RagService`: Ingestion chunker, batch passage embedder, vector store persistence, question query embedder, top-5 chunk retrieval, and context-augmented answer generation.
  - `SearchController` / `SearchModule`: Public REST endpoints for document ingestion and RAG querying.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | pgvector Entity Dimension Update | Update `DocumentChunk` entity vector length from 1536 to 1024 to match `nvidia/nv-embedqa-e5-v5` | M1 | Survey 2 & 3 |
| 2 | Document Chunking | Implement robust text chunking with configurable chunk size (~500 tokens / 1500 chars) and overlap | M1 | Request R1 |
| 3 | Nvidia NIM Embeddings Integration | Call Nvidia NIM embeddings API with model `nvidia/nv-embedqa-e5-v5` and mandatory `input_type` ('passage' for chunks, 'query' for search) | M1 | Request R1 |
| 4 | Vector Persistence via VectorStoreService | Save document metadata and vector chunks to `knowledge_db` using `VectorStoreService.saveDocumentWithChunks` | M1 | Request R1 |
| 5 | Semantic Top-5 Chunk Retrieval | Embed user question with `input_type: 'query'` and fetch top 5 semantically closest chunks via `VectorStoreService.similaritySearch` | M1 | Request R2 |
| 6 | Nvidia 120B Context-Augmented Generation | Construct structured prompt with retrieved context and invoke `openai/gpt-oss-120b` via Nvidia NIM chat completions | M1 | Request R2 |
| 7 | RAG DTOs & Validation | Create request and response DTOs (`RagIngestDto`, `RagQueryDto`, `RagResponseDto`) with class-validator and Swagger decorators | M2 | Request R3 |
| 8 | SearchController Endpoints | Expose `@Public()` endpoints in `SearchController` (e.g. `POST /api/v1/search/rag/ingest` and `POST /api/v1/search/rag/query`, or unified `POST /api/v1/search/rag`) | M2 | Request R3 |
| 9 | SearchModule DI & Dependency Wiring | Register `RagService` (or export from `AiModule` into `SearchModule`) ensuring clean dependency injection | M2 | Request R3 |
| 10 | Unit & Integration Testing | Add unit tests for `RagService` and `SearchController` covering ingestion, retrieval, error handling, and mock NIM calls | M3 | Testing |
| 11 | Local Server & cURL E2E Verification | Start local NestJS server, run cURL ingestion, run cURL question query, and verify 200 OK + generated answer | M3 | Acceptance Criteria |
| 12 | Multi-Agent Review & Challenger Gate | Independent review for correctness, robustness, and boundary conditions | M4 | Gate |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M0 | Survey & Architecture | Map codebase, pgvector schema, Nvidia NIM API specifications | none | DONE |
| M1 | Core RAG Service & Entities | Vector dimension fix, `RagService` (chunking, Nvidia embeddings, storage, retrieval, 120B LLM generation) | M0 | IN_PROGRESS |
| M2 | API Endpoints & Controller | DTOs, `SearchController` endpoints (`/search/rag/ingest`, `/search/rag/query`), `@Public()` decorator, `SearchModule` wiring | M1 | PLANNED |
| M3 | Testing & E2E cURL Validation | Unit tests, local server startup, cURL document ingestion, cURL question query verification | M2 | PLANNED |
| M4 | Multi-Agent Review & Gate | 2 Reviewers, 2 Challengers, and Gate verdict | M3 | PLANNED |

## Interface Contracts
### `RagService` Methods:
- `ingestDocument(dto: RagIngestDto): Promise<RagIngestResponseDto>`
  - Input: `{ title: string, content: string, sourceUrl?: string, sourceName?: string, metadata?: Record<string, any> }`
  - Output: `{ success: boolean, documentId: string, chunksCount: number, message: string }`
- `query(dto: RagQueryDto): Promise<RagQueryResponseDto>`
  - Input: `{ question: string, topK?: number, similarityThreshold?: number }`
  - Output: `{ question: string, answer: string, sources: Array<{ content: string, chunkIndex: number, similarity: number, documentTitle?: string, sourceUrl?: string }>, model: string }`

### `SearchController` Endpoints:
- `POST /api/v1/search/rag/ingest` -> calls `RagService.ingestDocument`
- `POST /api/v1/search/rag/query` -> calls `RagService.query`
- `POST /api/v1/search/rag` -> unified handler supporting both query and ingestion (or redirecting to respective handlers)

## Code Layout
- `src/database/entities/document-chunk.entity.ts`: vector column length updated to 1024.
- `src/ai/services/openai.service.ts`: helper/extension for `input_type` support in `createEmbedding`.
- `src/ai/services/rag.service.ts`: core RAG implementation.
- `src/ai/dto/rag-ingest.dto.ts` & `src/ai/dto/rag-query.dto.ts`: DTO definitions.
- `src/ai/ai.module.ts`: export `RagService`.
- `src/search/search.module.ts`: import `AiModule` / `DatabaseModule`.
- `src/search/search.controller.ts`: define RAG routes.
