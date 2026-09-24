# Open Library Knowledge Engine – Executive Summary

We propose building an integrated search/RAG platform across public-domain knowledge (books, articles, data, blogs) with a Python/FastAPI backend, a relational database + vector store, and a Next.js frontend. Key sources include library catalogs (e.g. **Open Library**), encyclopedias/wikis (**Wikipedia**, **Wikidata**), scholarly metadata (OpenAlex, Crossref, Europe PMC), open preprint & medical archives (arXiv, PubMed), government open data portals (USA, EU, India), and web content (RSS/Atom). Each source offers APIs or bulk dumps (e.g. Open Library’s monthly JSON dumps, Wikimedia’s monthly dumps). We must ingest and normalize heterogeneous records, resolve duplicate entities (e.g. same book by ISBN, same person by ORCID/Wikidata ID), and tag provenance/license. For storage, options range from PostgreSQL with **pgvector** (simple, hybrid text+vector support) to specialized vector DBs (OpenSearch, Weaviate, Milvus) or managed services (Pinecone). Embeddings (OpenAI or open Sentence-Transformers) power dense search and RAG. The API will expose endpoints like `/search`, `/entity`, `/document`, `/ask` with pagination, caching, auth, etc. Frontend patterns (Next.js) include a searchable UI, entity pages, citation metadata, and streamed answer rendering. We detail a phased roadmap (ingestion MVP → indexing → RAG → features) with milestones and effort. Throughout, we emphasize provenance and license metadata (e.g. noting a source’s CC-BY-SA or CC0 license) to build user trust.

# 1. Public Sources and Access

We prioritize **official, open-data sources** with broad coverage. Key sources include:

- **Open Library (books)** – Provides *structured bibliographic JSON dumps* (authors, works, editions) on a monthly basis. An API exists for low-volume lookups; for large ingestion use the bulk dumps. Licensing is permissive (data largely CC0/CC-BY), but confirm via Open Library docs.  
- **Wikipedia/Wikimedia** – All content (articles, talk pages, etc.) and **Wikidata** entities are freely downloadable. Wikimedia issues *full dumps (XML/JSON)* roughly monthly. Wikipedia text is CC BY-SA, while Wikidata is CC0 (public domain). Updates are frequent (daily diffs available via API or event streams). Ingestion difficulty is high due to volume but tools exist (MediaWiki API, `mwxml`, etc).  
- **OpenAlex** – A modern **research catalog** (papers, authors, institutions) with a **free REST API** (filter/search on `/works`, `/authors`, etc). Usage is free (no key needed up to low limits). Data is CC0. OpenAlex also provides snapshots and daily changefiles. Suitable for articles, grants, patents metadata.  
- **Crossref** – Global DOI registry for scholarly works. Offers a **REST API** for metadata and `OAI-PMH`, plus *full metadata dumps* (~200+ GB monthly). Snapshots are large (2025 size ~200 GB, ~$18 AWS cost as of 2025). Metadata is CC0 (open). Use the API/OAI for incremental updates; use dumps or Academic Torrents for bulk import.  
- **Europe PMC** – Aggregated biomedical literature (36M abstracts, 5M full-text). Provides a REST API (`europepmc.org/rest`) and full-text archive (2.5M OA articles). Data is free to use for text-mining; most content is in PubMed Central or PMC Open Access (with permissive reuse).  
- **ArXiv** – Physics/math preprint server. Metadata available via **OAI-PMH** (daily updates recommended) or arXiv API. Full-text PDFs are on AWS S3/Kaggle, but note license: arXiv’s default license *does not permit redistribution*, so only reference/link contents.  
- **PubMed/MEDLINE** – NLM’s biomedical citations. Use NCBI’s E-utilities (Entrez API) for queries or FTP bulk. Content is U.S. government work (mostly public domain), but users must credit NLM and keep data current. NLM imposes terms of use (acknowledgment, no endorsement claims).  
- **Government Open Data (US/EU/India)** – Numerous APIs/portals (e.g. Data.gov, data.europa.eu, data.gov.in) cover statistics, research, public datasets. Formats vary (CSV/JSON/XML). Licenses are typically CC0 or ODbL. Ingestion difficulty varies by dataset – some offer API endpoints (often rate-limited), others CSV dumps updated regularly. Prioritize domain-specific portals (e.g. NIH, NASA, Eurostat).  
- **Blog Platforms** – Web content (blogs, news). Many platforms expose **RSS/Atom** feeds (WordPress, Blogger, etc). No unified API, requires web crawling or RSS harvesting. Licensing is per-author (often all rights reserved), so only index publicly licensed content (or use only snippets with attribution). RSS makes ingestion incremental (new posts), but scale is enormous and unstructured.

