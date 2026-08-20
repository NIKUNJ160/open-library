# Analysis & Technical Specification — Milestone 1: Project Scaffolding & Core Architecture

## Executive Summary
This document provides the complete architectural analysis, dependency specification, file layout, and code implementation blueprints for **Milestone 1 (Scaffolding & Core Architecture)** of the **Universal Open Knowledge Search Engine**.

---

## 1. Observations

### 1.1 Repository & Workspace Inspection
- **Root Directory**: `d:\books\universal_search_engine\`
- **Project Type**: Node.js / TypeScript application built on top of NestJS framework.
- **Original Requirements Document**: `d:\books\universal_search_engine\ORIGINAL_REQUEST.md`
- **Orchestrator Project Plan**: `d:\books\universal_search_engine\.agents\orchestrator\PROJECT.md`
- **Reference Material**:
  - `d:\books\ai_sections\01_project_prompt_objective.md`
  - `d:\books\ai_sections\02_core_vision.md`
  - `d:\books\ai_sections\03_primary_data_sources.md`
  - `d:\books\ai_sections\04_search_features.md`
  - `d:\books\ai_sections\05_ai_features.md`

### 1.2 Key Scaffolding Requirements (Milestone 1 Scope)
1. Set up standard NestJS TypeScript project scaffolding with `package.json`, `tsconfig.json`, and `nest-cli.json`.
2. Configure complete dependency tree in `package.json` covering standard NestJS core, Express adapter, Swagger, Validation, Axios, Redis/Caching, Dotenv, and testing frameworks.
3. Configure `src/main.ts` with:
   - Global validation pipe (`ValidationPipe` with `whitelist: true`, `transform: true`)
   - Correlation ID middleware / execution context hook
   - Global API route prefix `/api/v1`
   - OpenAPI / Swagger documentation UI at `/api/docs`
   - Configurable port defaulting to `3000` (`process.env.PORT || 3000`)
4. Implement `src/common/logger/logger.service.ts` for structured logging with correlation ID support using Node.js `AsyncLocalStorage`.
5. Implement `src/common/middleware/correlation-id.middleware.ts` to assign/propagate `x-correlation-id` request headers and store them in async local storage.
6. Implement `src/common/filters/http-exception.filter.ts` to capture all application exceptions and produce standardized JSON error responses containing correlation ID, status code, timestamp, path, and error details.
7. Implement `src/health/health.controller.ts` and `src/health/health.module.ts` exposing `GET /api/v1/health` returning HTTP 200, status `'ok'`, timestamp, and process uptime.
8. Implement root `src/app.module.ts` registering `HealthModule`, custom logger, and global correlation ID middleware.

---

## 2. Package Dependencies Analysis (`package.json`)

To support Milestone 1 through Milestone 5 without requiring dependency rewrites later, the following dependency set is specified.

### 2.1 Runtime Dependencies (`dependencies`)
| Package | Version | Purpose |
|---|---|---|
| `@nestjs/common` | `^10.3.0` | NestJS core decorators, interfaces, exceptions, pipes, middleware |
| `@nestjs/core` | `^10.3.0` | NestJS core application engine and NestFactory |
| `@nestjs/platform-express` | `^10.3.0` | Express framework adapter for NestJS |
| `@nestjs/swagger` | `^7.3.0` | OpenAPI specification generator and decorators |
| `swagger-ui-express` | `^5.0.0` | Middleware for serving Swagger UI HTML interface |
| `class-validator` | `^0.14.1` | Decorator-based validation for request DTOs |
| `class-transformer` | `^0.5.1` | Serialization and transformation between plain JS objects and DTO instances |
| `@nestjs/axios` | `^3.0.2` | NestJS wrapper module for Axios HTTP client |
| `axios` | `^1.6.8` | HTTP client for external connector API calls |
| `cache-manager` | `^5.4.0` | Caching abstraction interface for in-memory and Redis caches |
| `ioredis` | `^5.3.2` | High-performance Redis client for response caching |
| `dotenv` | `^16.4.5` | Environment variable loader from `.env` files |
| `reflect-metadata` | `^0.2.1` | Metadata reflection API for TypeScript decorators |
| `rxjs` | `^7.8.1` | Reactive Extensions library used by NestJS internals |
| `uuid` | `^9.0.1` | Generation of unique UUID v4 correlation IDs |

### 2.2 Development Dependencies (`devDependencies`)
| Package | Version | Purpose |
|---|---|---|
| `@nestjs/cli` | `^10.3.0` | NestJS CLI command line build and development runner |
| `@nestjs/schematics` | `^10.1.0` | Code generation templates for NestJS |
| `@nestjs/testing` | `^10.3.0` | NestJS test utilities and testing module builders |
| `@types/node` | `^20.11.0` | TypeScript type definitions for Node.js |
| `@types/express` | `^4.17.21` | TypeScript type definitions for Express |
| `@types/jest` | `^29.5.11` | Type definitions for Jest testing framework |
| `@types/supertest` | `^6.0.2` | Type definitions for Supertest HTTP testing |
| `@types/uuid` | `^9.0.8` | Type definitions for UUID module |
| `jest` | `^29.7.0` | Test runner framework |
| `ts-jest` | `^29.1.1` | TypeScript transformer for Jest |
| `ts-node` | `^10.9.2` | TypeScript execution environment for Node.js |
| `typescript` | `^5.3.3` | TypeScript compiler |
| `supertest` | `^6.3.4` | End-to-end HTTP assertion library |
| `rimraf` | `^5.0.5` | Cross-platform build directory cleaner |

---

## 3. Core Specification & File Specifications

### 3.1 Project Configuration Files

#### `package.json`
```json
{
  "name": "universal-open-knowledge-search-engine",
  "version": "1.0.0",
  "description": "Universal Open Knowledge Search Engine API aggregating 30+ open-access data sources",
  "author": "Universal Search Engine Team",
  "private": true,
  "license": "MIT",
  "scripts": {
    "prebuild": "rimraf dist",
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/axios": "^3.0.2",
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/swagger": "^7.3.0",
    "axios": "^1.6.8",
    "cache-manager": "^5.4.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "dotenv": "^16.4.5",
    "ioredis": "^5.3.2",
    "reflect-metadata": "^0.2.1",
    "rxjs": "^7.8.1",
    "swagger-ui-express": "^5.0.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/schematics": "^10.1.0",
    "@nestjs/testing": "^10.3.0",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",
    "@types/node": "^20.11.0",
    "@types/supertest": "^6.0.2",
    "@types/uuid": "^9.0.8",
    "jest": "^29.7.0",
    "rimraf": "^5.0.5",
    "supertest": "^6.3.4",
    "ts-jest": "^29.1.1",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  },
  "jest": {
    "moduleFileExtensions": [
      "js",
      "json",
      "ts"
    ],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": false
  }
}
```

#### `nest-cli.json`
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

---

### 3.2 Implementation Specifications for Core Modules

#### 1. `src/common/logger/logger.service.ts`
- **Purpose**: High-performance structured logger that reads request-scoped `correlationId` from Node.js `AsyncLocalStorage`.
```typescript
import { Injectable, LoggerService } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export const correlationStorage = new AsyncLocalStorage<string>();

