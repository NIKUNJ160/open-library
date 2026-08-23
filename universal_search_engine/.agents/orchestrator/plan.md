# Phase 4 RAG Pipeline Orchestration Plan

## 1. Objective
Implement Phase 4 of the Universal Open Knowledge Search Engine:
- `RagService` with text splitting, Nvidia embedding generation (`nvidia/nv-embedqa-e5-v5`), vector storage via `VectorStoreService`.
- RAG Query Execution with question embedding, top 5 similarity search, context preparation, and Nvidia 120B model (`openai/gpt-oss-120b`) inference.
- API Endpoints in `SearchController` for document ingestion and natural language querying.
- Live server test with cURL and full unit/integration test coverage.

## 2. Orchestration Phases
1. **Survey (Parallel Explorers)**:
   - Explorer 1: Examine codebase structure, NestJS setup, package.json dependencies, config service, environment variables (.env, NVIDIA API keys, DB config).
   - Explorer 2: Examine existing `VectorStoreService`, database schema / pgvector setup, knowledge_db tables, existing search modules.
   - Explorer 3: Examine `SearchController`, API routing conventions, DTOs, error handling, existing test suites (jest, e2e).
2. **Architecture & Decomposition (`PROJECT.md`)**:
   - Synthesize survey reports into `PROJECT.md` with Feature Inventory, Interface Contracts, and Milestones.
3. **Implementation Track**:
   - Milestone 1: RagService Core (text chunker, Nvidia API client for embeddings & chat completions, integration with VectorStoreService).
   - Milestone 2: SearchController endpoints (`POST /api/v1/search/rag/ingest`, `POST /api/v1/search/rag/query` or equivalent REST routes) and DTOs/validation.
   - Milestone 3: Unit and Integration Test Suite for RAG pipeline.
4. **E2E & Live Verification Track**:
   - Live execution: Start NestJS server, run cURL ingestion, run cURL RAG query, verify 200 OK and accurate response from Nvidia API.
   - Run complete test suite and check for zero regressions.
5. **Gate Review & Acceptance**:
   - Objective & adversarial review via Reviewer.
   - Final report and user notification.
