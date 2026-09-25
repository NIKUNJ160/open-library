# Open Library Knowledge Engine – Project Memory & Chat History

This file maintains persistent memory across all conversations, architectural decisions, completed milestones, commands executed, and active next steps.

---

## 1. Project Overview & Architecture

- **Project Name**: Open Library Knowledge Engine
- **GitHub Repository**: [https://github.com/NIKUNJ160/open-library](https://github.com/NIKUNJ160/open-library)
- **Primary Goal**: An integrated hybrid search (sparse BM25 + dense vector) and citation-grounded RAG engine over public knowledge domains (Open Library, Wikipedia/Wikidata, OpenAlex, Crossref, Europe PMC, PubMed).
- **Core Stack**:
  - **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 (async), pgvector, FastEmbed (`BAAI/bge-small-en-v1.5`), Alembic, `uv` package manager.
  - **Database**: PostgreSQL 16 with `pgvector` & `pg_trgm`, Redis 7 for caching.
  - **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons.
  - **Containerization**: Docker Compose (`db`, `redis`, `backend`, `frontend`).

---

## 2. Chronological Chat & Execution Log

### Session 1: Deep Research & Architectural Analysis
- **User Action**: Provided `deep-research-report.md`.
- **System Analysis**:
  - Evaluated public sources: Open Library (books JSON dumps), Wikipedia/Wikidata (dumps + APIs), OpenAlex (scholarly graph REST), Crossref (DOI registry), Europe PMC & PubMed (biomedical papers), and arXiv (preprints, link-only compliance).
  - Defined canonical schema: `knowledge_documents`, `document_chunks`, `entities`, `document_entities`.
  - Analyzed storage trade-offs: selected PostgreSQL + `pgvector` for Phase 1 MVP to minimize operational overhead and support native hybrid search.

### Session 2: Phased Planning & Implementation Plan
- **User Request**: `discribe and /plan Roadmap & Phases`.
- **Delivered**:
  - Generated technical implementation plan artifact: [`implementation_plan.md`](file:///C:/Users/nikun/.gemini/antigravity/brain/5272d126-2c98-451a-bf85-d15d6a6238f8/implementation_plan.md).
  - Defined the 6-phase roadmap:
    - **Phase 0**: Project foundation, environment, docker setup, backend & frontend scaffolding.
    - **Phase 1**: MVP Core Ingestion (Open Library & Wikipedia) & Hybrid Search.
    - **Phase 2**: Scholarly Corpus & Metadata Enrichment (OpenAlex, Crossref, Europe PMC).
    - **Phase 3**: Dense Vector Optimization & Neural Reranking.
    - **Phase 4**: Conversational RAG with Citation-Grounded Streaming.
    - **Phase 5**: Knowledge Graph Integration & Entity Resolution.
    - **Phase 6**: Production Hardening, Scaling & Ops.

### Session 3: Phase 0 Foundation & Verification
- **User Request**: `ok start phase 0`.
- **Actions Executed**:
  1. **Git Initialization**:
     - Initialized local repository on branch `main`.
     - Created comprehensive `.gitignore` for Python, Node, and environment files.
  2. **Environment & Container Infrastructure**:
     - Created `.env.example` and local development `.env`.
     - Created `docker-compose.yml` with PostgreSQL 16 (`pgvector/pgvector:pg16`), Redis 7, backend, and frontend services.
     - Added `backend/initdb/01_init.sql` to auto-enable `vector` and `pg_trgm` extensions.
  3. **Backend Scaffolding (`backend/`)**:
     - Created `pyproject.toml` managed by `uv` with 61 dependencies.
     - Built virtual environment `.venv` targeting Python 3.12.13.
     - Implemented SQLAlchemy async models in `app/models/document.py` and `app/models/entity.py`.
     - Configured Alembic migration `001_initial_schema.py` with GIN FTS index and HNSW vector index.
     - Built FastAPI endpoints: `GET /api/v1/health`, `GET /api/v1/search`, `GET /api/v1/documents/{id}`.
     - Ran `pytest` suite: passed 2/2 tests in 16.14s.
  4. **Frontend Scaffolding (`frontend/`)**:
     - Configured Next.js 14 App Router with Tailwind CSS and Lucide React.
     - Built components: `Header.tsx`, `SearchBar.tsx`, `SearchResultCard.tsx`, `LicenseBadge.tsx`.
     - Built pages: Home (`/`), Faceted Search (`/search`), Document Detail (`/document/[id]`).
     - Installed dependencies with `npm install` and added `autoprefixer`.
     - Ran `npm run build`: successfully generated all 5 routes with 0 errors.
  5. **Documentation**:
     - Generated [`walkthrough.md`](file:///C:/Users/nikun/.gemini/antigravity/brain/5272d126-2c98-451a-bf85-d15d6a6238f8/walkthrough.md).

### Session 4: GitHub Remote Sync & Legacy Cleanup
- **User Request**: `note: commite on https://github.com/NIKUNJ160/open-library and remove old files`.
- **Actions Executed**:
  1. Connected remote repository `origin` -> `https://github.com/NIKUNJ160/open-library.git`.
  2. Fetched remote `origin/main` (contained legacy NestJS `universal_search_engine/` and old batch scripts).
  3. Replaced the entire tree with the clean Phase 0 Open Library Knowledge Engine architecture (`-64,238` lines deleted across 534 old files; `+5,838` new lines added).
  4. Created fast-forward commit `5146c5b` directly descending from `origin/main`.
  5. Successfully pushed `main` to `origin/main` (`5146c5b`).

---

## 3. Current Repository Tree

```
d:/sites/
├── .env                          # Local environment settings
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── README.md                     # Root overview & getting started
├── MEMORY.md                     # Persistent conversation & state memory (this file)
├── deep-research-report.md       # Original comprehensive research report
├── docker-compose.yml            # PostgreSQL + pgvector, Redis, Backend, Frontend
├── backend/
│   ├── Dockerfile
│   ├── README.md
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── alembic.ini
│   ├── initdb/
│   │   └── 01_init.sql
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 001_initial_schema.py
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   └── session.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── document.py
│   │   │   └── entity.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── search.py
│   │   │   ├── document.py
│   │   │   └── ask.py
│   │   └── api/
│   │       ├── __init__.py
│   │       └── v1/
│   │           ├── __init__.py
│   │           ├── router.py
│   │           ├── health.py
│   │           ├── search.py
│   │           └── documents.py
│   └── tests/
│       ├── __init__.py
│       └── test_api.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    ├── next.config.mjs
    ├── tailwind.config.ts
    ├── postcss.config.mjs
    └── src/
        ├── app/
        │   ├── globals.css
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── search/
        │   │   └── page.tsx
        │   └── document/
        │       └── [id]/
        │           └── page.tsx
        ├── components/
        │   ├── Header.tsx
        │   ├── SearchBar.tsx
        │   ├── SearchResultCard.tsx
        │   └── LicenseBadge.tsx
        └── lib/
            ├── api.ts
            └── types.ts
```

---

### Session 5: Phase 1 (MVP Core Ingestion & Hybrid Search)
- **User Request**: `phase 1`.
- **Actions Executed**:
  1. **FastEmbed Dense Embedding Pipeline (`backend/app/services/embedding_service.py`)**:
     - Integrated `FastEmbed` with `BAAI/bge-small-en-v1.5` (384 dimensions).
     - Verified ONNX runtime embedding generation in Python 3.12 (passing test suite).
  2. **ETL Ingestion Collectors (`backend/app/etl/`)**:
     - `base.py`: Implemented sliding-window text chunker and batch passage embedding generator.
     - `openlibrary.py`: Built parser for Open Library works, bibliographic authors, subjects, and sample API fetcher.
     - `wikipedia.py`: Built parser for Wikipedia articles, HTML stripper, Wikidata entity references, and REST API fetcher.
  3. **Hybrid Search Service with RRF (`backend/app/services/search_service.py`)**:
     - Parallel retrieval: BM25/keyword matching on canonical documents + pgvector cosine similarity on chunks.
     - Reciprocal Rank Fusion ($k=60$) blending sparse and dense rankings.
  4. **FastAPI Route Enhancement**:
     - Updated `GET /api/v1/search` to route queries to `hybrid_search_service.search`.
  5. **Data Ingestion CLI Runner (`backend/scripts/ingest_sample.py`)**:
     - Built CLI supporting online API sampling and offline curated seed datasets.
  6. **Automated Testing & Frontend Verification**:
     - Ran `uv run pytest`: 8/8 tests passed in 6.00s across `test_api.py`, `test_etl.py`, `test_embedding.py`, `test_search.py`.
     - Verified Next.js 14 production build (`npm run build` completed with 0 errors).

---

### Session 6: Phase 2 (Scholarly Corpus & Metadata Enrichment)
- **User Request**: `phase 2` (approved implementation plan).
- **Actions Executed**:
  1. **Academic ETL Collectors (`backend/app/etl/`)**:
     - `openalex.py`: Built `OpenAlexCollector` with inverted-index abstract unrolling, author & ORCID mapping, DOI normalization, and polite API client (`User-Agent` + `mailto`).
     - `crossref.py`: Built `CrossrefCollector` with JATS XML tag stripping, container venue resolution, reference/citation counts, and polite client.
     - `europepmc.py`: Built `EuropePMCCollector` with structured author parsing, PMID/PMCID mapping, OA detection, and full-text links.
     - `__init__.py`: Exported all scholarly collectors.
  2. **Academic Citation Service & Endpoints (`backend/app/services/` & `backend/app/api/v1/`)**:
     - `citation_service.py`: Implemented `CitationService` generating valid `BibTeX`, `APA` (7th ed), `MLA` (9th ed), and `Chicago` (Author-Date) citations.
     - `documents.py`: Added `GET /api/v1/documents/{document_id}/citation` (with style parameter validation) and `GET /api/v1/documents/{document_id}/citations`.
     - `schemas/document.py`: Added `CitationResponse` and `AllCitationsResponse`.
  3. **Sample Ingestion CLI (`backend/scripts/ingest_sample.py`)**:
     - Added offline curated landmark scholarly datasets (*Attention Is All You Need*, *Deep Residual Learning*, *DNA Double Helix*, *CRISPR-Cas9*, *Hallmarks of Cancer*).
     - Added `--source` options: `openalex`, `crossref`, `europepmc`, `scholarly`, `openlibrary`, `wikipedia`, `all`.
  4. **Frontend Citation Modal & Scholarly UI**:
     - `CitationModal.tsx`: Built multi-format citation exporter modal with live style tabs (BibTeX, APA, MLA, Chicago), syntax pre-block, and one-click copy to clipboard with active checkmark feedback.
     - `SearchResultCard.tsx`: Integrated "Cite" button and DOI badge.
     - `search/page.tsx`: Added faceted filtering for scholarly sources (`OpenAlex`, `Crossref`, `Europe PMC`) and document types (`Papers`, `Books`, `Articles`).
     - `document/[id]/page.tsx`: Added rich academic metadata badges (DOI, PMID, PMCID, citations count, ORCID badges) and "Cite / Export" action.
  5. **Automated Verification**:
     - Backend: 18/18 tests passed via `uv run pytest` in 2.62s (`test_api.py`, `test_citation.py`, `test_embedding.py`, `test_etl.py`, `test_scholarly_etl.py`, `test_search.py`).
     - Frontend: `npm run build` compiled all 5 Next.js routes with 0 TypeScript/ESLint errors.

---

### Session 7: Phase 3 (Dense Vector Optimization & Neural Reranking)
- **User Request**: `Phase 3` (executed approved plan with safety mitigations).
- **Actions Executed**:
  1. **Neural Cross-Encoder Reranker (`backend/app/services/rerank_service.py`)**:
     - Integrated `Xenova/ms-marco-MiniLM-L-6-v2` running 100% locally via FastEmbed ONNX runtime (80 MB, Apache-2.0).
     - Non-blocking async execution using `asyncio.to_thread` to protect FastAPI's event loop from CPU-bound inference.
     - Implemented numerically stable Sigmoid Normalization $\sigma(x) = \frac{1}{1 + e^{-x}}$ mapping raw logits to calibrated $[0.0, 1.0]$ confidence scores.
     - Strict candidate cap (`rerank_top_k=20`) preventing compute runaway.
  2. **HNSW Vector & Hybrid Pipeline Optimization (`backend/app/services/search_service.py`)**:
     - Configured `SET LOCAL hnsw.ef_search = 40;` inside query transactions to maximize graph search recall safely without connection pool leakage.
     - Two-stage architecture: Stage 1 RRF fusion (sparse BM25 + dense HNSW) generating top candidates; Stage 2 cross-encoder joint query-document re-scoring.
     - Instrumented query latency timing (`search_time_ms`) and `reranked` status.
  3. **FastAPI Search Route & Schemas**:
     - Updated `GET /api/v1/search` with `enable_rerank: bool = Query(True)`.
     - Updated `SearchResponse` schema with `search_time_ms` and `reranked`.
  4. **Performance Benchmarking Suite (`backend/scripts/benchmark_search.py`)**:
     - Benchmarks 10 evaluation queries across: Sparse BM25, Dense Vector HNSW, Hybrid RRF, and Two-Stage Hybrid + Neural Cross-Encoder.
     - Measures mean, p50, p95, p99 latencies and throughput (QPS).
  5. **Frontend Neural Rerank Toggle & Latency Badge (`frontend/`)**:
     - Added interactive "Neural Rerank" toggle switch in the sidebar filter.
     - Added search latency badge (e.g. `24.2 ms`) and "Neural Reranked" status indicator.
     - Verified with Next.js 14 production build (`npm run build` compiled 5/5 routes with 0 errors).
  6. **Automated Verification**:
     - Ran `uv run pytest`: **22/22 tests passed** in 3.14s (`test_rerank.py`, `test_scholarly_etl.py`, `test_citation.py`, `test_embedding.py`, `test_api.py`, `test_etl.py`, `test_search.py`).

---

### Session 8: Phase 4 (Conversational RAG with Citation-Grounded Streaming)
- **User Request**: `start phase 4` (approved implementation plan).
- **Actions Executed**:
  1. **Citation-Grounded RAG Engine (`backend/app/services/rag_service.py`)**:
     - Built `RAGService` with multi-provider LLM support (OpenAI `gpt-4o-mini`, Google Gemini `gemini-1.5-flash`, and intelligent local offline fallback).
     - Context assembly: structures Stage-2 neural reranked passages into numbered blocks `[1]`, `[2]`, with titles, provenance, and license metadata.
     - Strict anti-hallucination prompt: enforces that every claim must cite `[1]`, `[2]`, and instructs the model to refuse if the retrieved context lacks sufficient evidence.
     - Real-time Server-Sent Events (SSE) streaming yielding `sources`, `token` deltas, and `done` events.
  2. **FastAPI Endpoints (`backend/app/api/v1/ask.py`)**:
     - Added `POST /api/v1/ask` supporting both JSON (`stream=False`) and SSE (`stream=True`).
     - Added `GET /api/v1/ask` for standard browser `EventSource` consumption.
     - Registered in `backend/app/api/v1/router.py`.
  3. **Frontend Conversational Interface (`frontend/src/app/ask/`)**:
     - Built conversational multi-turn chat UI with live streaming tokens and pulsing cursor.
     - Interactive `CitationPill.tsx`: renders `[1]`, `[2]` citation tags with hover popovers displaying source title, snippet, license, and direct links to `/document/[id]`.
     - Suggested questions chips (*"Transformer architecture"*, *"CRISPR-Cas9"*, *"General Relativity"*, *"Hallmarks of Cancer"*).
     - Reference literature drawer showing cited passage cards.
     - Navigation link added to `Header.tsx` ("Ask AI").
  4. **Automated Verification**:
     - Backend: **26/26 tests passed** via `uv run pytest` in 4.22s (`test_rag.py`, `test_rerank.py`, `test_scholarly_etl.py`, `test_citation.py`, `test_embedding.py`, `test_api.py`, `test_etl.py`, `test_search.py`).
     - Frontend: `npm run build` compiled all 6 routes (`/`, `/_not-found`, `/ask`, `/document/[id]`, `/search`) with **0 TypeScript and ESLint errors**.

---

### Session 9: Phase 5 (Knowledge Graph Integration & Entity Resolution)
- **User Request**: `Phase 5 approved, after finishing all phases i will uplode a frontend template`.
- **Actions Executed**:
  1. **Knowledge Graph & Entity Resolution Service (`backend/app/services/entity_service.py`)**:
     - Deduplication & Canonicalization: resolves entities by persistent external identifiers (ORCID, Wikidata QIDs) and normalized name + entity type matching.
     - Attribute Merging: enriches existing records with newly discovered aliases, descriptions, and source provenance without duplicates.
     - Document Extraction: maps author entities (with ORCIDs), subject topics, and publisher/venue organizations from document metadata with semantic roles (`author`, `subject`, `publisher`, `mentioned`).
     - Subgraph Traversal: constructs ego-centric subgraphs returning root node, connected document nodes, co-occurring entities, and typed directed edges.
     - Global Overview: identifies highest-degree hubs across the knowledge graph.
  2. **FastAPI Graph & Entity Endpoints (`backend/app/api/v1/entities.py` & `schemas/entity.py`)**:
     - `GET /api/v1/entities`: Paginated entity search with name query `q`, type filter (`person`, `topic`, `org`), and linked document counts.
     - `GET /api/v1/entities/{id}`: Entity profile with external identifiers (ORCID/Wikidata) and linked publications.
     - `GET /api/v1/entities/{id}/graph`: Subgraph extraction endpoint.
     - `GET /api/v1/graph/overview`: Global knowledge network hubs and connections.
     - Registered in `backend/app/api/v1/router.py`.
  3. **Ingestion & Backfill Automation (`backend/scripts/ingest_sample.py`)**:
     - Connected `entity_service.extract_and_link_document(session, doc)` to sample ingestion CLI and added automated backfill for all existing corpus records.
  4. **Frontend Interactive Graph Visualization & Pages (`frontend/`)**:
     - `KnowledgeGraph.tsx`: Built interactive SVG network graph component with force relaxation physics, category color-coding (Person: emerald, Topic: purple, Org: amber, Document: blue), glowing root ring, smooth drag & pan, zoom controls, category filters, and rich hover tooltips.
     - `entity/[id]/page.tsx`: Entity profile page featuring infobox, ORCID/Wikidata external badges, linked works count, tabbed view (Interactive Subgraph & Document Cards).
     - `graph/page.tsx`: Global Graph Explorer with search bar, entity type filters, dual-mode switcher (Global Graph visualization vs. Entity Directory grid).
     - `Header.tsx`: Added "Graph" link in navigation bar.
     - Types & API: added entity and graph interfaces in `types.ts` and helper functions in `api.ts`.
  5. **Automated Verification**:
     - Backend: **32/32 tests passed** via `uv run pytest` in 4.51s (`test_entity.py` 6/6 passed, plus all existing suites).
     - Frontend: `npm run build` compiled all **7 routes** (`/`, `/_not-found`, `/ask`, `/document/[id]`, `/entity/[id]`, `/graph`, `/search`) with **0 TypeScript and ESLint errors**.

---

### Session 10: Phase 6 (Production Hardening, Scaling, Ops & Deployment)
- **User Request**: `Phase 6` -> `proceid`.
- **Actions Executed**:
  1. **Dual-Layer Caching Engine (`backend/app/services/cache_service.py`)**:
     - Distributed Redis client via `redis.asyncio` with deterministic MD5 key hashing.
     - Transparent in-memory TTL LRU cache fallback: zero downtime or exceptions if Redis container is uninitialized or temporarily disconnected.
     - Wired into `search_service.py`: caches search results for identical queries & filters (`CACHE_TTL_SEARCH=300s`).
  2. **Security Hardening & Rate Limiting (`backend/app/core/security.py`)**:
     - Sliding-window rate limiter per client IP (default 60 req/min) tracking timestamps within rolling 60s windows.
     - Injects standard `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` headers; returns RFC-compliant HTTP 429 when threshold is reached.
     - `SecurityHeadersMiddleware`: injects OWASP headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`).
     - Registered in `backend/app/main.py`.
  3. **Database Connection Pool Optimization & Health Monitoring**:
     - `session.py`: Parameterized async engine pool (`DB_POOL_SIZE=15`, `DB_MAX_OVERFLOW=10`, `DB_POOL_TIMEOUT=30s`, `DB_POOL_RECYCLE=1800s`, `pool_pre_ping=True`).
     - `health.py`: Enhanced `GET /api/v1/health` providing live component diagnostics for Database, pgvector extension, Redis Cache (or fallback), Embedding Engine readiness, and uptime.
  4. **Production Multi-Stage Containerization & Reverse Proxy**:
     - `backend/Dockerfile.prod`: Multi-stage build with Astral `uv`, non-root user `appuser`, multi-worker Uvicorn (`--workers 4`), and container healthcheck.
     - `frontend/Dockerfile.prod`: Multi-stage build with Node 20 Alpine, standalone output mode, non-root `nextjs` user, and healthcheck.
     - `nginx/nginx.conf`: Production reverse proxy configuration with gzip compression, API rate-limiting zones (`30r/s`), proxy buffer tuning, SSE streaming support for `/api/v1/ask`, and Next.js static asset caching.
     - `docker-compose.prod.yml`: PostgreSQL with tuned pgvector memory parameters (`shared_buffers=512MB`, `work_mem=32MB`, `maintenance_work_mem=128MB`), Redis with persistent append-only logs and memory limits, backend, frontend, and Nginx.
  5. **CI/CD Automation (`.github/workflows/ci.yml`)**:
     - GitHub Actions workflow testing backend (`pgvector:pg16` + `redis:7-alpine` service containers, `pytest`) and frontend (`npm ci`, `npm run build`).
  6. **Automated Verification**:
     - Backend: **39/39 tests passed** via `uv run pytest` in 3.66s (`test_production.py` 7/7 passed, testing cache CRUD, TTL expiry, rate limiter sliding window, security headers, rate limit 429 backoff, and enhanced health checks).
     - Frontend: `npm run build` compiled all **7 routes** in Next.js standalone mode with **0 TypeScript and ESLint errors**.

---

### Session 11: Editorial Book Library Frontend Template Implementation
- **User Request**: `backend/book-library-template.md for website front end`.
- **Inspiration**: India Library (cultural identity, discoverability, rich subject taxonomy) + Open Library (bibliographic metadata, subjects, authors, editions, "Read Online") + Bloomberg (editorial typography, high information density, magazine-style layouts, clean `#D9D5CE` borders, warm archival cream paper palette `#F7F5F0`, deep burgundy accent `#8B1E2D`).
- **Actions Executed**:
  1. **Design System & Typography Configuration**:
     - `frontend/tailwind.config.ts`: Configured `library` color palette (`bg: #F7F5F0`, `card: #EFECE5`, `border: #D9D5CE`, `dark: #171717`, `secondary: #66635F`, `muted: #8A8782`, `accent: #8B1E2D`, `accent-hover: #701824`) and editorial typography (`font-editorial` / `font-serif` using `Playfair Display`, `font-sans` using `Inter`).
     - `frontend/src/app/globals.css`: Antialiasing, warm archival paper base styling, deep burgundy selection highlighting (`selection:bg-library-accent selection:text-white`).
     - `frontend/src/app/layout.tsx`: Root layout with Playfair Display & Inter fonts, unified masthead header, and editorial 5-column footer.
  2. **Core Components**:
     - `Header.tsx`: Editorial masthead with archive label ("Digital Public Knowledge Archive"), brand mark ("THE LIBRARY • Open Edition"), catalog search bar, navigation links (Catalog, Books, Papers, Knowledge Graph, and burgundy-accented Ask AI), and responsive mobile drawer. Automatically hides on distraction-free reader routes (`/read/*`).
     - `Footer.tsx`: 5-column editorial footer with institutional sources transparency, catalog links, open access licensing statement (CC0 / CC-BY), and developer API documentation links.
     - `BookCard.tsx`: Curated book cover cards with 2/3 aspect ratio, deterministic cloth/leather spine styling for works lacking covers, source badges, author links, and quick actions ("Read Online", "Cite", "Details").
     - `SearchBar.tsx`: Editorial search bar with responsive sizing, autofocus handling, and deep burgundy submit buttons.
     - `CitationModal.tsx` & `CitationPill.tsx`: Standards-compliant citation modals (BibTeX, APA 7th, MLA 9th, Chicago) styled with library palette and inline citation pills.
     - `KnowledgeGraph.tsx`: Interactive SVG force-directed knowledge graph with burgundy root highlight and category color mapping.
  3. **Pages Implemented & Redesigned**:
     - `page.tsx` (Homepage): 8-section editorial layout (Hero masthead with large catalog search, 4-column archive statistics strip, Featured Collection spotlight card, Popular Books grid, text-first Explore by Subject matrix, Bloomberg-style split Editorial / Trending Scholars section, and dense Latest Additions table).
     - `search/page.tsx`: Dual view mode toggle (Card Grid vs. Bibliographic List view), neural reranking switch, source & format filters, pagination, and integrated citation modal.
     - `document/[id]/page.tsx`: Two-column bibliographic layout with book cover / actions on the left, complete metadata table on the right, "About this Work" description, passage chunks preview, and connected entities badges.
     - `read/[id]/page.tsx`: Distraction-free reader interface with sepia (`#F7F5F0`), light, and dark themes, font size controls (`sm/base/lg/xl`), serif/sans typography toggle, chapter/chunk table of contents drawer, and reading progress indicator.
     - `ask/page.tsx`: Scholarly AI Assistant with multi-turn streaming grounded answers, inline citation pills, suggested query chips, and grounding literature reference inspector.
     - `graph/page.tsx`: Knowledge Graph Explorer with entity type filtering, live SVG network visualization, and canonical entity directory.
     - `entity/[id]/page.tsx`: Entity profile with ORCID/Wikidata identifiers, linked works counts, interactive subgraph tab, and linked documents directory.
  4. **Automated Verification**:
     - Backend: **39/39 tests passed** via `uv run pytest` in 12.82s.
     - Frontend: `npm run build` compiled all **8 routes** (`/`, `/_not-found`, `/ask`, `/document/[id]`, `/entity/[id]`, `/graph`, `/read/[id]`, `/search`) with **0 TypeScript and Next.js errors**.

---

## 4. Current Status & Production Readiness

All 6 backend roadmap phases and the complete editorial book library frontend template are fully implemented, verified, and operational:
- **Phase 0**: Scaffolding, Docker Compose, Database Schema, Next.js Foundation (`5146c5b`).
- **Phase 1**: MVP Ingestion (Open Library & Wikipedia) & Hybrid Search with RRF (`542ed0e`).
- **Phase 2**: Scholarly Corpus (OpenAlex, Crossref, Europe PMC) & Citation Engine (`13736d3`).
- **Phase 3**: Dense Vector Optimization & Neural Cross-Encoder Reranker (`88dbe85`).
- **Phase 4**: Conversational RAG with Citation-Grounded Streaming (`cef7584`).
- **Phase 5**: Knowledge Graph Integration & Entity Resolution (`2ab1629`).
- **Phase 6**: Production Hardening, Scaling, Caching, Ops & Deployment (`94c6f2b`).
- **Frontend Template**: Full Editorial Book Library experience (India Library + Open Library + Bloomberg aesthetic) with 8 verified routes.
