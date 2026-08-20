# Project: Universal Open Knowledge Search Engine

## Architecture
- NestJS framework (TypeScript)
- Modular architecture:
  - `src/main.ts`: Entry point with Swagger setup, global validation pipe, correlation logger middleware
  - `src/common/`: Shared DTOs, correlation ID middleware, error filters, logger service
  - `src/auth/`: API key authentication guard & strategy
  - `src/cache/`: Custom Redis & in-memory fallback cache manager service
  - `src/connectors/`: Abstract connector interface & individual connectors for 7 source categories
  - `src/search/`: Search controller (`/api/v1/search`), aggregator service, query filter processor
  - `src/ai/`: AI stubs controller (`/api/v1/ai/*`), request DTOs, mock responses
  - `src/health/`: Health check controller (`/api/v1/health`)
- External dependencies: `@nestjs/common`, `@nestjs/core`, `@nestjs/swagger`, `class-validator`, `class-transformer`, `axios` or `@nestjs/axios`, `cache-manager`, `ioredis` / `cache-manager-ioredis-yet` (with in-memory fallback), `dotenv`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Scaffolding & Core Arch | Project structure, NestJS setup, Health check, Swagger | none | DONE |
| 2 | Unified Schema & 7 Category Connectors | Connector interface, 20+ connectors across 7 categories, Aggregator service, partial failure handling | M1 | DONE |
| 3 | API Gateway, Auth & Caching | API key guard, Redis/In-memory cache fallback, Category TTL, Advanced Search Filters | M1, M2 | PLANNED |
| 4 | AI Feature Stubs | 5 AI stub endpoints with schema validation & mock responses | M1 | PLANNED |
| 5 | Observability, Docs & E2E Testing | Correlation logging, README.md, unit test suite, verification | M1-M4 | PLANNED |

## Code Layout
```
d:\books\universal_search_engine\
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── dto/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   ├── middleware/
│   │   └── logger/
│   ├── auth/
│   ├── cache/
│   ├── connectors/
│   │   ├── base/
│   │   ├── books/
│   │   ├── papers/
│   │   ├── datasets/
│   │   ├── patents/
│   │   ├── repos/
│   │   ├── gov/
│   │   └── docs/
│   ├── search/
│   ├── ai/
│   └── health/
├── test/
├── package.json
├── tsconfig.json
├── nest-cli.json
├── README.md
└── ORIGINAL_REQUEST.md
```

## Interface Contracts
### Unified Search Result Schema
```typescript
export class AuthorDto {
  name: string;
  affiliation?: string;
}

export class SearchResultDto {
  id: string;
  title: string;
  authors: AuthorDto[];
  description: string;
  url: string;
  publishedDate?: string;
  contentType: 'book' | 'paper' | 'dataset' | 'patent' | 'repo' | 'gov' | 'doc';
  sourceName: string;
  score?: number;
  metadata?: Record<string, any>;
}

export class WarningDto {
  sourceName: string;
  message: string;
}

export class SearchResponseDto {
  query: string;
  total: number;
  page: number;
  limit: number;
  results: SearchResultDto[];
  warnings?: WarningDto[];
}
```
