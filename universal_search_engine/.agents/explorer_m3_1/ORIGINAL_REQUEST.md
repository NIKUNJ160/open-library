## 2026-08-02T01:13:39Z
<USER_REQUEST>
You are an Explorer for Milestone 3: API Gateway, Auth, & Caching System of the Universal Open Knowledge Search Engine.
Working directory: d:\books\universal_search_engine\.agents\explorer_m3_1\

Tasks:
1. Review the requirements in `d:\books\universal_search_engine\ORIGINAL_REQUEST.md` and `d:\books\universal_search_engine\.agents\orchestrator\PROJECT.md`.
2. Design `ApiKeyGuard` (`src/auth/api-key.guard.ts`) and `AuthModule` (`src/auth/auth.module.ts`):
   - Accepts API key via `x-api-key` header or `api_key` query param.
   - Validates against configured API keys (defaults to standard key like `demo-api-key-12345` or `process.env.API_KEY`).
   - Returns 401 Unauthorized with standard JSON error format (`statusCode`, `message`, `error`, `correlationId`, `timestamp`) when invalid/missing on protected routes.
   - Allows public endpoints (`/api/v1/health`, `/api/docs`) via `@Public()` decorator.
3. Design `CacheService` and `CacheModule` (`src/cache/`):
   - Supports configurable TTL per source category (`books`, `papers`, `datasets`, `patents`, `repos`, `gov`, `docs`).
   - Connects to Redis when `REDIS_HOST` is set, with automatic fallback to NestJS in-memory CacheManager when Redis is absent/unavailable.
   - Adds `x-cache` header (`HIT` or `MISS`) to cached search responses.
4. Design advanced search operators parsing in `SearchQueryDto` and `SearchAggregatorService` (`author:`, `after:`, `before:`, `year:`, `doi:`, `isbn:`, `type:`, `journal:`, `publisher:`, boolean flags `free`, `pdf`, `open_access`, `peer_reviewed`).
5. Design unit and integration tests for Auth Guard, Cache Service hit/miss behavior, and search filters (`test/auth.guard.spec.ts`, `test/cache.service.spec.ts`).
6. Write your detailed technical specification report to `d:\books\universal_search_engine\.agents\explorer_m3_1\analysis.md` and handoff report to `handoff.md`.
</USER_REQUEST>
