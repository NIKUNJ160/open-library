# PROJECT MEMORY — Universal Open Knowledge Search Engine
> **Last updated:** 2026-08-21 00:59 IST  
> **Read this FIRST** before scanning any source code.

---

## 🗂️ Workspace Root: `d:/books/`

```
d:/books/
├── universal_search_engine/     ← MAIN BACKEND (NestJS 10, Node 24, TypeScript 5)
│   ├── src/
│   │   ├── ai/                  ← AI endpoints + OpenAI + citation services
│   │   ├── auth/                ← API key guard (x-api-key header)
│   │   ├── cache/               ← Redis + in-memory fallback
│   │   ├── common/              ← Logger, filters, middleware
│   │   ├── connectors/          ← 21 existing data source connectors
│   │   ├── health/              ← GET /api/v1/health
│   │   ├── search/              ← Aggregator, DTOs, query parser
│   │   └── app.module.ts
│   ├── test/                    ← E2E connector tests
│   ├── .env                     ← PORT=3000, REDIS_HOST=localhost
│   ├── .env.example             ← Full reference (updated Aug 21)
│   ├── MEMORY.md                ← Snapshot of this file (in-repo)
│   └── README.md
├── books/
│   ├── frontend/                ← React + Vite + Tailwind (photo album)
│   │   └── index.html           ← Updated with SEO meta tags ✅
│   ├── backend/                 ← Express + SQLite (photo album API)
│   └── shared/types/library.ts  ← Shared types (Album, MediaItem)
└── ai_sections/                 ← Project spec markdown files (01–05)
```

---

## 🔌 Existing Connectors — 21 WORKING (tests: 64/64 ✅)

| # | File (under `src/connectors/`) | Source | Category | Needs Key? |
|---|---|---|---|---|
| 1 | `books/openlibrary.connector.ts` | Open Library | BOOK | No |
| 2 | `books/gutenberg.connector.ts` | Project Gutenberg | BOOK | No |
| 3 | `books/googlebooks.connector.ts` | Google Books API | BOOK | No |
| 4 | `books/internetarchive.connector.ts` | Internet Archive | BOOK | No |
| 5 | `papers/openalex.connector.ts` | OpenAlex | PAPER | No |
| 6 | `papers/core.connector.ts` | CORE | PAPER | **Yes** `CORE_API_KEY` |
| 7 | `papers/semanticscholar.connector.ts` | Semantic Scholar | PAPER | Optional |
| 8 | `papers/arxiv.connector.ts` | arXiv | PAPER | No |
| 9 | `papers/pubmed.connector.ts` | PubMed E-utilities | PAPER | No |
| 10 | `papers/europepmc.connector.ts` | Europe PMC | PAPER | No |
| 11 | `papers/doaj.connector.ts` | DOAJ | PAPER | No |
| 12 | `datasets/kaggle.connector.ts` | Kaggle | DATASET | **Yes** `KAGGLE_API_KEY` |
| 13 | `datasets/huggingface.connector.ts` | Hugging Face | DATASET | No |
| 14 | `datasets/datagov.connector.ts` | Data.gov | DATASET | No |
| 15 | `datasets/zenodo.connector.ts` | Zenodo | DATASET | No |
| 16 | `patents/googlepatents.connector.ts` | Google Patents | PATENT | No |
| 17 | `patents/uspto.connector.ts` | USPTO | PATENT | No |
| 18 | `patents/wipo.connector.ts` | WIPO | PATENT | No |
| 19 | `repos/github.connector.ts` | GitHub | REPOSITORY | Optional `GITHUB_TOKEN` |
| 20 | `gov/nasa.connector.ts` | NASA Technical Reports | GOVERNMENT | No |
| 21 | `gov/worldbank.connector.ts` | World Bank | GOVERNMENT | No |
| 22 | `docs/mdn.connector.ts` | MDN Web Docs | DOCUMENTATION | No |

---

## 🏗️ Connector Coding Pattern (MUST follow exactly)

