# Milestone 3 Technical Specification & Architectural Design Report
**Universal Open Knowledge Search Engine API**
**Agent**: explorer_m3_1
**Date**: 2026-08-02

---

## Executive Summary

Milestone 3 establishes the **API Gateway, Authentication, Caching, and Advanced Query Parsing System** for the Universal Open Knowledge Search Engine API.

This specification details the technical design, data structures, interfaces, and test plans for:
1. **API Key Authentication Guard (`ApiKeyGuard`) & `AuthModule`**: Header & query parameter API key validation with standard 401 JSON error responses, `@Public()` route bypass, and global guard integration.
2. **Resilient Dual-Store Caching System (`CacheService`, `CacheModule`, `CacheInterceptor`)**: Redis primary connection with zero-downtime automatic fallback to NestJS in-memory CacheManager, category-specific TTL configuration, and `x-cache` response headers (`HIT` vs `MISS`).
3. **Advanced Search Operators Parser & Filter Engine**: Structured operator extraction from query strings (`author:`, `after:`, `before:`, `year:`, `doi:`, `isbn:`, `type:`, `journal:`, `publisher:`, `free`, `pdf`, `open_access`, `peer_reviewed`) integrated with `SearchQueryDto` and `SearchAggregatorService`.
4. **Comprehensive Test Suite**: Unit and integration test specifications for Auth Guard (`test/auth.guard.spec.ts`), Cache Service & Interceptor (`test/cache.service.spec.ts`), and Advanced Search Filters.

---

## 1. Authentication System Architecture (`src/auth/`)

### 1.1 Requirements & Objectives
- Authenticate API calls via `x-api-key` HTTP header OR `api_key` / `apiKey` URL query parameter.
- Support configurable API keys via `process.env.API_KEY` (comma-separated list of valid keys) with fallback to standard key `demo-api-key-12345`.
- Provide `@Public()` decorator to bypass authentication on public endpoints (e.g. `/api/v1/health`, `/api/docs`).
- Return standard JSON error payload on 401 Unauthorized:
  ```json
  {
    "statusCode": 401,
    "timestamp": "2026-08-02T01:15:00.000Z",
    "path": "/api/v1/search",
    "method": "GET",
    "correlationId": "c613e5bc-8a4d-4b71-9f93-01825fa77610",
    "message": "Invalid or missing API key",
    "error": "Unauthorized"
  }
  ```

### 1.2 Component Specifications

#### A. `@Public()` Decorator (`src/auth/decorators/public.decorator.ts`)
```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

#### B. API Key Guard (`src/auth/api-key.guard.ts`)
```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Check if route or controller is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // 2. Extract API Key from header or query param
    const headerKey =
      request.headers['x-api-key'] || request.headers['X-API-KEY'];
    const queryKey = request.query['api_key'] || request.query['apiKey'];

    const apiKey =
      (Array.isArray(headerKey) ? headerKey[0] : headerKey) ||
      (Array.isArray(queryKey) ? queryKey[0] : queryKey);

    // 3. Resolve configured valid API keys
    const configuredKeys = process.env.API_KEY || process.env.API_KEYS || 'demo-api-key-12345';
    const validKeys = configuredKeys
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean);

    // 4. Validate key presence & correctness
    if (!apiKey || typeof apiKey !== 'string' || !validKeys.includes(apiKey)) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}
