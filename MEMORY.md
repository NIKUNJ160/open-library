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

## 4. Next Milestone: Phase 1 (MVP Core Ingestion & Hybrid Search)

Tasks lined up for Phase 1:
1. **ETL Base & Collectors**:
   - `backend/app/etl/base.py`: Abstract collector class with batch chunking, hashing, and upsert logic.
   - `backend/app/etl/openlibrary.py`: Open Library JSON reader/parser for works, authors, editions.
   - `backend/app/etl/wikipedia.py`: Wikipedia extracts and Wikidata entity linker.
2. **Data Ingestion Runner**:
   - `backend/scripts/ingest_sample.py`: CLI to seed the database with sample works and articles.
3. **Embedding Pipeline & Hybrid Search Service**:
   - `backend/app/services/embedding_service.py`: Generates dense vectors using FastEmbed (`BAAI/bge-small-en-v1.5`).
   - `backend/app/services/search_service.py`: Reciprocal Rank Fusion (RRF) combining BM25 full-text matching and pgvector cosine distance.