```typescript
// src/connectors/{category}/{name}.connector.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class XyzConnector extends BaseConnector {
  readonly name = 'xyz';              // kebab-case slug, unique
  readonly displayName = 'XYZ Name';
  readonly category = ContentType.PAPER;
  readonly requiresApiKey = false;    // true → getApiKey() required

  constructor(httpService?: HttpService) { super(httpService); }

  protected getApiKey(): string | undefined {
    return process.env.XYZ_API_KEY;  // only if requiresApiKey = true
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const url = `https://api.xyz.org/search?q=${encodeURIComponent(query.q || '')}`;
    const data = await this.fetchWithTimeout<any>(url, { /* optional headers */ });
    return (data.results || []).map((item: any) => ({
      id: `xyz:${item.id}`,
      title: item.title || 'Untitled',
      authors: (item.authors || []).map((a: any) => ({ name: a.name })),
      description: item.abstract || '',
      url: item.url,
      publishedDate: item.year?.toString(),
      contentType: ContentType.PAPER,
      sourceName: this.name,
      metadata: { /* source-specific extras */ },
    }));
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    // ALWAYS 2 hardcoded realistic results (used on API failure / missing key)
    return [
      { id: 'xyz:1', title: `Mock result 1 (${query.q})`, authors: [{ name: 'Author' }],
        description: 'Mock description', url: 'https://xyz.org/1',
        publishedDate: '2024', contentType: ContentType.PAPER, sourceName: this.name,
        score: 0.9, metadata: { isMockFallback: true } },
    ];
  }
}
```

---

## 📋 Registration Rule (ALWAYS update BOTH files)

### File 1: `src/connectors/connectors.module.ts`
```typescript
// Add import + add to CONNECTORS array
import { XyzConnector } from './category/xyz.connector';
const CONNECTORS = [ ...existing..., XyzConnector ];
```

### File 2: `src/search/search-aggregator.service.ts`
```typescript
// Add import, inject in constructor, push to this.connectors[]
import { XyzConnector } from '../connectors/category/xyz.connector';
constructor(...existing, xyz: XyzConnector) {
  this.connectors = [...existing, xyz];
}
```

---

## 📐 SearchResultDto Fields

```typescript
// EXISTING fields (all connectors must set these):
id: string;           // "{sourceName}:{externalId}"
title: string;
authors: { name: string }[];
description: string;
url: string;
publishedDate?: string;
contentType: ContentType;
sourceName: string;
score?: number;
metadata?: Record<string, any>;

// NEW fields added in Phase 2 (optional):
doi?: string;
isbn?: string;
language?: string;
license?: string;
tags?: string[];
downloadUrl?: string;
repositoryUrl?: string;
updatedDate?: string;
```

---

## 🌍 Environment Variables Reference

```bash
# Core
PORT=3000
NODE_ENV=development
API_KEY=your_secure_api_key_here

# Redis (running ✅)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# External APIs
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
SEMANTIC_SCHOLAR_API_KEY=...
CORE_API_KEY=...
GITLAB_TOKEN=glpat-...         # Phase 2 new

# Phase 3+ (PostgreSQL + Vectors)
DATABASE_URL=postgresql://knowledge:secret@localhost:5432/knowledge_db
EMBEDDING_PROVIDER=ollama       # or openai
OLLAMA_HOST=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_CHAT_MODEL=mistral
```

---

## ✅ Infrastructure Status (2026-08-21)

| Tool | Status | Version |
|---|---|---|
| Node.js | ✅ Running | v24.19.0 |
| npm | ✅ Running | 11.17.0 |
| Redis | ✅ Running on :6379 | 3.0.504

### Active Connectors Registry (33 Total)

| Domain | Connectors |
|---|---|
| **Books/Literature** | OpenLibrary, Project Gutenberg, Google Books, Internet Archive, **Wikisource** |
| **Research Papers** | OpenAlex, CORE, Semantic Scholar, arXiv, PubMed, EuropePMC, DOAJ, **Crossref** |
| **Datasets** | Kaggle, Hugging Face, Data.gov, Zenodo, **Wikidata**, **Our World in Data** |
| **Code Repositories** | GitHub, **GitLab**, **Sourcegraph (Stub)** |
| **Patents** | Google Patents, USPTO, WIPO, **EPO (Stub)** |
| **Gov / Official** | NASA, World Bank |
| **Documentation** | MDN Web Docs, **Kubernetes Docs**, **Microsoft Learn**, **Python Docs**, **OpenAPI Directory** |

## Phase Tracker

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | API audits, resilience hardening, SEO fixes | ✅ Complete |
| **Phase 2** | Add 12 new API Connectors | ✅ Complete |
| **Phase 3** | Hybrid Search (PostgreSQL + pgvector) | ⏳ Pending |
| **Phase 4** | AI/RAG Pipeline (Ollama + OpenAI fallback) | ⏳ Pending |
| 5 | Collections & citation export API | ⏳ PENDING |
| 6 | BullMQ background workers | ⏳ PENDING |
| 7 | Knowledge graph | ⏳ PENDING |
| 8 | Next.js frontend dashboard | ⏳ PENDING |
| 9 | Docker Compose + Coolify deploy | ⏳ PENDING |

---

## 🧠 Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| AI provider | Ollama-first, OpenAI fallback | Local, free, open-source |
| Vector dimension | 768 | nomic-embed-text default |
| Hybrid search weights | FTS 40% + Vector 60% | Better semantic recall |
| Fusion algorithm | Reciprocal Rank Fusion (k=60) | Proven for hybrid retrieval |
| Frontend | Next.js 14 App Router | Per project spec |
| Sourcegraph + EPO | Stub implementations | Auth unavailable publicly |
| Connector failures | Always return mock results | Non-breaking per acceptance criteria |

---

## 🚨 Invariants (never break these)
1. All 64 existing tests must keep passing after every change
2. Every connector MUST implement `getMockResults()` with 2 real-looking results
3. Every new connector MUST be registered in BOTH `connectors.module.ts` AND `search-aggregator.service.ts`
4. Run `npm run build` after every connector batch — catch TS errors early
5. Update Phase Tracker in this file as phases complete
