# Open Library Knowledge Engine

An open-source, hybrid-search and citation-grounded RAG engine over public knowledge sources (Open Library, Wikipedia/Wikidata, OpenAlex, Crossref, Europe PMC, PubMed).

## Tech Stack
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 (async), pgvector, FastEmbed
- **Database**: PostgreSQL 16 with `pgvector` & `pg_trgm`, Redis 7
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons

## Quick Start

### 1. Infrastructure (Docker)
```bash
docker compose up -d db redis
```

### 2. Backend
```bash
cd backend
uv venv --python 3.12 .venv
.venv\Scripts\activate
uv pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) for the UI and [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive Swagger API documentation.
