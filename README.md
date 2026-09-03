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

## 🚀 Current Status (Phases 1–5 Complete)

**Phase 1 (Infrastructure & Hardening):** ✅ Complete
- Established `BaseConnector` pattern with resilient timeouts and circuit breakers.
- Set up Redis caching layer with intelligent TTLs.
- Fixed foundational SEO, TypeScript typings, and dark theme UI shell.

**Phase 2 (Connector Expansion):** ✅ Complete
- Integrated 33 authoritative open-access connectors across 7 research domains.
- Fully integrated into parallel `SearchAggregatorService` with deduplication.
- 100% test coverage passing (103/103 unit and integration tests across 16 test suites).

**Phase 3 (Hybrid Search - PostgreSQL + pgvector):** ✅ Complete
- PostgreSQL 16 with `pgvector` extension storing 1024-dimensional semantic chunk embeddings.
- Automatic HNSW cosine similarity index (`vector_cosine_ops`) for sub-second semantic retrieval.

**Phase 4 (AI/RAG Pipeline):** ✅ Complete
- Nvidia NIM hosted microservices integration with `meta/llama-3.2-11b-vision-instruct` for fast, direct text generation.
- Asymmetric vector embeddings with `nvidia/llama-nemotron-embed-vl-1b-v2` (1024 dimensions).
- Automatic document chunking, citation generation (BibTeX, APA, MLA, Chicago), and Knowledge Graph entity triples extraction.

**Phase 5 (Production Cloud Deployment):** ✅ Complete
- Production Docker Compose stack (`docker-compose.prod.yml`) for **Oracle Cloud Always Free Tier VPS** (4 OCPU / 24GB RAM).
- Turnkey automated bash script (`scripts/setup-oracle-vps.sh`) configuring host firewalls and launching the stack.
- Cloudflare edge proxying with free SSL termination and CDN caching.

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

---

## ☁️ 100% Free Production Deployment (Oracle Cloud Always Free VPS)

You can run the full stack (Next.js frontend, NestJS API, PostgreSQL with `pgvector`, and Redis) **100% free forever** on an Oracle Cloud Always Free VPS:

1. **Create an Oracle Cloud Instance:**
   - Shape: Ampere A1 (`VM.Standard.A1.Flex`) with 2–4 OCPUs and 12–24 GB RAM.
   - OS: Ubuntu 22.04 / 24.04 LTS.
2. **Open Ingress Ports 80 & 443:**
   - In Oracle Cloud Console, add Ingress Rules for ports `80` and `443` (TCP) in your VCN Default Security List.
3. **Run the One-Click Deployment Script on the VPS:**
   ```bash
   git clone https://github.com/NIKUNJ160/open-library.git
   cd open-library/universal_search_engine
   chmod +x scripts/setup-oracle-vps.sh
   sudo ./scripts/setup-oracle-vps.sh
   ```
4. **Connect Domain & Cloudflare Free SSL:**
   - Add a Cloudflare DNS `A` record pointing your domain to the Oracle VPS public IP.
   - Turn Proxy ON (Orange Cloud) for automatic free SSL and global CDN acceleration.
