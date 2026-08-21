# Implementation Plan: Phase 2, 3 & 4 — Detailed Technical Spec

---

## Phase 2 — New & Extended Connectors (12 New Sources)

> [!NOTE]
> The existing 21 connectors are preserved. This phase adds 12 new ones using the **exact same `BaseConnector` pattern** already in use, so no architectural changes are needed.

### New Connectors to Build

| # | File | Source | API Type | Auth |
|---|---|---|---|---|
| 1 | `literature/wikisource.connector.ts` | Wikisource | MediaWiki REST API | None |
| 2 | `research/crossref.connector.ts` | Crossref | REST API | None (polite pool) |
| 3 | `datasets/wikidata.connector.ts` | Wikidata | SPARQL Query Service | None |
| 4 | `datasets/owid.connector.ts` | Our World in Data | ETL REST API | None |
| 5 | `code/gitlab.connector.ts` | GitLab | REST API v4 | Optional token |
| 6 | `code/sourcegraph.connector.ts` | Sourcegraph | GraphQL | Optional token |
| 7 | `patents/epo.connector.ts` | EPO OPS | REST API | OAuth2 (stub if missing) |
| 8 | `docs/kubernetes.connector.ts` | Kubernetes Docs | GitHub contents API | None |
| 9 | `docs/microsoft-learn.connector.ts` | Microsoft Learn | GitHub contents API | None |
| 10 | `docs/python-docs.connector.ts` | Python Docs | docs.python.org scrape | None |
| 11 | `docs/openapi-directory.connector.ts` | APIs.guru OpenAPI Dir | GitHub API | None |
| 12 | `research/europepmc-extended.connector.ts` | Europe PMC (citations) | REST v3 citations endpoint | None |

---

### 2.1 Connector Code Blueprints

