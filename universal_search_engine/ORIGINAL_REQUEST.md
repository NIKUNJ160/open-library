# Original User Request

## Initial Request — 2026-08-02T00:44:15Z

Build the backend for a **Universal Open Knowledge Search Engine** — a scalable, AI-powered platform that aggregates metadata and links from 30+ trusted open-access sources (Open Library, arXiv, PubMed, Zenodo, Google Patents, etc.) into a single search API. Users can discover books, research papers, datasets, patents, government publications, and open-source repos through one query. This is a **working demo / proof-of-concept** built with **Node.js / TypeScript (NestJS)**.

Working directory: `d:\books\universal_search_engine`
Integrity mode: demo

Reference material:
- Project spec: `d:\books\ai_sections\01_project_prompt_objective.md`
- Core vision: `d:\books\ai_sections\02_core_vision.md`
- Data sources list: `d:\books\ai_sections\03_primary_data_sources.md`

## Requirements

### R1. Unified Search API with Data Source Connectors

Build a search API that accepts a query string and optional filters (category, source, date range, content type) and returns normalized results from multiple open-access sources. Implement connectors for **all** of the following source categories:

- **Books**: Open Library, Project Gutenberg, Google Books API, Internet Archive
- **Research Papers**: OpenAlex, CORE, Semantic Scholar, arXiv, PubMed, Europe PMC, DOAJ
- **Datasets**: Kaggle (metadata), Hugging Face Datasets, Data.gov, Zenodo
- **Patents**: Google Patents, USPTO, WIPO
- **Open-Source Repos**: GitHub
- **Government Publications**: NASA Technical Reports, World Bank Open Data
- **Documentation**: MDN Web Docs

Each connector should fetch metadata (title, author, description, URL, publication date, content type, source name) and normalize it into a common result schema. Connectors should handle API rate limits, timeouts, and failures gracefully — a single source failure must not break the entire search.

### R2. API Gateway, Authentication & Caching

Provide an API gateway layer with:
- RESTful API design with proper versioning (`/api/v1/...`)
- API key-based authentication for rate limiting and usage tracking
- Redis-based response caching with configurable TTL per source category
- Request validation and error handling with consistent error response format
- Health check and readiness endpoints

### R3. AI Feature Stub Endpoints

Define and expose API contracts (routes, request/response schemas) for the following AI features, **without implementing the AI logic**:
- `POST /api/v1/ai/summarize` — Summarize a document
- `POST /api/v1/ai/eli5` — Explain Like I'm Five
- `POST /api/v1/ai/cite` — Generate citations (APA, MLA, BibTeX)
- `POST /api/v1/ai/ask` — Q&A over a document
- `GET /api/v1/ai/recommendations` — Similar content recommendations

Each stub should return a well-structured mock response that matches the intended final schema, so a frontend team can integrate immediately.

### R4. Observability & Documentation

- Structured logging with correlation IDs across all requests
- OpenAPI/Swagger documentation auto-generated from route definitions
- A `README.md` with setup instructions, architecture overview, and environment variable reference

## Acceptance Criteria

### Search Functionality
- [ ] `GET /api/v1/search?q=machine+learning` returns results from at least 5 different source categories (books, papers, datasets, patents, repos)
- [ ] Each result contains: `title`, `authors`, `description`, `url`, `publishedDate`, `contentType`, `sourceName`
- [ ] Search with filters (e.g., `?q=climate&type=paper&source=arxiv`) correctly narrows results
- [ ] A failing data source connector does not cause a 500 error — partial results are returned with a `warnings` array

### API Infrastructure
- [ ] All endpoints are versioned under `/api/v1/`
- [ ] Unauthenticated requests to protected endpoints return `401` with a JSON error body
- [ ] Repeated identical search queries within the cache TTL return faster (demonstrating cache hit)
- [ ] `GET /api/v1/health` returns `200` with service status and uptime

### AI Stubs
- [ ] All 5 AI stub endpoints respond with `200` and return mock data matching the documented schema
- [ ] AI endpoint request bodies are validated — malformed input returns `400` with a descriptive error

### Observability & Docs
- [ ] Swagger UI is accessible at `/api/docs` and lists all endpoints with request/response schemas
- [ ] Application logs include a `correlationId` field that traces across service calls
- [ ] `README.md` exists with setup instructions that allow `npm install && npm start` to run the project

### Build & Run
- [ ] `npm install` completes without errors
- [ ] `npm start` starts the server on a configurable port (default `3000`)
- [ ] `npm test` runs and passes unit tests for at least the search normalization logic and 3 connectors

## Follow-up — 2026-08-22T19:16:37Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full multi-agent team

Implement Phase 4 of the Universal Open Knowledge Search Engine: a Retrieval-Augmented Generation (RAG) pipeline using NestJS, pgvector, and the Nvidia NIM API (`openai/gpt-oss-120b`). Work wisely to keep the code concise and minimize unnecessary token usage/code bloat.

Working directory: `d:\books\universal_search_engine`
Integrity mode: development

## Requirements

### R1. Vector Ingestion Pipeline
Implement a `RagService` that splits large text into chunks, generates embeddings via the Nvidia API (`nvidia/nv-embedqa-e5-v5`), and saves them to the `knowledge_db` via the existing `VectorStoreService`.

### R2. RAG Query Execution
Implement a query flow in `RagService` that generates an embedding for a user's question, retrieves the top 5 semantically similar chunks from the database, and calls the Nvidia 120B model with the context to generate an answer.

### R3. API Endpoint
Expose an endpoint (e.g., `/search/rag`) in the `SearchController` to allow users to ingest documents and ask natural language questions.

## Acceptance Criteria

### Verification via cURL
- [ ] The agent must start the local NestJS server.
- [ ] The agent must successfully execute a cURL command to ingest a sample document.
- [ ] The agent must successfully execute a cURL command to ask a question based on the ingested document.
- [ ] The query response must return a 200 OK and output the generated answer from the Nvidia API.

