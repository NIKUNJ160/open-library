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

## 4. Next Milestone: Phase 4 (Conversational RAG with Citation-Grounded Streaming)

Tasks lined up for Phase 4:
1. **RAG Pipeline Engine**:
   - `backend/app/services/rag_service.py`: Context assembly from top-k reranked passages with strict citation grounding `[1]`, `[2]`.
   - Streaming LLM generation via Server-Sent Events (SSE) or WebSockets.
2. **Context Compression & Hallucination Guardrails**:
   - Anti-hallucination verification prompt; refusal to answer if grounding context is insufficient.
3. **Conversational Chat Interface (`frontend/src/app/ask/`)**:
   - Multi-turn conversation UI with real-time text streaming.
   - Interactive inline citation pills linking directly to referenced source documents and passages.