#### `src/connectors/literature/wikisource.connector.ts`
```typescript
// MediaWiki API: https://www.mediawiki.org/wiki/API:Main_page
// Endpoint: https://en.wikisource.org/w/api.php?action=query&list=search&srsearch={q}&format=json
@Injectable()
export class WikisourceConnector extends BaseConnector {
  readonly name = 'wikisource';
  readonly displayName = 'Wikisource';
  readonly category = ContentType.BOOK;
  readonly requiresApiKey = false;

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || '');
    const limit = query.limit || 10;
    const url = `https://en.wikisource.org/w/api.php?action=query&list=search` +
      `&srsearch=${q}&srlimit=${limit}&format=json&origin=*`;
    const data = await this.fetchWithTimeout<any>(url);
    return (data?.query?.search || []).map((item: any) => ({
      id: `wikisource:${item.pageid}`,
      title: item.title,
      authors: [{ name: 'Wikisource Community' }],
      description: item.snippet?.replace(/<[^>]+>/g, '') || 'Public domain text on Wikisource.',
      url: `https://en.wikisource.org/wiki/${encodeURIComponent(item.title)}`,
      publishedDate: undefined,
      contentType: ContentType.BOOK,
      sourceName: this.name,
      metadata: { pageid: item.pageid, wordcount: item.wordcount, license: 'CC BY-SA 4.0' },
    }));
  }
  // getMockResults() → 2 public domain classic books
}
```

#### `src/connectors/research/crossref.connector.ts`
```typescript
// Crossref REST API: https://api.crossref.org/works?query={q}&rows={limit}
// Free, no auth needed. Add User-Agent header for polite pool.
@Injectable()
export class CrossrefConnector extends BaseConnector {
  readonly name = 'crossref';
  readonly displayName = 'Crossref';
  readonly category = ContentType.PAPER;
  readonly requiresApiKey = false;

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || '');
    const limit = query.limit || 10;
    const url = `https://api.crossref.org/works?query=${q}&rows=${limit}` +
      `&select=DOI,title,author,abstract,published-print,URL,container-title,publisher`;
    // Set User-Agent for polite pool access
    const data = await this.fetchWithTimeout<any>(url, {
      'User-Agent': 'UniversalKnowledgeEngine/1.0 (mailto:contact@example.com)',
    });
    return (data?.message?.items || []).map((item: any) => ({
      id: `crossref:${item.DOI}`,
      title: Array.isArray(item.title) ? item.title[0] : item.title || 'Untitled',
      authors: (item.author || []).map((a: any) => ({
        name: [a.given, a.family].filter(Boolean).join(' '),
      })),
      description: item.abstract?.replace(/<[^>]+>/g, '') || 'No abstract available.',
      url: item.URL || `https://doi.org/${item.DOI}`,
      publishedDate: item['published-print']?.['date-parts']?.[0]?.[0]?.toString(),
      contentType: ContentType.PAPER,
      sourceName: this.name,
      metadata: {
        doi: item.DOI,
        journal: Array.isArray(item['container-title']) ? item['container-title'][0] : undefined,
        publisher: item.publisher,
        license: 'Open Access',
      },
    }));
  }
}
```

#### `src/connectors/datasets/wikidata.connector.ts`
```typescript
// Wikidata SPARQL: https://query.wikidata.org/sparql
// Query: search entities with labels matching query
@Injectable()
export class WikidataConnector extends BaseConnector {
  readonly name = 'wikidata';
  readonly displayName = 'Wikidata';
  readonly category = ContentType.DATASET;
  readonly requiresApiKey = false;

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || '');
    const sparql = encodeURIComponent(`
      SELECT ?item ?itemLabel ?itemDescription WHERE {
        SERVICE wikibase:mwapi {
          bd:serviceParam wikibase:api "EntitySearch";
                          wikibase:endpoint "www.wikidata.org";
                          mwapi:search "${query.q}";
                          mwapi:language "en".
          ?item wikibase:apiOutputItem mwapi:item.
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      } LIMIT ${query.limit || 10}`);
    const url = `https://query.wikidata.org/sparql?query=${sparql}&format=json`;
    const data = await this.fetchWithTimeout<any>(url, {
      'Accept': 'application/sparql-results+json',
      'User-Agent': 'UniversalKnowledgeEngine/1.0',
    });
    return (data?.results?.bindings || []).map((row: any) => {
      const qid = row.item?.value?.split('/').pop();
      return {
        id: `wikidata:${qid}`,
        title: row.itemLabel?.value || qid,
        authors: [{ name: 'Wikidata Contributors' }],
        description: row.itemDescription?.value || 'Wikidata structured knowledge entity.',
        url: row.item?.value || `https://www.wikidata.org/wiki/${qid}`,
        publishedDate: undefined,
        contentType: ContentType.DATASET,
        sourceName: this.name,
        metadata: { qid, license: 'CC0 1.0' },
      };
    });
  }
}
```

#### `src/connectors/datasets/owid.connector.ts`
```typescript
// Our World in Data ETL API: https://docs.owid.io/projects/etl/api/
// Endpoint: https://api.ourworldindata.org/v1/search?q={q}
@Injectable()
export class OwidConnector extends BaseConnector {
  readonly name = 'owid';
  readonly displayName = 'Our World in Data';
  readonly category = ContentType.DATASET;
  readonly requiresApiKey = false;

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || '');
    const url = `https://api.ourworldindata.org/v1/indicators.json?search=${q}&per_page=${query.limit || 10}`;
    const data = await this.fetchWithTimeout<any>(url);
    return (data?.indicators || []).map((item: any) => ({
      id: `owid:${item.id}`,
      title: item.name || item.title || 'Our World in Data indicator',
      authors: [{ name: 'Our World in Data' }],
      description: item.description || item.attribution || 'Global development and research indicator.',
      url: `https://ourworldindata.org/grapher/${item.slug || item.id}`,
      publishedDate: item.updatedAt?.substring(0, 10),
      contentType: ContentType.DATASET,
      sourceName: this.name,
      metadata: { license: 'CC BY 4.0', unit: item.unit, source: item.source?.name },
    }));
  }
}
```

#### `src/connectors/code/gitlab.connector.ts`
```typescript
// GitLab REST API v4: https://docs.gitlab.com/api/rest/
// Endpoint: https://gitlab.com/api/v4/projects?search={q}&order_by=star_count
@Injectable()
export class GitlabConnector extends BaseConnector {
  readonly name = 'gitlab';
  readonly displayName = 'GitLab';
  readonly category = ContentType.REPOSITORY;
  readonly requiresApiKey = false;   // Optional: GITLAB_TOKEN for higher rate limits

