# Project Execution Plan — Universal Open Knowledge Search Engine

## Overview
Build a NestJS backend REST API for a Universal Open Knowledge Search Engine that aggregates metadata and links from open-access sources across 7 categories into a unified result schema.

## Milestones

### Milestone 1: Project Scaffolding & Core Architecture
- NestJS application setup (`package.json`, `tsconfig.json`, `nest-cli.json`, main entry point)
- Module structure: `SearchModule`, `ConnectorsModule`, `AuthModule`, `CacheModule`, `AiModule`, `CommonModule`
- Request validation pipes, global error filter, correlation ID middleware/interceptor
- Swagger OpenAPI setup at `/api/docs`
- Health check controller (`GET /api/v1/health`)
- Verification: `npm install` and basic app startup.

### Milestone 2: Unified Schema & Category Connectors (7 Categories)
- Unified search result schema definition (`SearchResultDto`, `AuthorDto`, `SearchQueryDto`, `SearchResponseDto`, `WarningDto`)
- Category Connectors implementation:
  1. Books: Open Library, Project Gutenberg, Google Books API, Internet Archive
  2. Research Papers: OpenAlex, CORE, Semantic Scholar, arXiv, PubMed, Europe PMC, DOAJ
  3. Datasets: Kaggle (metadata), Hugging Face Datasets, Data.gov, Zenodo
  4. Patents: Google Patents, USPTO, WIPO
  5. Open-Source Repos: GitHub
  6. Government Publications: NASA Technical Reports, World Bank Open Data
  7. Documentation: MDN Web Docs
- Search aggregator engine: Parallel query execution, rate limit & timeout handling, fault tolerance (returns partial results + `warnings` array on individual source errors).
- Verification: Unit tests for connector normalization & aggregator error handling.

### Milestone 3: API Gateway, Auth, & Caching System
- API Key Guard (`x-api-key` header / query param verification)
- Redis Cache Module with TTL per source category & automatic fallback to NestJS in-memory CacheManager
- Advanced search filter support (`type`, `source`, `after`, `before`, `author`, date range, pagination)
- Verification: Auth 401 response testing, cache hit timing tests, filter accuracy.

### Milestone 4: AI Feature Stub Endpoints
- AI Controller & DTO definitions for 5 stub endpoints:
  1. `POST /api/v1/ai/summarize`
  2. `POST /api/v1/ai/eli5`
  3. `POST /api/v1/ai/cite`
  4. `POST /api/v1/ai/ask`
  5. `GET /api/v1/ai/recommendations`
- Request DTO validation (returns 400 on malformed input)
- Schema-compliant mock responses.
- Verification: Request validation & response schema unit tests.

### Milestone 5: Observability, Documentation & End-to-End Verification
- Structured JSON logging with `correlationId` tracking across HTTP context & connector requests.
- Comprehensive `README.md` with architecture, setup instructions, environment variables, API examples.
- Comprehensive Unit & Integration test suite (`npm test`).
- Full End-to-End verification against all user acceptance criteria.
