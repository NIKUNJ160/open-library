# Universal Open Knowledge Search Engine (Open Library)

A comprehensive research and knowledge aggregation platform that integrates open and publicly accessible APIs across major knowledge domains. 

This repository contains the full stack for the Open Library knowledge engine, enabling unified search, data collection, and indexing across **33 integrated public knowledge sources**.

## 🏗️ Architecture

The workspace is organized into a monorepo structure:

- **`/universal_search_engine`**: The core NestJS backend. Serves as the aggregation layer that concurrently searches 33 different APIs, normalizes their results, and provides unified endpoints.
- **`/books`**: Contains the React frontend (Vite + Tailwind) and a lightweight Express backend (SQLite) originally for photo albums, now evolving into the primary dashboard for the Universal Search Engine.
- **`/ai_sections`**: Markdown specifications outlining the architectural roadmap and system design.

## 🌐 Connected Knowledge Sources (33 Total)

The platform natively integrates with the following domains via concurrent connector architecture:

### 📚 Books & Literature
- OpenLibrary, Project Gutenberg, Google Books, Internet Archive, Wikisource

### 🔬 Research Papers
- OpenAlex, CORE, Semantic Scholar, arXiv, PubMed, EuropePMC, DOAJ, Crossref

### 📊 Datasets
- Kaggle, Hugging Face, Data.gov, Zenodo, Wikidata, Our World in Data (OWID)

### 💻 Code Repositories
- GitHub, GitLab, Sourcegraph (Stub)

### 📜 Patents
- Google Patents, USPTO, WIPO, European Patent Office (EPO) (Stub)

### 🏛️ Government & Official Data
- NASA, World Bank

### 📖 Documentation & APIs
- MDN Web Docs, Kubernetes Docs, Microsoft Learn, Python Docs, OpenAPI Directory (APIs.guru)

## 🚀 Current Status (Phase 2 Complete)

**Phase 1 (Infrastructure & Hardening):** ✅ Complete
- Established `BaseConnector` pattern with 5-second resilient timeouts.
- Set up Redis caching layer with intelligent TTLs.
- Fixed foundational SEO and TypeScript typings.

**Phase 2 (Connector Expansion):** ✅ Complete
- Added 12 new connectors, expanding the search engine's reach across the major domains.
- Fully integrated all 33 connectors into the `SearchAggregatorService`.
- 100% test coverage passing (64/64 tests).

**Phase 3 (Hybrid Search - PostgreSQL + pgvector):** ⏳ Pending
- Imminent migration to `pgvector` for embedding-based hybrid search.

**Phase 4 (AI/RAG Pipeline):** ⏳ Pending
- Integration of Ollama (local) and OpenAI (fallback) for semantic question answering over retrieved documents.

## 🛠️ Getting Started

### Prerequisites
- Node.js (v24+)
- Redis (running on port 6379)
- Git

### Installation & Build

```bash
# Clone the repository
git clone https://github.com/NIKUNJ160/open-library.git
cd open-library

# Install backend dependencies
cd universal_search_engine
npm install

# Build the NestJS aggregation backend
npm run build

# Run the backend test suite
npm test
```

### Environment Variables
Copy `universal_search_engine/.env.example` to `universal_search_engine/.env` and populate any required API keys. Note that most connectors (like arXiv, OpenAlex, Wikisource, etc.) use open APIs and do not strictly require keys, but adding them raises rate limits.