  protected getApiKey() { return process.env.GITLAB_TOKEN; }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || '');
    const limit = query.limit || 10;
    const url = `https://gitlab.com/api/v4/projects?search=${q}&order_by=star_count&per_page=${limit}`;
    const headers: Record<string, string> = {};
    const token = this.getApiKey();
    if (token) headers['PRIVATE-TOKEN'] = token;
    const data = await this.fetchWithTimeout<any[]>(url, headers);
    return (data || []).map((repo: any) => ({
      id: `gitlab:${repo.id}`,
      title: repo.name_with_namespace,
      authors: [{ name: repo.namespace?.name || 'Unknown' }],
      description: repo.description || 'Open-source GitLab repository.',
      url: repo.web_url,
      publishedDate: repo.created_at?.substring(0, 10),
      contentType: ContentType.REPOSITORY,
      sourceName: this.name,
      metadata: {
        stars: repo.star_count,
        forks: repo.forks_count,
        language: repo.predominant_language,
        license: repo.license?.name,
        visibility: repo.visibility,
      },
    }));
  }
}
```

#### `src/connectors/docs/kubernetes.connector.ts`
```typescript
// GitHub API: list Kubernetes docs directory, return page metadata
// Endpoint: https://api.github.com/repos/kubernetes/website/contents/content/en/docs
@Injectable()
export class KubernetesDocsConnector extends BaseConnector {
  readonly name = 'kubernetes-docs';
  readonly displayName = 'Kubernetes Documentation';
  readonly category = ContentType.DOCUMENTATION;
  readonly requiresApiKey = false;

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = (query.q || '').toLowerCase();
    const url = `https://api.github.com/search/code?q=${encodeURIComponent(q)}+repo:kubernetes/website+path:content/en/docs+language:markdown`;
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    const data = await this.fetchWithTimeout<any>(url, headers);
    return (data?.items || []).slice(0, query.limit || 10).map((item: any) => ({
      id: `kubernetes-docs:${item.sha}`,
      title: item.name?.replace('.md', '').replace(/-/g, ' '),
      authors: [{ name: 'Kubernetes Community' }],
      description: `Official Kubernetes documentation: ${item.path}`,
      url: `https://kubernetes.io/docs/${item.path.replace('content/en/docs/', '').replace('.md', '/')}`,
      publishedDate: undefined,
      contentType: ContentType.DOCUMENTATION,
      sourceName: this.name,
      metadata: { path: item.path, license: 'CC BY 4.0', repo: 'kubernetes/website' },
    }));
  }
}
```

#### `src/connectors/research/crossref-citations.connector.ts`
```typescript
// Crossref Citations endpoint: https://api.crossref.org/works/{doi}/transform/application/x-bibtex
// Used to enrich existing records with citation counts and forward references
@Injectable()
export class CrossrefCitationsConnector extends BaseConnector {
  readonly name = 'crossref-citations';
  readonly displayName = 'Crossref Citations';
  readonly category = ContentType.PAPER;
  readonly requiresApiKey = false;

  async getCitationCount(doi: string): Promise<number> {
    const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
    const data = await this.fetchWithTimeout<any>(url, {
      'User-Agent': 'UniversalKnowledgeEngine/1.0',
    });
    return data?.message?.['is-referenced-by-count'] || 0;
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    return []; // Used programmatically, not via search aggregator
  }
}
```

---

### 2.2 ContentType Enum Extension

**[MODIFY] `src/search/dto/content-type.enum.ts`**
```typescript
export enum ContentType {
  BOOK = 'book',
  PAPER = 'paper',
  DATASET = 'dataset',
  REPOSITORY = 'repository',   // already exists
  GOVERNMENT = 'government',
  DOCUMENTATION = 'documentation',
  PATENT = 'patent',
  // NEW:
  LITERATURE = 'literature',   // for Wikisource, Gutenberg
  CODE = 'code',               // alias for repos
  KNOWLEDGE = 'knowledge',     // for Wikidata
}
```

---

### 2.3 Extended SearchResultDto

**[MODIFY] `src/search/dto/search-result.dto.ts`** — Add 8 new optional fields:

```typescript
@ApiPropertyOptional() doi?: string;
@ApiPropertyOptional() isbn?: string;
@ApiPropertyOptional() language?: string;
@ApiPropertyOptional() license?: string;
@ApiPropertyOptional() tags?: string[];
@ApiPropertyOptional() downloadUrl?: string;
@ApiPropertyOptional() repositoryUrl?: string;
@ApiPropertyOptional() updatedDate?: string;
```

---

### 2.4 Register New Connectors

**[MODIFY] `src/connectors/connectors.module.ts`** — Add all new connectors to providers/exports.

**[MODIFY] `src/search/search-aggregator.service.ts`** — Inject and register all new connectors in the `connectors[]` array.

---

## Phase 3 — Hybrid Search Engine (PostgreSQL + pgvector)

### 3.1 Prerequisites

**[NEW] `docker-compose.full.yml`**
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: knowledge_db
      POSTGRES_USER: knowledge
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-knowledge_secret}
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
  
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  
  api:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://knowledge:knowledge_secret@postgres:5432/knowledge_db
      REDIS_HOST: redis
    depends_on: [postgres, redis]

volumes:
  pgdata:
```