**Table: Key Public Sources.** We summarize type, access, license, update frequency, and ingestion notes below.

| Source         | Type         | Access (API/Dump)               | License                 | Update Cadence          | Ingestion Notes              |
| -------------- | ------------ | ------------------------------- | ----------------------- | ----------------------- | ---------------------------- |
| Open Library   | Books (bibliographic) | REST API (low-rate) + JSON dumps | CC0/CC-BY (free reuse) | Monthly (dumps)         | Use dumps for bulk; API for metadata lookup |
| Wikipedia      | Articles (free encyclopedia) | REST API + XML dumps | CC BY-SA (text)        | Daily diffs; monthly full dumps | Use dumps to ingest pages, or real-time updates via EventStreams |
| Wikidata       | Entities/ontology | SPARQL API + JSON/RDF dumps | CC0 (public domain)    | Weekly/daily dumps      | Use dumps; link entities by QID |
| OpenAlex       | Scholarly graph | REST API (no key) + dumps | CC0 (public domain)    | Continuous (API/OAI)    | Filter by IDs; use expansion corpus for more data |
| Crossref       | Scholarly metadata | REST API + OAI-PMH; bulk dumps | CC0 (metadata)         | Monthly snapshots       | Large dumps (200GB+); use API/OAI for updates |
| Europe PMC     | Biomed publications | REST API (search)            | Open (OA focus)         | Daily (new abstracts)   | ~36M abstracts, 5M full-text (2.5M reuseable) |
| arXiv          | Preprints     | OAI-PMH (metadata, daily) + RSS | Mostly authors retain rights (link only) | Hourly (OAI-PMH) | Ingest metadata via OAI; link PDFs but not store full text (no redistribution) |
| PubMed/MEDLINE | Biomedical citations | E-utilities API; FTP bulk | US Gov work (PD in USA) | Daily updates (MEDLINE) | Use ESearch/EFetch; credit NLM terms |
| US Open Data   | Government data | REST APIs (various)        | CC0/varies (open)       | Varies by dataset       | Often JSON/CSV; check each portal’s license |
| EU Open Data   | Government data | APIs/CKAN (European Data Portal) | ODbL/CC-BY/others     | Varies                 | Harmonize formats; likely batch jobs |
| India Open Data | Government data | APIs/CKAN (data.gov.in)     | CC0/others             | Varies                 | Similar to above |
| Blog RSS (WP)  | Misc web content | RSS/Atom feeds             | Usually all rights reserved (use snippets) | Continual (feeds)   | Crawl RSS; risk of copyright if scraping full posts |

Sources are prioritized by coverage and licensing. We avoid paywalled or proprietary data. For blogs, only ingest clearly re-usable content (public domain or CC licensed blogs). Many sources expose *changefeeds*: e.g., Wikimedia change streams, Crossref OAI-PMH. These enable incremental ingestion.

# 2. Ingestion Architecture

We will build an ETL (Extract-Transform-Load) pipeline with *source-specific collectors*, normalization and deduplication, running on a schedule or triggered by updates. Key design points:

- **Collectors & Scheduling**: For each source, implement a collector job (often a Python script or Airflow DAG). Some use REST APIs (e.g. OpenAlex, Crossref, EuropePMC), others use bulk downloads (Open Library, Wikipedia, Crossref dumps), and some use streaming (Wikimedia EventStreams, arXiv’s OAI-PMH). Schedule depends on source: e.g., daily for incremental updates (Wikipedia diffs, Crossref OAI), weekly/monthly for full dumps. Use cron or workflow tools; incorporate backoff and retries.  
- **Rate Limits and Bulk vs Incremental**: Respect API rate limits (e.g. Wikipedia throttles, Crossref API limited for abuse). Where possible, use *bulk dumps* to seed the database (e.g. initial load from Open Library/Wikipedia dumps). Then use incremental APIs for changes (e.g. Crossref OAI-PMH or incremental dumps, arXiv OAI-PMH daily). Plan requester-pays costs (e.g. Crossref on AWS S3). For feeds (RSS, OAI), process new items only.  
- **Data Parsing & Normalization**: Each source has its schema. We will map every record to a **canonical schema** (see Section 3). For example, transform Wikipedia JSON -> `[source: "wikipedia", source_id: pageid, title, text]`. Convert dates to ISO, unify author fields, strip HTML, parse identifiers (DOI, ISBN, ORCID). Remove markup (e.g. MediaWiki markup). Normalize multi-value fields (authors, subjects) to arrays.  
- **Deduplication / Entity Resolution**: Use unique keys (DOI for articles, ISBN/OLID for books) to identify duplicates. Where IDs are missing, apply fuzzy matching or known authority files. For entities (people, organizations), map to existing records by normalized names or external IDs (use Wikidata or OpenAlex IDs). For instance, the same author may appear via PubMed and EuropePMC – unify by matching ORCID or name+affiliation. Resolve conflicts by trusting higher-authority source (e.g. Crossref for DOI metadata, Wikidata for canonical names). Tools like [fuzzywuzzy](https://pypi.org/project/fuzzywuzzy/) or graph algorithms (blocking and linking) can help.  
- **Provenance Tracking**: For each ingested record, store source metadata (e.g. original URL, source ID, ingestion timestamp) in the database. This enables tracing any piece of data back to its origin and license. We propagate source/license into the KnowledgeDocument schema (Section 3).

```mermaid
flowchart LR
    subgraph Ingestion Pipeline
      A[Open Library dumps] --> B[Collector/Parser]
      C[Wikipedia API/Dumps] --> B
      D[Wikidata Dumps] --> B
      E[Crossref API/OAI] --> B
      F[Europe PMC API] --> B
      G[arXiv OAI-PMH] --> B
      H[PubMed E-Utils] --> B
      I[RSS feeds] --> B
      B --> J[Raw Staging (JSON)}
      J --> K[Normalizer & Deduplicator]
      K --> L[KnowledgeDocument Table]
      K --> M[Entity/Author Table]
      L --> N[Vector Store/Index]
    end
```

*Mermaid diagram:* ETL pipeline collects from each source, stages raw JSON, then normalizes into `KnowledgeDocument` records and updates vector indexes. 

# 3. Data Model and Schema

We adopt a canonical schema centered on **KnowledgeDocument** and **Entity** tables. Key ideas:

- **KnowledgeDocument**: Represents an ingested item (article, book, dataset, blog post, etc.). Core fields: `id` (UUID), `source` (e.g. "wikipedia"), `source_id` (original ID/URL), `title`, `content` (text or abstract), `type` (article, book, blog, etc.), `url`, `published_at`, `language`, `license` (e.g. "CC-BY-SA 3.0"), `created_at`, `updated_at`. Include metadata fields like `authors`, `subjects`, `summary`.  
- **Entity**: Canonical real-world entities (people, organizations, concepts). Fields: `id`, `name`, `type` (Person, Org, Topic), `description`, `aliases`, plus external IDs (Wikidata QID, ORCID, ROR, etc.), `source` (of definition). For each entity we also record provenance (which source provided it).  
- **Relationships / Triples**: Link `KnowledgeDocument` to `Entity` (e.g. author_of, mentions) in a many-to-many join table. Example: `document_entities(document_id, entity_id, role)`. Also allow `entity_relations(subject_id, predicate, object_id)` for knowledge graph triples (e.g. Person–“affiliatedWith”–Org).  
- **Provenance**: Each document record carries source and license. Optionally, a separate `provenance` table could log ingestion events (timestamp, source, version).  
- **Embeddings**: We may split long documents into passages; a `document_chunks` table can store chunks with `text` and `vector_embedding`. This supports granular retrieval (RAG).  

*Example SQL schemas (PostgreSQL)*:  

```sql
CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT,
  content TEXT,
  doc_type TEXT,
  url TEXT,
  published_at TIMESTAMP,
  language TEXT,
  license TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE entities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  entity_type TEXT,
  description TEXT,
  external_id TEXT,   -- e.g. Wikidata QID or ORCID
  source TEXT,
  aliases TEXT[]
);

CREATE TABLE document_entities (
  document_id UUID REFERENCES knowledge_documents(id),
  entity_id INT REFERENCES entities(id),
  role TEXT,            -- e.g. "author", "mentioned"
  PRIMARY KEY(document_id, entity_id, role)
);

CREATE TABLE document_chunks (
  id SERIAL PRIMARY KEY,
  document_id UUID REFERENCES knowledge_documents(id),
  text TEXT,
  chunk_order INT,
  embedding vector(1536)
);
```

We would also include FTS indexes on `title`/`content` (Postgres `tsvector`) and vector indexes on `embedding`.  

# 4. Storage & Search Options

**PostgreSQL + pgvector:**  A familiar RDBMS with the `pgvector` extension supports hybrid search. It can store embeddings (up to 64k-dim bits, 4k half precision). Exact or approximate (HNSW/IVFFlat) vector indexes are possible. Postgres also has built-in full-text search (BM25). *Pros:* Low cost (one system, ACID guarantees, SQL joins), straightforward scaling (read replicas). *Cons:* Not optimized for very large vector scale (billions) and clustering. Hybrid search must be manually combined (via queries on FTS + ORDER BY <->). Good for MVP.  

**OpenSearch (Elasticsearch fork):** A distributed search engine with vector support (k-NN plugin). Supports keyword (BM25) and approximate k-NN vector search. Has built-in hybrid search pipelines to combine sparse and dense matches. *Pros:* Designed for horizontal scale, mature, supports complex queries/aggregations. *Cons:* Operational overhead (clusters), heavier resource usage. Good for mid-to-large scale with heavy full-text needs.

**Milvus:** Open-source high-performance vector database (Apache-2.0, by LF AI). Scales to billions of vectors with GPU support. Milvus **natively supports hybrid search**: besides dense vectors it can store sparse BM25-style vectors and mix queries. *Pros:* Extreme scale, specialized for vector. *Cons:* No native full-text (though supports BM25 via sparse vectors), separate system to manage. 

**Pinecone:** Commercial vector database (SaaS). Easy to use (managed service, REST API, SDK). Auto-scales, supports metadata filtering and multi-vector joins. *Pros:* No infra management, very fast, enterprise features. *Cons:* Monthly cost (usage-based), vendor lock-in, no built-in full-text (metadata-only filtering).

**Weaviate:** Open-source vector database (Apache 2.0) with GraphQL interface. Supports hybrid search via combined BM25 and vector (since v1.17). Weaviate includes modules for real-time indexing of documents. *Pros:* Built-in hybrid logic (weaviate blog), multi-model (graph + vector). *Cons:* Relatively new, moderate scale (can cluster), another system to maintain.

| Storage Option       | Pros                                   | Cons                                    | Hybrid Search | MVP vs Long-Term |
|----------------------|----------------------------------------|-----------------------------------------|---------------|------------------|
| Postgres + pgvector  | Familiar, ACID, full-text support      | Scale to ~millions easily, overhead for vector queries | Combine SQL FTS with `ORDER BY <->` | *MVP friendly:* simple deployment; *Long-term:* may shard or add a search layer |
| OpenSearch           | Distributed, BM25+vector plugin, hybrid pipelines | Ops-heavy, resource-intensive      | Yes (k-NN + keyword) | *Scale-ready:* good long-term, more infra; MVP could use small cluster |
| Milvus               | Scales to billions (GPU support); hybrid (BM25+sparse) | No SQL/text engine (limited filters) | Supports sparse & dense, metadata filters | *Specialized:* great for large vector index; use with separate DB |
| Pinecone             | Zero-ops SaaS, fast, global vectors    | Recurring cost, no text, closed source  | Only vector + metadata filters | *Enterprise:* if budget allows; MVP: cost may be high |
| Weaviate             | Hybrid (dense+sparse) search built-in, GraphQL API | Newer, moderate scale, ops for cluster | Yes (sparse BM25 + dense vector) | *Friendly:* easier queries; good if needing graph semantics |

For an **MVP**, using **Postgres+pgvector** or **OpenSearch** suffices: easy to start, supports hybrid with manual integration. In the long term, a dedicated vector store (Milvus/Pinecone/Weaviate) can handle very large embeddings. We can mix: e.g. store metadata (titles/authors) in Postgres, and store vectors in Milvus or Pinecone for speed.

# 5. Embeddings and LLM Choices

**Embedding models:** We will generate vector embeddings for documents/passages. Options:
- **OpenAI Text Embeddings** (e.g. `text-embedding-3-small`). Cost: ~$0.02 per 1K tokens (or $0.01 in batch mode). Higher-quality models (`3-large`) cost ~$0.13/1K. Ada-002 (older) is much more expensive ($0.10/1K). We recommend *text-embedding-3-small* (1536-d) as cost-effective for RAG. Chunk documents to ~500 tokens for quality.  
- **Open-source models:** e.g. HuggingFace `sentence-transformers/all-MiniLM-L6-v2` or multilingual models (196-dim). Or larger ones like `sentence-transformers/multi-qa-MiniLM-L6-cos-v1`. These run locally (using `SentenceTransformer`), no API cost but need GPU/CPU. We can also use `HuggingFace Inference API` (paid).  
- **Hosted alternatives:** Cohere, Google Vertex AI embeddings, etc (with their pricing).

**LLM for RAG:** To generate answers, options:
- **Hosted (API)**: GPT-4/5/6 from OpenAI or Anthropic Claude. Example (2026): GPT-5.6-luna costs ~$0.10/1k-in + $0.60/1k-out (short context). GPT-5.6-sol is $2/1k + $10/1k. We should estimate token usage (e.g. 300 tokens prompt + 300 output = 600).  
- **Local models:** Llama 2 (7B/13B/70B, free for research/commercial under Apache 2.0), Mistral 7B, Falcon, etc. These require GPU inference (e.g. vLLM or Llama.cpp). Lower cost but needs hosting/inference infra. For MVP, an API like OpenAI can bootstrap.  
- **Reranker:** After retrieval, we can optionally re-rank top-K results using a *cross-encoder* (e.g. `cross-encoder/ms-marco-MiniLM-L-6-v2`) to better score relevance. This improves precision (see techniques like Reciprocal Rank Fusion or neural re-ranking).  
- **Token/Cost estimates:** If indexing 10,000 docs (~5M tokens total), `3-small` embedding costs ~$0.10 (standard). In production, user queries (~50 words) to GPT-4 could be negligible, but a large RAG call (~600 tokens) at $0.03/1k + $0.06/1k (GPT-4) = ~$0.054 per query. Using cheaper models (GPT-3.5) or local models reduces cost.

# 6. API Design (FastAPI)

We will build a FastAPI app with RESTful endpoints. Use Pydantic models for request/response schemas, and async I/O for backend calls. Suggested endpoints:

- **`GET /search`** – full-text/vector search. Query params: `q` (string), optional filters (source, type, date range), pagination (`page`, `size`).  
  _Response example:_  
  ```json
  {
    "query": "quantum mechanics",
    "page": 1,
    "page_size": 10,
    "total": 234,
    "results": [
      {"id":"uuid1","title":"Quantum Mechanics", "source":"wikipedia", "score":0.93, "snippet":"...the branch of physics...", "url":"..."},
      ...
    ]
  }
  ```  
  Ranking can combine TF-IDF and vector relevance.

- **`GET /entity/{id}`** – get entity details by internal ID or external ID (e.g. Wikidata QID). Returns name, type, description, aliases, linked docs.  
- **`GET /document/{id}`** – retrieve full KnowledgeDocument (title, content, metadata, source, license). Could include a list of matched passages or related entities.  
- **`POST /ask`** – RAG endpoint. JSON body: `{"question": "...", "top_k": 5}`. The backend will retrieve top relevant docs (using `/search` internally), then call an LLM with context. Response includes an answer plus citations to documents (IDs and footnotes).  
  _Response example:_  
  ```json
  {
    "question": "What is quantum mechanics?",
    "answer": "Quantum mechanics is ... (summarized answer) ...",
    "sources": [
      {"doc_id":"uuid1","title":"Quantum Mechanics - Wikipedia","url":"...", "source":"Wikipedia"},
      ...
    ]
  }
  ```  
- **Auth & Rate-limiting:** Endpoints should require API keys or OAuth if we restrict use. Use FastAPI dependencies or middleware (e.g. *fastapi-limiter*) for token rate limits per user.  
- **Pagination:** Standard `page/size` or cursor-based (e.g. `cursor_token`). Return meta (`total`, `page`, `has_more`).  
- **Caching:** Implement in-memory or Redis caching of frequent queries and of expensive LLM results. FastAPI supports `@lru_cache` or external caches. For example, cache vector-search results for a minute and LLM answers for an hour to cut costs.  
- **Error Handling:** Return clear JSON errors (e.g. 400 for bad queries, 500 for server error). FastAPI has built-in exception handlers.

```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

class SearchResult(BaseModel):
    id: str
    title: str
    snippet: str
    source: str
    score: float
    url: Optional[str]

class SearchResponse(BaseModel):
    query: str
    page: int
    page_size: int
    total: int
    results: List[SearchResult]

app = FastAPI()

@app.get("/search", response_model=SearchResponse)
async def search(q: str, page: int = 1, page_size: int = 10):
    # Query vector DB and full-text index, combine results
    results, total = search_engine.search(query=q, page=page, size=page_size)
    return {"query": q, "page": page, "page_size": page_size, "total": total, "results": results}

@app.post("/ask")
async def ask(question: str, top_k: int = 5):
    docs = search_engine.search(query=question, page=1, size=top_k)
    answer, used_ids = llm_chain.answer(question, docs)  # RAG pipeline
    sources = [{"doc_id":doc.id,"title":doc.title,"url":doc.url,"source":doc.source} for doc in docs]
    return {"question": question, "answer": answer, "sources": sources}
```

This sketch shows how endpoints might interface with underlying search/RAG services. We will document each endpoint’s JSON schema (in OpenAPI) and provide usage examples in API docs.

# 7. Frontend (Next.js/React)

The UI will provide search and exploration:

- **Search Page:** A search bar (with optional filters by type/source/date). On submit, call `/search`. Display paginated results (title, snippet, source icon, date). Support infinite scroll or “load more”. Show filters and sorting (by relevance or date).  
- **Document/Entity Pages:** For a selected result, show full content (or summary) and metadata: title, authors/entities (hyperlinked), publication date, source license. For books, show cover/description, for articles, abstract + journal. Each external reference should link to the original source (with URL). If the item is an entity (person/institution), show entity page with description and list of related docs.  
- **Citation Display:** In RAG answers or entity pages, display source citations clearly. E.g. “(Smith et al. 2020)” style or `[1]`. Use footnotes listing title, author, link. Possibly show license icons if CC-BY vs PD.  
- **Streaming Answers:** When user submits to `/ask`, use Next.js SSE or websocket to stream tokens back from the LLM for a live feel (until complete). Show a “loading” spinner or progressive answer.  
- **Offline / Indexing:** Optionally, cache popular content in Service Workers for offline viewing. Pre-render high-traffic pages (SSG) or use ISR (Incremental Static Regeneration) in Next.js for semi-dynamic content (like top authors or pages). SEO favors SSR/SSG for content pages (so Google can crawl entity pages).  
- **SSR vs CSR:** Use SSR (or SSG) for document and entity pages (to pre-render content and SEO). The search page can be CSR-heavy since it's user-driven. Next.js’s `getServerSideProps` or `getStaticProps` can pre-fetch data.  
- **UI/UX patterns:** Use a card/list layout for results, filters sidebar. Entity pages often have a layout with an infobox (metadata on left) and content. Provide a dark mode toggle, accessible design. Show trust badges (e.g. a source’s logo or “Verified Source” label).  

**Example Architecture:** 

```mermaid
graph LR
    subgraph Frontend
       FE1[Next.js App]
       FE2[Brower JS (React)]
    end
    subgraph Backend
       API[FastAPI /search, /ask, etc.]
    end
    FE1 -- SSR requests --> API
    FE2 -- AJAX/WS --> API
```

(Above is conceptual: Next.js will handle SSR for pages and CSR for interactivity, all talking to our FastAPI.)

# 8. Deployment & Infrastructure

- **Containerization:** Wrap the FastAPI app in Docker, with a separate container for the database (Postgres), and another for the vector store or search engine (if self-hosted). Next.js frontend can also be containerized or deployed via Vercel.  
- **CI/CD:** Use GitHub Actions (or similar) to build and test containers on each commit. Automated deploy to a staging environment (e.g. AWS ECS, Kubernetes, or serverless functions). For example, test suite via `pytest`, linting, then push Docker image to registry.  
- **Scaling:** For production, use Kubernetes or managed services. FastAPI can be behind a load balancer (NGINX or API Gateway) with multiple replicas. The database should have replicas/backups. The vector/index service (Milvus/Pinecone) should be scaled by its rules (Milvus on K8s, Pinecone auto).  
- **Monitoring & Logging:** Integrate Prometheus/Grafana for metrics (API latency, DB connections, etc.). Use ELK/Graylog or hosted logs for collecting FastAPI and query logs. Set up alerts on error rates, high latency, disk usage. Sentry can catch Python exceptions.  
- **Backups:** Regularly back up the SQL database (daily dumps + WAL archiving) and embeddings/index (if self-hosted). For vector DB, ensure snapshots or cloud persistence. Store backups in versioned S3 or object storage.  
- **Security:** Enforce HTTPS with SSL (certs via Let’s Encrypt). Use OAuth2/JWT for any auth. Sanitize all user input to prevent injection. Rate-limit per IP/API key. Keep dependencies up-to-date to avoid vulnerabilities.  
- **Data Privacy & Legal:** Since only public data is ingested, personal data is minimal. Still, follow privacy best-practices: do not log user queries beyond what’s needed (and anonymize logs). For content, respect licenses: e.g. do not reproduce CC-BY-SA text without attribution. Track license for every doc to ensure compliance.  
- **Licensing Compliance:** Clearly display or tag the license of each source (e.g. CC BY-SA, Public Domain). In the UI, note that “Wikipedia content CC BY-SA 3.0” etc. If a source requires attribution, ensure we do so. Maintain a legal review of source terms (e.g. NLM terms, ArXiv policies).  

# 9. Roadmap & Phases

We suggest an incremental development plan:

| Phase        | Description                                 | Milestones                                   | Effort/Resources (est)                 |
| ------------ | ------------------------------------------- | -------------------------------------------- | -------------------------------------- |
| **Phase 1 (MVP)** | Core ingestion & search functionality       | - Ingest Open Library, Wikipedia, Wikidata into DB<br>- Basic search endpoint + UI (POSTG+pgvector)<br>- Simple schema with KnowledgeDocument table | 2-3 months, 1-2 devs: Focus on ETL pipelines and basic search UI. |
| **Phase 2 (Scholarly)** | Add research metadata                     | - Ingest OpenAlex, Crossref, EuropePMC<br>- Update schema for authors/journals<br>- Enhanced search filters (year, type)<br>- Basic `/ask` with existing LLM | 2 months: Extend pipelines and schema, refine UI. |
| **Phase 3 (Advanced Search)** | Vector search + hybrid                       | - Integrate embedding generation (e.g. Sentence-BERT)<br>- Set up vector DB (Milvus or pgvector ANN)<br>- Implement hybrid ranking (combine TF-IDF + vectors)<br>- Introduce reranker model | 3 months: Set up vector store, tune hybrid queries, update search API/UI. |
| **Phase 4 (RAG and LLM)** | QA and conversational interface             | - Implement `/ask` fully with RAG (retrieve, call LLM, cite)<br>- Streamed answers in UI (websockets/SSE) <br>- Address LLM token/cost (prompts, truncation) | 2 months: Integrate OpenAI/HuggingFace, design prompts, handle multi-source citations. |
| **Phase 5 (Entities & KG)** | Knowledge graph integration and entities      | - Entity resolution across docs (e.g. link authors to Wikidata) <br>- Expose `/entity` pages with relationship graph <br>- Visualize connections between documents/entities | 3 months: Build or integrate graph DB if needed, UI for entity pages. |
| **Phase 6 (Optimization & Scaling)** | Performance, reliability, IR improvements | - Scale to larger data volumes (optimize indexes, partitioning) <br>- Add caching, CDN for static assets <br>- Container orchestration (K8s) and CI/CD pipelines <br>- Monitoring/Alerting in place | 2-3 months: Engineering ops, security audits, user testing. |

**Total**: ~12–15 months for a robust system (with a small team). *Note:* effort depends on team size; a solo developer could trim scope (e.g. skip on-prem search engine).  

Each phase ends with a deliverable (e.g. initial search beta, research search beta, RAG demo). After MVP, continuously gather user feedback (which features are most used: topic search, entity lookup, QA) to iterate.  

# 10. Security, Provenance, and Trust

To ensure user trust, we explicitly surface source provenance and license info:

- **Citations & Sources:** Every answer or document view will clearly list its source(s) (e.g. “Source: Wikipedia – CC BY-SA 3.0”). Search results show the origin (Wikipedia, Open Library, etc.). In RAG answers, include footnotes or inline refs linking to documents. This transparency lets users verify claims.  
- **License Metadata:** Store and display each document’s license. For CC-BY-SA content, show the CC BY-SA icon or text. This reminds users of reuse rights. For example, showing “(CC BY-SA 3.0)” next to a Wikipedia snippet encourages proper credit.  
- **Provenance Tracking:** Ingestion logs and database entries record *when* and *from where* data was obtained. We can (internally) track versions of sources (e.g. “Wikipedia dump as of 2026-09”). This is useful if information changes (to show outdated results with a timestamp). If contradictory information appears, we can surface all sources (e.g. “A says X, but B says Y”).  
- **Fact Verification:** Where possible, cross-validate facts across multiple sources (e.g. matching author names from Crossref and OpenAlex). Flag discrepancies. Optionally, use fact-checking APIs on user queries.  
- **Secure Operation:** Use HTTPS/TLS everywhere. Sanitize all outputs (avoid HTML/script injection from source text). Regularly update dependencies to patch vulnerabilities. Apply principle of least privilege for DB credentials and API keys.  
- **Legal/License Compliance:** As noted, follow source licenses. For user-generated content (e.g. saved queries or notes), have clear terms of service and privacy policy (likely out-of-scope here).

By systematically annotating results with source and license, and using trusted, official data feeds (Wikidata CC0, Crossref CC0, etc.), we maximize trust. Users can click through to original sources and verify content themselves, which builds confidence in the system.

**Sources:** We relied on official documentation: e.g., Open Library dumps; Wikimedia’s dump schedule; Europe PMC stats; Crossref data file info; OpenAlex API guide; arXiv bulk access info; NLM download terms; and tool docs for search (OpenSearch k-NN, Weaviate hybrid search, pgvector indexing, Milvus features, OpenAI cost). These guide our design and ensure we use up-to-date facts. 