```

#### C. Exception Filter Enhancement (`src/common/filters/http-exception.filter.ts`)
Ensure `HttpExceptionFilter` formats `UnauthorizedException` to include `error: 'Unauthorized'`:
```typescript
const errorResponse = {
  statusCode: status,
  timestamp: new Date().toISOString(),
  path: request.url,
  method: request.method,
  correlationId,
  message,
  error: status === 401 ? 'Unauthorized' : (status === 400 ? 'Bad Request' : undefined),
  ...(errors ? { errors } : {}),
};
```

#### D. Auth Module (`src/auth/auth.module.ts`)
```typescript
import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  providers: [
    Reflector,
    ApiKeyGuard,
  ],
  exports: [ApiKeyGuard],
})
export class AuthModule {}
```

#### E. Global Guard Binding in `AppModule` (`src/app.module.ts`)
```typescript
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './auth/api-key.guard';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AuthModule, HealthModule, ConnectorsModule, SearchModule, CacheModule],
  providers: [
    CustomLogger,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule ...
```

---

## 2. Caching System Architecture (`src/cache/`)

### 2.1 Requirements & Objectives
- Dual-store architecture: Redis primary connection when `REDIS_HOST` environment variable is defined, with seamless, silent in-memory `cache-manager` fallback if Redis is omitted, unavailable, or encounters connection errors.
- Category-specific TTL configuration:
  - `books`: 86,400s (24h)
  - `papers`: 43,200s (12h)
  - `datasets`: 21,600s (6h)
  - `patents`: 86,400s (24h)
  - `repos`: 3,600s (1h)
  - `gov`: 43,200s (12h)
  - `docs`: 86,400s (24h)
  - `default`: 3,600s (1h)
- Inject `x-cache` HTTP response header (`HIT` or `MISS`) on cached search endpoints via `CacheInterceptor`.

### 2.2 Component Specifications

#### A. Category TTL Configuration (`src/cache/cache-ttl.config.ts`)
```typescript
export const CATEGORY_TTL_SECONDS: Record<string, number> = {
  books: parseInt(process.env.CACHE_TTL_BOOKS || '86400', 10),
  papers: parseInt(process.env.CACHE_TTL_PAPERS || '43200', 10),
  datasets: parseInt(process.env.CACHE_TTL_DATASETS || '21600', 10),
  patents: parseInt(process.env.CACHE_TTL_PATENTS || '86400', 10),
  repos: parseInt(process.env.CACHE_TTL_REPOS || '3600', 10),
  gov: parseInt(process.env.CACHE_TTL_GOV || '43200', 10),
  docs: parseInt(process.env.CACHE_TTL_DOCS || '86400', 10),
  default: parseInt(process.env.CACHE_TTL_DEFAULT || '3600', 10),
};

export function getTtlForCategory(category?: string): number {
  if (!category) return CATEGORY_TTL_SECONDS.default;
  const key = category.toLowerCase();
  return CATEGORY_TTL_SECONDS[key] || CATEGORY_TTL_SECONDS.default;
}
```

#### B. Resilient Cache Service (`src/cache/cache.service.ts`)
```typescript
import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import Redis from 'ioredis';
import { getTtlForCategory } from './cache-ttl.config';

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: Redis | null = null;
  private isRedisActive = false;

  constructor(@Inject(CACHE_MANAGER) private readonly memoryCache: Cache) {}

  async onModuleInit() {
    const redisHost = process.env.REDIS_HOST;
    if (redisHost) {
      try {
        const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
        this.redisClient = new Redis({
          host: redisHost,
          port: redisPort,
          password: process.env.REDIS_PASSWORD || undefined,
          lazyConnect: true,
          connectTimeout: 2000,
          maxRetriesPerRequest: 1,
        });

        this.redisClient.on('connect', () => {
          this.logger.log(`Connected to Redis at ${redisHost}:${redisPort}`);
          this.isRedisActive = true;
        });

        this.redisClient.on('error', (err) => {
          this.logger.warn(`Redis connection error (${err.message}). Falling back to in-memory cache.`);
          this.isRedisActive = false;
        });

        await this.redisClient.connect();
      } catch (err: any) {
        this.logger.warn(`Failed to initialize Redis client (${err.message}). Using in-memory cache fallback.`);
        this.isRedisActive = false;
      }
    } else {
      this.logger.log('REDIS_HOST not set. Utilizing in-memory CacheManager.');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisActive && this.redisClient) {
      try {
        const data = await this.redisClient.get(key);
        if (data) return JSON.parse(data);
      } catch (err: any) {
        this.logger.warn(`Redis GET failed for key "${key}": ${err.message}. Fallback to memory.`);
      }
    }

    try {
      const memoryValue = await this.memoryCache.get<T>(key);
      return memoryValue ?? null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? getTtlForCategory();

    if (this.isRedisActive && this.redisClient) {
      try {
        await this.redisClient.set(key, JSON.stringify(value), 'EX', ttl);
      } catch (err: any) {
        this.logger.warn(`Redis SET failed for key "${key}": ${err.message}. Writing to memory fallback.`);
      }
    }

    try {
      // cache-manager v5 takes milliseconds or seconds based on store configuration
      await this.memoryCache.set(key, value, ttl * 1000);
    } catch (err: any) {
      this.logger.error(`Memory cache SET failed for key "${key}": ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (this.isRedisActive && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch {}
    }
    try {
      await this.memoryCache.del(key);
    } catch {}
  }

  getCategoryTtl(category?: string): number {
    return getTtlForCategory(category);
  }
}
```

#### C. Cache Interceptor & `x-cache` Header (`src/cache/cache.interceptor.ts`)
```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { CacheService } from './cache.service';

@Injectable()
export class SearchCacheInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();

    // Only cache GET requests
    if (req.method !== 'GET') {
      return next.handle();
    }

    // Build deterministic cache key from sorted query params
    const sortedQueryParams = Object.keys(req.query || {})
      .sort()
      .map((k) => `${k}=${encodeURIComponent(String(req.query[k]))}`)
      .join('&');

    const cacheKey = `search_cache:${req.path}?${sortedQueryParams}`;
    const category = (req.query.category as string) || (req.query.type as string);

    const cachedData = await this.cacheService.get(cacheKey);

    if (cachedData) {
      res.setHeader('x-cache', 'HIT');
      return of(cachedData);
    }

    res.setHeader('x-cache', 'MISS');

    const ttl = this.cacheService.getCategoryTtl(category);

    return next.handle().pipe(
      tap(async (responseBody) => {
        if (responseBody) {
          await this.cacheService.set(cacheKey, responseBody, ttl);
        }
      }),
    );
  }
}
```

#### D. Cache Module (`src/cache/cache.module.ts`)
```typescript
import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { SearchCacheInterceptor } from './cache.interceptor';

@Module({
  imports: [
    NestCacheModule.register({
      ttl: 3600 * 1000,
      max: 1000,
    }),
  ],
  providers: [CacheService, SearchCacheInterceptor],
  exports: [CacheService, SearchCacheInterceptor],
})
export class CacheModule {}
```

---

## 3. Advanced Search Operators Engine Design

### 3.1 Operator Grammar & Syntax Table

| Operator Key | Type | Description / Example | Field Mapping |
|--------------|------|-----------------------|---------------|
| `author:` | string | `author:"Einstein"` or `author:einstein` | Matches `authors.name` |
| `after:` | string | `after:2020-01-01` or `after:2020` | Filter `publishedDate >= after` |
| `before:` | string | `before:2024-12-31` or `before:2024` | Filter `publishedDate <= before` |
| `year:` | number | `year:2021` | Filter year portion of `publishedDate` |
| `doi:` | string | `doi:10.1038/s41586-020-2649-2` | Filter `metadata.doi` or `id` |
| `isbn:` | string | `isbn:9780131103627` | Filter `metadata.isbn` or `id` |
| `type:` | string | `type:paper`, `type:book` | Filter `contentType` |
| `journal:` | string | `journal:"Nature"` | Filter `metadata.journal` |
| `publisher:`| string | `publisher:"O'Reilly"` | Filter `metadata.publisher` |
| `free` / `free:true` | boolean | `free:true` | Filter `metadata.isFree !== false` |
| `pdf` / `pdf:true` | boolean | `pdf:true` | Filter `metadata.hasPdf === true` or `.pdf` URL |
| `open_access` / `open_access:true` | boolean | `open_access:true` | Filter `metadata.isOpenAccess === true` |
| `peer_reviewed` / `peer_reviewed:true` | boolean | `peer_reviewed:true` | Filter `metadata.isPeerReviewed === true` |

### 3.2 `SearchQueryDto` Extension (`src/search/dto/search-query.dto.ts`)
Add optional fields for explicit URL query parameters matching the inline operators:
```typescript
  @ApiPropertyOptional({ description: 'Filter by DOI' })
  @IsString()
  @IsOptional()
  doi?: string;

  @ApiPropertyOptional({ description: 'Filter by ISBN' })
  @IsString()
  @IsOptional()
  isbn?: string;

  @ApiPropertyOptional({ description: 'Filter by publication year' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ description: 'Filter by journal name' })
  @IsString()
  @IsOptional()
  journal?: string;

  @ApiPropertyOptional({ description: 'Filter by publisher name' })
  @IsString()
  @IsOptional()
  publisher?: string;

  @ApiPropertyOptional({ description: 'Filter for free items' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  free?: boolean;

  @ApiPropertyOptional({ description: 'Filter for items with PDF link' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  pdf?: boolean;

  @ApiPropertyOptional({ description: 'Filter for Open Access publications' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  open_access?: boolean;

  @ApiPropertyOptional({ description: 'Filter for peer-reviewed items' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  peer_reviewed?: boolean;
```

### 3.3 Query Parser Utility Specification (`src/search/utils/query-parser.util.ts`)
```typescript
export interface ParsedAdvancedQuery {
  cleanQuery: string;
  author?: string;
  after?: string;
  before?: string;
  year?: number;
  doi?: string;
  isbn?: string;
  type?: string;
  journal?: string;
  publisher?: string;
  free?: boolean;
  pdf?: boolean;
  open_access?: boolean;
  peer_reviewed?: boolean;
}

export function parseAdvancedQuery(rawQuery: string): ParsedAdvancedQuery {
  if (!rawQuery) {
    return { cleanQuery: '' };
  }

  let cleanQuery = rawQuery;
  const result: ParsedAdvancedQuery = { cleanQuery: '' };

  // Match key:"quoted value" or key:value
  const kvRegex = /(?:(author|after|before|year|doi|isbn|type|journal|publisher|free|pdf|open_access|peer_reviewed):(?:"([^"]+)"|(\S+)))/gi;

  let match;
  while ((match = kvRegex.exec(rawQuery)) !== null) {
    const key = match[1].toLowerCase();
    const val = match[2] || match[3];

    cleanQuery = cleanQuery.replace(match[0], '');

    if (key === 'author') result.author = val;
    else if (key === 'after') result.after = val;
    else if (key === 'before') result.before = val;
    else if (key === 'year') result.year = parseInt(val, 10);
    else if (key === 'doi') result.doi = val;
    else if (key === 'isbn') result.isbn = val;
    else if (key === 'type') result.type = val;
    else if (key === 'journal') result.journal = val;
    else if (key === 'publisher') result.publisher = val;
    else if (key === 'free') result.free = val.toLowerCase() === 'true';
    else if (key === 'pdf') result.pdf = val.toLowerCase() === 'true';
    else if (key === 'open_access') result.open_access = val.toLowerCase() === 'true';
    else if (key === 'peer_reviewed') result.peer_reviewed = val.toLowerCase() === 'true';
  }

  // Handle standalone boolean flag tokens e.g. "free", "pdf", "open_access", "peer_reviewed"
  const standaloneTokens = ['free', 'pdf', 'open_access', 'peer_reviewed'];
  standaloneTokens.forEach((token) => {
    const wordRegex = new RegExp(`\\b${token}\\b`, 'gi');
    if (wordRegex.test(cleanQuery)) {
      cleanQuery = cleanQuery.replace(wordRegex, '');
      (result as any)[token] = true;
    }
  });

  result.cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();
  return result;
}
```

### 3.4 Filtering Pipeline in `SearchAggregatorService`
```typescript
// Merge DTO parameters and parsed query string operators
const parsed = parseAdvancedQuery(query.q || '');
const effectiveQuery = parsed.cleanQuery || query.q || '';
const authorFilter = query.author || parsed.author;
const afterFilter = query.after || query.dateFrom || parsed.after;
const beforeFilter = query.before || query.dateTo || parsed.before;
const yearFilter = query.year || parsed.year;
const doiFilter = query.doi || parsed.doi;
const isbnFilter = query.isbn || parsed.isbn;
const journalFilter = query.journal || parsed.journal;
const publisherFilter = query.publisher || parsed.publisher;
const freeFilter = query.free !== undefined ? query.free : parsed.free;
const pdfFilter = query.pdf !== undefined ? query.pdf : parsed.pdf;
const openAccessFilter = query.open_access !== undefined ? query.open_access : parsed.open_access;
const peerReviewedFilter = query.peer_reviewed !== undefined ? query.peer_reviewed : parsed.peer_reviewed;

// In-Memory Filter Execution:
let filteredResults = allResults;

if (authorFilter) {
  const low = authorFilter.toLowerCase();
  filteredResults = filteredResults.filter((r) =>
    r.authors?.some((a) => a.name.toLowerCase().includes(low)),
  );
}

if (yearFilter) {
  filteredResults = filteredResults.filter((r) => {
    if (!r.publishedDate) return true;
    return r.publishedDate.startsWith(String(yearFilter));
  });
}

if (doiFilter) {
  const low = doiFilter.toLowerCase();
  filteredResults = filteredResults.filter(
    (r) => r.metadata?.doi?.toLowerCase().includes(low) || r.id.toLowerCase().includes(low),
  );
}

if (isbnFilter) {
  const cleanIsbn = isbnFilter.replace(/[- ]/g, '').toLowerCase();
  filteredResults = filteredResults.filter(
    (r) => r.metadata?.isbn?.replace(/[- ]/g, '').toLowerCase().includes(cleanIsbn) || r.id.includes(cleanIsbn),
  );
}

if (freeFilter) {
  filteredResults = filteredResults.filter((r) => r.metadata?.isFree !== false);
}

if (pdfFilter) {
  filteredResults = filteredResults.filter(
    (r) => r.metadata?.hasPdf === true || r.url.toLowerCase().endsWith('.pdf'),
  );
}

if (openAccessFilter) {
  filteredResults = filteredResults.filter((r) => r.metadata?.isOpenAccess === true);
}

if (peerReviewedFilter) {
  filteredResults = filteredResults.filter((r) => r.metadata?.isPeerReviewed === true);
}
```

---

## 4. Test Suite Architecture & Test Specifications

### 4.1 `test/auth.guard.spec.ts`
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from '../src/auth/api-key.guard';
import { IS_PUBLIC_KEY } from '../src/auth/decorators/public.decorator';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  function createMockContext(headers: Record<string, any> = {}, query: Record<string, any> = {}): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          query,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access if route is marked with @Public()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const ctx = createMockContext();
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access with valid x-api-key header', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = createMockContext({ 'x-api-key': 'demo-api-key-12345' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access with valid api_key query parameter', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = createMockContext({}, { api_key: 'demo-api-key-12345' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw UnauthorizedException when API key is missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = createMockContext({}, {});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when API key is invalid', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = createMockContext({ 'x-api-key': 'wrong-key' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
```

### 4.2 `test/cache.service.spec.ts`
```typescript
import { Test, TestingModule } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from '../src/cache/cache.service';
import { SearchCacheInterceptor } from '../src/cache/cache.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('CacheService & CacheInterceptor', () => {
  let cacheService: CacheService;
  let mockMemoryCache: any;

  beforeEach(async () => {
    mockMemoryCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        SearchCacheInterceptor,
        {
          provide: CACHE_MANAGER,
          useValue: mockMemoryCache,
        },
      ],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
  });

  it('should set and get values from memory fallback', async () => {
    mockMemoryCache.get.mockResolvedValue({ query: 'test', results: [] });
    await cacheService.set('test_key', { query: 'test', results: [] }, 60);
    const result = await cacheService.get('test_key');

    expect(result).toEqual({ query: 'test', results: [] });
    expect(mockMemoryCache.get).toHaveBeenCalledWith('test_key');
  });

  it('should return correct TTL for source categories', () => {
    expect(cacheService.getCategoryTtl('books')).toBe(86400);
    expect(cacheService.getCategoryTtl('papers')).toBe(43200);
    expect(cacheService.getCategoryTtl('datasets')).toBe(21600);
    expect(cacheService.getCategoryTtl('repos')).toBe(3600);
    expect(cacheService.getCategoryTtl('unknown')).toBe(3600);
  });

  it('should set x-cache to MISS on cache miss and store result', async () => {
    const interceptor = new SearchCacheInterceptor(cacheService);
    mockMemoryCache.get.mockResolvedValue(null);

    const setHeaderMock = jest.fn();
    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', path: '/api/v1/search', query: { q: 'ai' } }),
        getResponse: () => ({ setHeader: setHeaderMock }),
      }),
    } as unknown as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => of({ query: 'ai', total: 1, results: [] }),
    };

    const observable = await interceptor.intercept(mockCtx, mockHandler);
    await new Promise((resolve) => observable.subscribe(resolve));

    expect(setHeaderMock).toHaveBeenCalledWith('x-cache', 'MISS');
  });
});
```

---

## 5. Verification Plan

| Component | Target File | Verification Method | Expected Outcome |
|-----------|-------------|---------------------|------------------|
| Auth Guard | `test/auth.guard.spec.ts` | `npx jest test/auth.guard.spec.ts` | All unit tests pass with 100% assertion coverage |
| Cache System | `test/cache.service.spec.ts` | `npx jest test/cache.service.spec.ts` | Memory fallback & HIT/MISS headers verified |
| Advanced Operators | `test/search-aggregator.service.spec.ts` | `npx jest test/search-aggregator.service.spec.ts` | Filter parsing & result filtering verified |
| Full Build | Root project | `npm run build` | Zero TypeScript compilation errors |

---