**[MODIFY] `.env.example`** — Add:
```
DATABASE_URL=postgresql://knowledge:knowledge_secret@localhost:5432/knowledge_db
POSTGRES_PASSWORD=knowledge_secret
EMBEDDING_PROVIDER=ollama          # or openai
OLLAMA_HOST=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

---

### 3.2 New npm Dependencies

```bash
npm install @nestjs/typeorm typeorm pg pgvector bullmq @nestjs/bullmq
```

---

### 3.3 Database Entity

**[NEW] `src/database/entities/knowledge-item.entity.ts`**
```typescript
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('knowledge_items')
export class KnowledgeItemEntity {
  @PrimaryColumn('varchar', { length: 255 })
  id: string;                        // e.g. "arxiv:2104.12345"

  @Column('varchar', { length: 500 })
  @Index()
  title: string;

  @Column('jsonb', { nullable: true })
  authors: { name: string; orcid?: string }[];

  @Column('text', { nullable: true })
  description: string;

  @Column('varchar', { length: 1000 })
  url: string;

  @Column('varchar', { length: 100 })
  @Index()
  sourceName: string;

  @Column('varchar', { length: 50 })
  @Index()
  contentType: string;

  @Column('varchar', { length: 20, nullable: true })
  publishedDate: string;

  @Column('varchar', { length: 20, nullable: true })
  updatedDate: string;

  @Column('varchar', { length: 100, nullable: true })
  doi: string;

  @Column('varchar', { length: 50, nullable: true })
  isbn: string;

  @Column('varchar', { length: 50, nullable: true })
  language: string;

  @Column('varchar', { length: 200, nullable: true })
  license: string;

  @Column('text', { array: true, nullable: true })
  tags: string[];

  @Column('text', { nullable: true })
  downloadUrl: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  // pgvector column: 768-dim for nomic-embed-text, 1536 for OpenAI
  @Column({ type: 'vector', length: 768, nullable: true })
  embedding: number[];

  // Full-text search vector (auto-updated via trigger)
  @Column({ type: 'tsvector', nullable: true, select: false })
  searchVector: any;

  @Column('float', { default: 0 })
  citationCount: number;

  @CreateDateColumn()
  indexedAt: Date;

  @UpdateDateColumn()
  refreshedAt: Date;
}
```

---

### 3.4 Database Migration

**[NEW] `src/database/migrations/001_initial_schema.ts`**
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Main knowledge items table
CREATE TABLE knowledge_items (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  authors JSONB,
  description TEXT,
  url VARCHAR(1000) NOT NULL,
  source_name VARCHAR(100) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  published_date VARCHAR(20),
  updated_date VARCHAR(20),
  doi VARCHAR(100),
  isbn VARCHAR(50),
  language VARCHAR(50),
  license VARCHAR(200),
  tags TEXT[],
  download_url TEXT,
  metadata JSONB,
  embedding VECTOR(768),       -- nomic-embed-text dimension
  search_vector TSVECTOR,
  citation_count FLOAT DEFAULT 0,
  indexed_at TIMESTAMPTZ DEFAULT NOW(),
  refreshed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search
CREATE INDEX idx_ki_content_type ON knowledge_items(content_type);
CREATE INDEX idx_ki_source_name ON knowledge_items(source_name);
CREATE INDEX idx_ki_published ON knowledge_items(published_date);
CREATE INDEX idx_ki_fts ON knowledge_items USING GIN(search_vector);
CREATE INDEX idx_ki_embedding ON knowledge_items USING ivfflat(embedding vector_cosine_ops)
  WITH (lists = 100);

-- Auto-update search vector
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.doi, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_search_vector
  BEFORE INSERT OR UPDATE ON knowledge_items
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Collections
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  item_id VARCHAR(255) REFERENCES knowledge_items(id),
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.5 Hybrid Search Service

**[NEW] `src/search/hybrid-search.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeItemEntity } from '../database/entities/knowledge-item.entity';
import { EmbeddingService } from '../ai/services/embedding.service';
import { SearchQueryDto, SearchResultDto } from './dto';