@Injectable()
export class CustomLogger implements LoggerService {
  private format(level: string, message: any, context?: string): string {
    const timestamp = new Date().toISOString();
    const correlationId = correlationStorage.getStore() || 'N/A';
    const ctxStr = context ? `[${context}] ` : '';
    const msgStr = typeof message === 'object' ? JSON.stringify(message) : message;

    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      correlationId,
      context: context || 'Application',
      message: msgStr,
    });
  }

  log(message: any, context?: string) {
    console.log(this.format('info', message, context));
  }

  error(message: any, trace?: string, context?: string) {
    console.error(this.format('error', message, context));
    if (trace) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'ERROR_TRACE', trace }));
    }
  }

  warn(message: any, context?: string) {
    console.warn(this.format('warn', message, context));
  }

  debug(message: any, context?: string) {
    console.debug(this.format('debug', message, context));
  }

  verbose(message: any, context?: string) {
    console.log(this.format('verbose', message, context));
  }
}
```

#### 2. `src/common/middleware/correlation-id.middleware.ts`
- **Purpose**: Intercept incoming requests, extract or generate `x-correlation-id`, attach header to response, and run downstream execution context inside `correlationStorage`.
```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { correlationStorage } from '../logger/logger.service';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const headerValue = req.headers[CORRELATION_ID_HEADER] || req.headers['x-request-id'];
    const correlationId = (Array.isArray(headerValue) ? headerValue[0] : headerValue) || uuidv4();

    req.headers[CORRELATION_ID_HEADER] = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    (req as any).correlationId = correlationId;

    correlationStorage.run(correlationId, () => {
      next();
    });
  }
}
```

#### 3. `src/common/filters/http-exception.filter.ts`
- **Purpose**: Capture all exceptions (both NestJS `HttpException` and uncaught errors), output structured log with correlation ID, and send unified JSON response.
```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomLogger, correlationStorage } from '../logger/logger.service';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: CustomLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const correlationId =
      correlationStorage.getStore() ||
      (request.headers[CORRELATION_ID_HEADER] as string) ||
      'N/A';

    let message: any = 'Internal server error';
    let errors: any = undefined;

    if (exception instanceof HttpException) {
      const resObj = exception.getResponse();
      if (typeof resObj === 'string') {
        message = resObj;
      } else if (typeof resObj === 'object' && resObj !== null) {
        message = (resObj as any).message || exception.message;
        if (Array.isArray((resObj as any).message)) {
          errors = (resObj as any).message;
          message = 'Validation failed';
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      correlationId,
      message,
      ...(errors ? { errors } : {}),
    };

    this.logger.error(
      `HTTP ${status} [${request.method} ${request.url}] - ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : undefined,
      'HttpExceptionFilter',
    );

    response.status(status).json(errorResponse);
  }
}
```

#### 4. `src/health/health.controller.ts`
- **Purpose**: Health monitoring endpoint exposing status, uptime, environment, and current server timestamp.
```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

export class HealthResponseDto {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy and operating normally',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-08-02T00:46:19.000Z' },
        uptime: { type: 'number', example: 12.345 },
        environment: { type: 'string', example: 'development' },
        version: { type: 'string', example: '1.0.0' },
      },
    },
  })
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    };
  }
}
```

#### 5. `src/health/health.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

#### 6. `src/app.module.ts`
```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { CustomLogger } from './common/logger/logger.service';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [HealthModule],
  controllers: [],
  providers: [CustomLogger],
  exports: [CustomLogger],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
```

#### 7. `src/main.ts`
```typescript
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CustomLogger } from './common/logger/logger.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(CustomLogger);
  app.useLogger(logger);

  // Global API Prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['api/docs'],
  });

  // Enable CORS
  app.enableCors();

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  // Swagger OpenAPI Documentation Configuration
  const config = new DocumentBuilder()
    .setTitle('Universal Open Knowledge Search Engine API')
    .setDescription(
      'Aggregated open-access search engine across 30+ sources covering books, papers, datasets, patents, open-source repos, government publications, and documentation.',
    )
    .setVersion('1.0.0')
    .addApiKey(
      { type: 'apiKey', name: 'x-api-key', in: 'header' },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Server running on port ${port}`, 'Bootstrap');
  logger.log(`Swagger UI documentation available at http://localhost:${port}/api/docs`, 'Bootstrap');
  logger.log(`Health check available at http://localhost:${port}/api/v1/health`, 'Bootstrap');
}

bootstrap();
```

---

## 4. Logic Chain

1. **Requirement Mapping**:
   - `ORIGINAL_REQUEST.md` and `PROJECT.md` mandate a NestJS framework architecture with modular folders (`common/`, `health/`, etc.), Swagger documentation at `/api/docs`, request correlation tracing, global exception handling, and health check route `GET /api/v1/health`.
2. **Dependency Selection**:
   - Standard `@nestjs/*` v10 packages provide decorators, HTTP adapters, Swagger UI generator, and testing utilities.
   - `class-validator` + `class-transformer` enable input validation via global `ValidationPipe`.
   - `@nestjs/axios` + `axios` fulfill external connector requirements for M2.
   - `ioredis` + `cache-manager` prepare the caching layer for M3.
   - `uuid` + `async_hooks` AsyncLocalStorage enable context-aware correlation ID propagation across all async spans and logs without manual argument passing.
3. **Execution Routing**:
   - `CorrelationIdMiddleware` executes first for every route, setting request & response `x-correlation-id` headers and establishing `correlationStorage`.
   - `CustomLogger` pulls correlation ID dynamically from `correlationStorage`, logging JSON-formatted lines with timestamp, log level, correlation ID, context, and message.
   - `HttpExceptionFilter` catches all runtime errors, formats standard JSON responses, and logs errors with stack traces.
   - `HealthController` provides `/api/v1/health` returning 200 OK with `status`, `timestamp`, `uptime`, `environment`, and `version`.
   - `main.ts` ties everything together: setting global prefix `api/v1`, registering Swagger at `/api/docs`, binding global validation pipes and filters, and binding to port `3000`.

---

## 5. Caveats

- **Caveat 1 (Redis availability)**: Redis dependencies (`ioredis`, `cache-manager`) are included in `package.json` for M3 cache support. In M1, Redis server connection is optional; health check does not depend on Redis.
- **Caveat 2 (Swagger path exclusion)**: Global prefix is set to `api/v1` with `exclude: ['api/docs']`. This ensures Swagger is served directly at `/api/docs` while API routes are versioned under `/api/v1/*`.
- **Caveat 3 (Read-only execution)**: The Explorer agent does not write implementation files into `src/` directly, but provides exact code specifications so Implementer `implementer_m1_1` can apply them cleanly.

---

## 6. Conclusion

The NestJS backend architecture for Milestone 1 is completely designed and specified. All required dependencies, configurations, and core application files (`package.json`, `tsconfig.json`, `nest-cli.json`, `main.ts`, `app.module.ts`, `correlation-id.middleware.ts`, `http-exception.filter.ts`, `logger.service.ts`, `health.controller.ts`, `health.module.ts`) have been fully specified with ready-to-write code listings.

---

## 7. Verification Method

Once `implementer_m1_1` generates the code, verification must be executed as follows:

1. **Dependency Installation**:
   ```bash
   npm install
   ```
   *Expected result*: Resolves dependencies and completes with exit code 0.

2. **TypeScript Compilation / Build**:
   ```bash
   npm run build
   ```
   *Expected result*: Compiles TypeScript to `dist/` without compilation errors.

3. **Start Application**:
   ```bash
   npm start
   ```
   *Expected result*: Server listens on `http://localhost:3000`.

4. **Verify Health Endpoint**:
   ```bash
   curl -i http://localhost:3000/api/v1/health
   ```
   *Expected result*: Returns HTTP 200 OK with JSON:
   `{"status":"ok","timestamp":"...","uptime":...,"environment":"development","version":"1.0.0"}` and response header `x-correlation-id`.

5. **Verify Correlation ID Propagation**:
   ```bash
   curl -i -H "x-correlation-id: test-corr-999" http://localhost:3000/api/v1/health
   ```
   *Expected result*: Response contains `x-correlation-id: test-corr-999`, and server log contains `"correlationId":"test-corr-999"`.

6. **Verify Swagger UI**:
   ```bash
   curl -i http://localhost:3000/api/docs
   ```
   *Expected result*: Returns HTTP 200 OK serving Swagger HTML content.

7. **Verify Global Exception Filter**:
   ```bash
   curl -i http://localhost:3000/api/v1/unknown-route
   ```
   *Expected result*: Returns HTTP 404 with JSON containing `statusCode`, `timestamp`, `path`, `method`, `correlationId`, and `message`.