export interface HybridSearchOptions {
  ftsWeight?: number;          // default 0.4
  vectorWeight?: number;       // default 0.6
  limit?: number;
  offset?: number;
  filters?: {
    contentType?: string;
    sourceName?: string;
    language?: string;
    license?: string;
    after?: string;
    before?: string;
  };
}

@Injectable()
export class HybridSearchService {
  private readonly logger = new Logger(HybridSearchService.name);

  constructor(
    @InjectRepository(KnowledgeItemEntity)
    private readonly repo: Repository<KnowledgeItemEntity>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Hybrid search: Reciprocal Rank Fusion of FTS + vector similarity
   */
  async search(query: SearchQueryDto, opts: HybridSearchOptions = {}): Promise<SearchResultDto[]> {
    const { ftsWeight = 0.4, vectorWeight = 0.6, limit = 20 } = opts;
    const q = query.q || '';

    // 1. Full-text search (PostgreSQL tsvector)
    const ftsResults = await this.fullTextSearch(q, opts);

    // 2. Vector similarity search (pgvector)
    let vectorResults: KnowledgeItemEntity[] = [];
    try {
      const embedding = await this.embeddingService.embed(q);
      vectorResults = await this.vectorSearch(embedding, opts);
    } catch (err: any) {
      this.logger.warn(`Vector search unavailable: ${err.message}. Using FTS only.`);
    }

    // 3. Reciprocal Rank Fusion
    const fused = this.reciprocalRankFusion(ftsResults, vectorResults, ftsWeight, vectorWeight);

    return fused.slice(0, limit).map(item => this.toDto(item));
  }

  private async fullTextSearch(q: string, opts: HybridSearchOptions): Promise<KnowledgeItemEntity[]> {
    let qb = this.repo.createQueryBuilder('ki')
      .where(`ki.search_vector @@ plainto_tsquery('english', :q)`, { q })
      .orderBy(`ts_rank(ki.search_vector, plainto_tsquery('english', :q))`, 'DESC');

    this.applyFilters(qb, opts);
    return qb.limit(opts.limit || 50).getMany();
  }

  private async vectorSearch(embedding: number[], opts: HybridSearchOptions): Promise<KnowledgeItemEntity[]> {
    const embeddingStr = `[${embedding.join(',')}]`;
    let qb = this.repo.createQueryBuilder('ki')
      .where('ki.embedding IS NOT NULL')
      .orderBy(`ki.embedding <=> '${embeddingStr}'::vector`, 'ASC');

    this.applyFilters(qb, opts);
    return qb.limit(opts.limit || 50).getMany();
  }

  private applyFilters(qb: any, opts: HybridSearchOptions) {
    const { filters } = opts;
    if (!filters) return;
    if (filters.contentType) qb.andWhere('ki.content_type = :ct', { ct: filters.contentType });
    if (filters.sourceName) qb.andWhere('ki.source_name = :src', { src: filters.sourceName });
    if (filters.language) qb.andWhere('ki.language = :lang', { lang: filters.language });
    if (filters.after) qb.andWhere('ki.published_date >= :after', { after: filters.after });
    if (filters.before) qb.andWhere('ki.published_date <= :before', { before: filters.before });
  }

  /**
   * Reciprocal Rank Fusion: score = Σ 1/(k + rank_i) weighted per list
   */
  private reciprocalRankFusion(
    ftsList: KnowledgeItemEntity[],
    vectorList: KnowledgeItemEntity[],
    ftsW: number,
    vecW: number,
    k = 60,
  ): KnowledgeItemEntity[] {
    const scores = new Map<string, { item: KnowledgeItemEntity; score: number }>();

    ftsList.forEach((item, rank) => {
      const s = scores.get(item.id) || { item, score: 0 };
      s.score += ftsW * (1 / (k + rank + 1));
      scores.set(item.id, s);
    });

    vectorList.forEach((item, rank) => {
      const s = scores.get(item.id) || { item, score: 0 };
      s.score += vecW * (1 / (k + rank + 1));
      scores.set(item.id, s);
    });

    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .map(v => v.item);
  }

  async upsert(result: SearchResultDto): Promise<void> {
    const entity = this.repo.create({
      id: result.id,
      title: result.title,
      authors: result.authors,
      description: result.description,
      url: result.url,
      sourceName: result.sourceName,
      contentType: result.contentType,
      publishedDate: result.publishedDate,
      metadata: result.metadata,
    });
    await this.repo.upsert(entity, ['id']);
  }

  private toDto(item: KnowledgeItemEntity): SearchResultDto {
    return {
      id: item.id,
      title: item.title,
      authors: item.authors || [],
      description: item.description || '',
      url: item.url,
      publishedDate: item.publishedDate,
      contentType: item.contentType as any,
      sourceName: item.sourceName,
      metadata: item.metadata,
    };
  }
}
```

---

## Phase 4 — AI / RAG Pipeline

### 4.1 Embedding Service (Ollama-first, OpenAI fallback)

**[NEW] `src/ai/services/embedding.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly provider: 'ollama' | 'openai';
  private readonly ollamaHost: string;
  private readonly ollamaModel: string;

  constructor() {
    this.provider = (process.env.EMBEDDING_PROVIDER as any) || 'ollama';
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
  }

  /**
   * Generate a 768-dim embedding for the given text.
   * Uses Ollama (local, free) by default; falls back to OpenAI.
   */
  async embed(text: string): Promise<number[]> {
    if (this.provider === 'openai') {
      return this.embedWithOpenAI(text);
    }
    return this.embedWithOllama(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Process in batches of 10 to avoid memory pressure
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += 10) {
      const batch = texts.slice(i, i + 10);
      const embeddings = await Promise.all(batch.map(t => this.embed(t)));
      results.push(...embeddings);
    }
    return results;
  }

  private async embedWithOllama(text: string): Promise<number[]> {
    const response = await fetch(`${this.ollamaHost}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.ollamaModel, prompt: text }),
    });
    if (!response.ok) throw new Error(`Ollama embedding failed: ${response.statusText}`);
    const data: any = await response.json();
    return data.embedding;
  }

  private async embedWithOpenAI(text: string): Promise<number[]> {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // OpenAI token limit guard
    });
    return response.data[0].embedding;
  }
}
```

---

### 4.2 RAG Service

**[NEW] `src/ai/services/rag.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { HybridSearchService } from '../../search/hybrid-search.service';
import { SearchResultDto, SearchQueryDto } from '../../search/dto';

export interface RAGResponse {
  answer: string;
  sources: RAGSource[];
  model: string;
  retrievedCount: number;
  warning?: string;
}

export interface RAGSource {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  relevanceSnippet: string;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly ollamaHost: string;
  private readonly chatModel: string;

  constructor(private readonly hybridSearch: HybridSearchService) {
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.chatModel = process.env.OLLAMA_CHAT_MODEL || 'mistral';
  }

  async ask(question: string, topK = 8): Promise<RAGResponse> {
    // 1. Retrieve relevant documents
    const query: SearchQueryDto = { q: question, limit: topK };
    const retrieved = await this.hybridSearch.search(query, {
      vectorWeight: 0.7,
      ftsWeight: 0.3,
      limit: topK,
    });

    if (retrieved.length === 0) {
      return {
        answer: 'No relevant documents found in the knowledge base for your question. Please try a different query or index more content first.',
        sources: [],
        model: this.chatModel,
        retrievedCount: 0,
        warning: 'No indexed documents matched the query.',
      };
    }

    // 2. Assemble context window
    const context = this.assembleContext(retrieved);

    // 3. Build RAG prompt
    const systemPrompt = `You are a research assistant with access to a curated knowledge base of academic papers, books, datasets, documentation, and patents.

RULES:
- Answer ONLY based on the provided context documents below.
- If the context does not contain enough information, clearly say "Based on the available sources, I cannot fully answer this."
- Always cite sources using [Source N] notation corresponding to the sources listed.
- Clearly distinguish: retrieved factual information vs your analytical synthesis.
- Never fabricate citations, statistics, or claims not present in the context.`;

    const userPrompt = `CONTEXT DOCUMENTS:
${context}

QUESTION: ${question}

Provide a comprehensive answer with source citations.`;

    // 4. Generate answer
    const answer = await this.generateAnswer(systemPrompt, userPrompt);

    // 5. Format sources
    const sources: RAGSource[] = retrieved.map((r, i) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      sourceName: r.sourceName,
      relevanceSnippet: r.description?.slice(0, 200) || '',
    }));

    return {
      answer,
      sources,
      model: this.chatModel,
      retrievedCount: retrieved.length,
    };
  }

  private assembleContext(results: SearchResultDto[]): string {
    return results.map((r, i) =>
      `[Source ${i + 1}] ${r.title}
Author(s): ${r.authors?.map(a => a.name).join(', ') || 'Unknown'}
Source: ${r.sourceName} | URL: ${r.url}
${r.description?.slice(0, 500) || '(no description available)'}`
    ).join('\n\n---\n\n');
  }

  private async generateAnswer(system: string, user: string): Promise<string> {
    // Try Ollama first (local, free)
    try {
      return await this.generateWithOllama(system, user);
    } catch (err: any) {
      this.logger.warn(`Ollama unavailable: ${err.message}. Trying OpenAI fallback.`);
    }

    // Fallback to OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== 'your_openai_api_key_here') {
      return this.generateWithOpenAI(system, user, apiKey);
    }

    return 'AI generation is unavailable. Please configure OLLAMA_HOST or OPENAI_API_KEY in your .env file.';
  }

  private async generateWithOllama(system: string, user: string): Promise<string> {
    const response = await fetch(`${this.ollamaHost}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.chatModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        stream: false,
        options: { temperature: 0.1 },  // low temp for factual accuracy
      }),
    });
    if (!response.ok) throw new Error(`Ollama chat failed: ${response.statusText}`);
    const data: any = await response.json();
    return data.message?.content || 'No response generated.';
  }

  private async generateWithOpenAI(system: string, user: string, apiKey: string): Promise<string> {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });
    return completion.choices[0].message.content || 'No response.';
  }
}
```

---

### 4.3 Updated AI Controller (Live RAG)

**[MODIFY] `src/ai/ai.controller.ts`** — Connect `/api/v1/ai/ask` to `RagService`:

```typescript
@Post('ask')
@ApiOperation({ summary: 'RAG-based question answering over the knowledge base' })
async ask(@Body() dto: AskDto): Promise<RAGResponse> {
  return this.ragService.ask(dto.question, dto.topK || 8);
}
```

---

### 4.4 Register New Modules in AppModule

**[MODIFY] `src/app.module.ts`**
```typescript
imports: [
  TypeOrmModule.forRoot({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [KnowledgeItemEntity, CollectionEntity, CollectionItemEntity],
    synchronize: process.env.NODE_ENV === 'development',
    logging: false,
  }),
  TypeOrmModule.forFeature([KnowledgeItemEntity]),
  BullModule.forRoot({ connection: { host: process.env.REDIS_HOST || 'localhost', port: 6379 } }),
  // ...existing modules
  DatabaseModule,
]
```

---

## Verification Plan

### Phase 2 — Connector Tests
```bash
npm test -- --testPathPattern=wikisource
npm test -- --testPathPattern=crossref
npm test -- --testPathPattern=wikidata
npm test -- --testPathPattern=gitlab
# All existing 64 tests must still pass:
npm test
```

### Phase 3 — Hybrid Search
```bash
# Start PostgreSQL with pgvector
docker compose -f docker-compose.full.yml up postgres -d

# Run migration
npm run migration:run

# Test hybrid search endpoint
curl -H "x-api-key: test" \
  "http://localhost:3000/api/v1/search?q=attention+mechanism&mode=hybrid"
# Expect: results scored by combined FTS + vector similarity
```

### Phase 4 — RAG Pipeline
```bash
# Start Ollama (local AI)
ollama pull nomic-embed-text
ollama pull mistral

# Test RAG ask endpoint
curl -X POST http://localhost:3000/api/v1/ai/ask \
  -H "Content-Type: application/json" \
  -H "x-api-key: test" \
  -d '{"question": "What is the transformer architecture?"}'
# Expect: answer with [Source N] citations + sources array
```

---

> [!IMPORTANT]
> **Execution order is strict**: Phase 2 (connectors) → Phase 3 (DB + hybrid search) → Phase 4 (RAG). 
> Phase 3 requires `DATABASE_URL` in `.env` and PostgreSQL running before `npm run build`.
