# Technical Specification & Analysis: Unified Schema & 7 Category Connectors (Milestone 2)

**Author:** Explorer Agent (`explorer_m2_1`)  
**Target Project:** Universal Open Knowledge Search Engine  
**Working Directory:** `d:\books\universal_search_engine\.agents\explorer_m2_1\`  
**Date:** 2026-08-02  

---

## Executive Summary

This report establishes the complete architectural design and technical specification for **Milestone 2: Unified Schema & 7 Category Connectors** of the Universal Open Knowledge Search Engine. The design defines:
1. Data Transfer Objects (DTOs) for unified search results, authors, query filtering, search responses, and resilience warnings with strict `class-validator` and `@nestjs/swagger` annotations.
2. A robust `BaseConnector` abstract contract enforcing uniform search interfaces, 5-second HTTP request timeouts, error catching, and fallback handling.
3. Detailed specifications for all **22 connectors** spanning **7 source categories** (Books, Research Papers, Datasets, Patents, Open-Source Repositories, Government Publications, Documentation), including API endpoints, parameter mappings, field normalization logic, and fallback mock behavior.
4. The `SearchAggregatorService` architecture utilizing `Promise.allSettled` for concurrent multi-source querying, category/source filtering, result aggregation, and partial failure warning capture.
5. A comprehensive unit test plan for schema normalization accuracy and connector failure resilience (`search-aggregator.service.spec.ts`, `connectors.spec.ts`).

---

## 1. Unified Search Schema & Query DTO Specifications

All DTOs reside in `src/common/dto/` and are decorated for runtime validation and Swagger documentation generation.

### 1.1 `ContentType` Enum / Union Type (`src/common/dto/content-type.enum.ts`)

```typescript
export enum ContentType {
  BOOK = 'book',
  PAPER = 'paper',
  DATASET = 'dataset',
  PATENT = 'patent',
  REPO = 'repo',
  GOV = 'gov',
  DOC = 'doc',
}
```

### 1.2 `AuthorDto` (`src/common/dto/author.dto.ts`)

Represents an author or contributor of a knowledge item.

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class AuthorDto {
  @ApiProperty({
    description: 'Full name of the author or contributing entity',
    example: 'Albert Einstein',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Institutional affiliation or organization',
    example: 'Institute for Advanced Study, Princeton',
  })
  @IsString()
  @IsOptional()
  affiliation?: string;
}
```

### 1.3 `SearchResultDto` (`src/common/dto/search-result.dto.ts`)

Normalized representation of search results across all 22 data sources.

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { AuthorDto } from './author.dto';
import { ContentType } from './content-type.enum';

export class SearchResultDto {
  @ApiProperty({
    description: 'Unique result identifier (formatted as {sourceName}:{sourceId})',
    example: 'arxiv:2104.12345',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Title of the publication, dataset, repo, or document',
    example: 'Attention Is All You Need',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'List of authors or contributors',
    type: [AuthorDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AuthorDto)
  authors: AuthorDto[];

  @ApiProperty({
    description: 'Abstract, description, or summary of the resource',
    example: 'We propose the Transformer, a model architecture based solely on attention mechanisms...',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Canonical URL to full resource or metadata page',
    example: 'https://arxiv.org/abs/1706.03762',
  })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    description: 'Publication or last modification date (ISO 8601 YYYY-MM-DD or YYYY format)',
    example: '2017-06-12',
  })
  @IsString()
  @IsOptional()
  publishedDate?: string;

  @ApiProperty({
    description: 'Resource category type',
    enum: ContentType,
    example: ContentType.PAPER,
  })
  @IsEnum(ContentType)
  contentType: ContentType;

  @ApiProperty({
    description: 'Source connector slug identifier',
    example: 'arxiv',
  })
  @IsString()
  @IsNotEmpty()
  sourceName: string;

  @ApiPropertyOptional({
    description: 'Relevance score computed by source or aggregator',
    example: 0.95,
  })
  @IsNumber()
  @IsOptional()
  score?: number;

  @ApiPropertyOptional({
    description: 'Source-specific metadata (DOI, ISBN, stars, licenses, download URLs, etc.)',
    example: { doi: '10.48550/arXiv.1706.03762', isMockFallback: false },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
```

### 1.4 `WarningDto` (`src/common/dto/warning.dto.ts`)

Captures partial failures or rate limits for individual source connectors without breaking the global response.

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class WarningDto {
  @ApiProperty({
    description: 'Slug identifier of the connector that generated the warning',
    example: 'core',
  })
  @IsString()
  @IsNotEmpty()
  sourceName: string;

  @ApiProperty({
    description: 'Descriptive message explaining the failure or fallback state',
    example: 'CORE API timeout after 5000ms. Fallback mock data provided.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
```

### 1.5 `SearchQueryDto` (`src/common/dto/search-query.dto.ts`)

Defines incoming HTTP GET `/api/v1/search` query parameters.

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ContentType } from './content-type.enum';

export class SearchQueryDto {
  @ApiPropertyOptional({
    description: 'Search query string',
    example: 'machine learning',
  })
  @IsString()
  @IsNotEmpty()
  q: string;

  @ApiPropertyOptional({
    description: 'Filter by content category',
    enum: ContentType,
    example: ContentType.PAPER,
  })
  @IsEnum(ContentType)
  @IsOptional()
  category?: ContentType;

  @ApiPropertyOptional({
    description: 'Filter by specific source connector name slug (e.g., openlibrary, arxiv, github)',
    example: 'arxiv',
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({
    description: 'Filter start date (YYYY-MM-DD or YYYY)',
    example: '2020-01-01',
  })
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter end date (YYYY-MM-DD or YYYY)',
    example: '2026-12-31',
  })
  @IsString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 10;
}
```

### 1.6 `SearchResponseDto` (`src/common/dto/search-response.dto.ts`)

Unified API response body returned by `SearchController`.

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsInt, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { SearchResultDto } from './search-result.dto';
import { WarningDto } from './warning.dto';

export class SearchResponseDto {
  @ApiProperty({
    description: 'Original query string',
    example: 'machine learning',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Total number of aggregated search results matching criteria',
    example: 42,
  })
  @IsInt()
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  @IsInt()
  page: number;

  @ApiProperty({
    description: 'Limit per page',
    example: 10,
  })
  @IsInt()
  limit: number;

  @ApiProperty({
    description: 'List of aggregated normalized search results',
    type: [SearchResultDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SearchResultDto)
  results: SearchResultDto[];

  @ApiPropertyOptional({
    description: 'List of warnings generated by connector failures or missing API keys',
    type: [WarningDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WarningDto)
  @IsOptional()
  warnings?: WarningDto[];
}
```

---

## 2. Base Connector Interface & Abstract Class Architecture

To maintain standard execution patterns across all 22 connectors, a base interface and abstract class are defined in `src/connectors/base/`.

### 2.1 Interface Definition (`src/connectors/base/base-connector.interface.ts`)

```typescript
import { ContentType } from '../../common/dto/content-type.enum';
import { SearchQueryDto } from '../../common/dto/search-query.dto';
import { SearchResultDto } from '../../common/dto/search-result.dto';
import { WarningDto } from '../../common/dto/warning.dto';

export interface ConnectorResult {
  results: SearchResultDto[];
  warning?: WarningDto;
}

export interface IBaseConnector {
  readonly name: string;
  readonly displayName: string;
  readonly category: ContentType;
  readonly requiresApiKey: boolean;

  search(query: SearchQueryDto): Promise<ConnectorResult>;
}
```

### 2.2 Abstract Base Class (`src/connectors/base/base-connector.abstract.ts`)

The abstract class handles:
- 5-second timeout enforcement via `axios` config or `rxjs` `timeout`.
- Error wrapping for API exceptions (HTTP 4xx, 5xx, network errors, timeouts).
- Automatic generation of `WarningDto` when API failures occur.
- Safe fallback mock response generation so search operational integrity is guaranteed.

```typescript
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { ContentType } from '../../common/dto/content-type.enum';
import { SearchQueryDto } from '../../common/dto/search-query.dto';
import { SearchResultDto } from '../../common/dto/search-result.dto';
import { WarningDto } from '../../common/dto/warning.dto';
import { IBaseConnector, ConnectorResult } from './base-connector.interface';

export abstract class BaseConnector implements IBaseConnector {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly category: ContentType;
  abstract readonly requiresApiKey: boolean;

  protected readonly logger = new Logger(this.constructor.name);
  protected readonly TIMEOUT_MS = 5000;

  constructor(protected readonly httpService?: HttpService) {}

  /**
   * Execute connector search with strict timeout and fallback resilience.
   */
  async search(query: SearchQueryDto): Promise<ConnectorResult> {
    try {
      const apiKey = this.getApiKey();
      if (this.requiresApiKey && !apiKey) {
        this.logger.warn(`Missing required API key for ${this.displayName}. Returning fallback mock data.`);
        return {
          results: this.getMockResults(query),
          warning: {
            sourceName: this.name,
            message: `API key missing for ${this.displayName}. Fallback mock results provided.`,
          },
        };
      }

      const results = await this.executeSearch(query);
      return { results };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Error executing ${this.displayName} search: ${errorMessage}`, error.stack);

      return {
        results: this.getMockResults(query),
        warning: {
          sourceName: this.name,
          message: `${this.displayName} search failed (${errorMessage}). Fallback mock results provided.`,
        },
      };
    }
  }

  protected getApiKey(): string | undefined {
    return undefined;
  }

  /**
   * Primary method implemented by subclasses to perform real HTTP requests and data normalization.
   */
  protected abstract executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]>;

  /**
   * Helper to perform HTTP GET requests with enforced 5s timeout.
   */
  protected async fetchWithTimeout<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
    if (!this.httpService) {
      throw new Error(`HttpService is not injected in ${this.displayName}`);
    }

    const response$ = this.httpService
      .get<T>(url, { headers, timeout: this.TIMEOUT_MS })
      .pipe(
        timeout(this.TIMEOUT_MS),
        catchError((err) => {
          throw new Error(`HTTP request to ${url} failed: ${err.message}`);
        }),
      );

    const response = await firstValueFrom(response$);
    return response.data;
  }

  /**
   * Fallback mock results generated when API fails or key is missing.
   */
  protected abstract getMockResults(query: SearchQueryDto): SearchResultDto[];
}
```

---

## 3. Specifications for All 22 Source Connectors Across 7 Categories

Each connector specification details:
- Connector Name & Slug ID
- API Endpoint URL & Parameter Mapping
- Field Normalization Logic (`id`, `title`, `authors`, `description`, `url`, `publishedDate`, `contentType`, `sourceName`, `metadata`)
- 5s Timeout & Mock/Fallback Behavior

---

### 3.1 Category 1: Books

#### 1. Open Library (`openlibrary`)
- **Class:** `OpenLibraryConnector` (`src/connectors/books/openlibrary.connector.ts`)
- **Category:** `ContentType.BOOK`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://openlibrary.org/search.json?q={q}&page={page}&limit={limit}`
- **Parameter Mapping:** `q` -> search terms, `page` -> `query.page`, `limit` -> `query.limit`.
- **Normalization Mapping:**
  - `id`: `'openlibrary:' + (doc.key ? doc.key.replace('/works/', '') : doc.edition_key?.[0] || uuid())`
  - `title`: `doc.title || 'Untitled Book'`
  - `authors`: `doc.author_name ? doc.author_name.map(name => ({ name })) : [{ name: 'Unknown Author' }]`
  - `description`: `doc.first_sentence?.[0] || doc.subtitle || 'Open Library public catalog entry.'`
  - `url`: `doc.key ? 'https://openlibrary.org' + doc.key : 'https://openlibrary.org'`
  - `publishedDate`: `doc.first_publish_year ? String(doc.first_publish_year) : undefined`
  - `contentType`: `ContentType.BOOK`
  - `sourceName`: `'openlibrary'`
  - `metadata`: `{ isbns: doc.isbn?.slice(0, 5), coverId: doc.cover_i, editionCount: doc.edition_count }`
- **Mock Fallback:** Returns 2 mock books (e.g. *"Structure and Interpretation of Computer Programs"*, *"Design Patterns"*) tagged with `sourceName: 'openlibrary'`.

#### 2. Project Gutenberg (`gutenberg`)
- **Class:** `GutenbergConnector` (`src/connectors/books/gutenberg.connector.ts`)
- **Category:** `ContentType.BOOK`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://gutendex.com/books/?search={q}&page={page}` (Gutendex Open API)
- **Parameter Mapping:** `search` -> `encodeURIComponent(query.q)`, `page` -> `query.page`.
- **Normalization Mapping:**
  - `id`: `'gutenberg:' + book.id`
  - `title`: `book.title`
  - `authors`: `book.authors.length ? book.authors.map(a => ({ name: a.name })) : [{ name: 'Anonymous' }]`
  - `description`: `book.subjects ? book.subjects.slice(0, 3).join('; ') : 'Public domain eBook from Project Gutenberg.'`
  - `url`: `book.formats['text/html'] || book.formats['text/plain'] || 'https://www.gutenberg.org/ebooks/' + book.id`
  - `publishedDate`: `undefined` (or year extracted from metadata)
  - `contentType`: `ContentType.BOOK`
  - `sourceName`: `'gutenberg'`
  - `metadata`: `{ downloads: book.download_count, languages: book.languages, formats: Object.keys(book.formats) }`
- **Mock Fallback:** Returns classic public domain books (e.g. *"Frankenstein by Mary Shelley"*).

#### 3. Google Books API (`googlebooks`)
- **Class:** `GoogleBooksConnector` (`src/connectors/books/googlebooks.connector.ts`)
- **Category:** `ContentType.BOOK`
- **Requires API Key:** `false` (Optional key via `GOOGLE_BOOKS_API_KEY`)
- **Endpoint Structure:** `https://www.googleapis.com/books/v1/volumes?q={q}&startIndex={offset}&maxResults={limit}`
- **Parameter Mapping:** `q` -> `query.q`, `startIndex` -> `(query.page - 1) * query.limit`, `maxResults` -> `query.limit`.
- **Normalization Mapping:**
  - `id`: `'googlebooks:' + item.id`
  - `title`: `item.volumeInfo.title`
  - `authors`: `item.volumeInfo.authors ? item.volumeInfo.authors.map(name => ({ name })) : [{ name: 'Unknown' }]`
  - `description`: `item.volumeInfo.description || 'Google Books entry.'`
  - `url`: `item.volumeInfo.infoLink || item.volumeInfo.canonicalVolumeLink`
  - `publishedDate`: `item.volumeInfo.publishedDate`
  - `contentType`: `ContentType.BOOK`
  - `sourceName`: `'googlebooks'`
  - `metadata`: `{ publisher: item.volumeInfo.publisher, pageCount: item.volumeInfo.pageCount, categories: item.volumeInfo.categories }`
- **Mock Fallback:** Returns mock Google Books entries.

#### 4. Internet Archive (`internetarchive`)
- **Class:** `InternetArchiveConnector` (`src/connectors/books/internetarchive.connector.ts`)
- **Category:** `ContentType.BOOK`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://archive.org/advancedsearch.php?q={q}+AND+mediatype:(texts)&fl[]=identifier,title,creator,description,date,publicdate&rows={limit}&page={page}&output=json`
- **Parameter Mapping:** `q` -> `${query.q} AND mediatype:(texts)`, `rows` -> `query.limit`, `page` -> `query.page`.
- **Normalization Mapping:**
  - `id`: `'internetarchive:' + doc.identifier`
  - `title`: `doc.title || doc.identifier`
  - `authors`: `doc.creator ? (Array.isArray(doc.creator) ? doc.creator.map(name => ({ name })) : [{ name: doc.creator }]) : [{ name: 'Internet Archive Contributor' }]`
  - `description`: `doc.description ? (Array.isArray(doc.description) ? doc.description[0] : doc.description) : 'Digitized text from Internet Archive.'`
  - `url`: `'https://archive.org/details/' + doc.identifier`
  - `publishedDate`: `doc.date || doc.publicdate`
  - `contentType`: `ContentType.BOOK`
  - `sourceName`: `'internetarchive'`
  - `metadata`: `{ identifier: doc.identifier, mediatype: 'texts' }`
- **Mock Fallback:** Returns mock Internet Archive book items.

---

### 3.2 Category 2: Research Papers

#### 5. OpenAlex (`openalex`)
- **Class:** `OpenAlexConnector` (`src/connectors/papers/openalex.connector.ts`)
- **Category:** `ContentType.PAPER`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://api.openalex.org/works?search={q}&per_page={limit}&page={page}`
- **Parameter Mapping:** `search` -> `query.q`, `per_page` -> `query.limit`, `page` -> `query.page`.
- **Normalization Mapping:**
  - `id`: `'openalex:' + work.id.replace('https://openalex.org/', '')`
  - `title`: `work.display_name || work.title`
  - `authors`: `work.authorships ? work.authorships.map(a => ({ name: a.author.display_name, affiliation: a.institutions?.[0]?.display_name })) : []`
  - `description`: `work.abstract_inverted_index ? reconstructAbstract(work.abstract_inverted_index) : 'OpenAlex paper metadata.'`
  - `url`: `work.primary_location?.landing_page_url || work.doi || 'https://openalex.org/' + work.id`
  - `publishedDate`: `work.publication_date || String(work.publication_year)`
  - `contentType`: `ContentType.PAPER`
  - `sourceName`: `'openalex'`
  - `metadata`: `{ doi: work.doi, citedByCount: work.cited_by_count, concepts: work.concepts?.slice(0, 5).map(c => c.display_name) }`
- **Mock Fallback:** Returns mock scholarly paper results.

#### 6. CORE (`core`)
- **Class:** `CoreConnector` (`src/connectors/papers/core.connector.ts`)
- **Category:** `ContentType.PAPER`
- **Requires API Key:** `true` (env: `CORE_API_KEY`)
- **Endpoint Structure:** `https://api.core.ac.uk/v3/search/works?q={q}&limit={limit}&offset={offset}`
- **Parameter Mapping:** `q` -> `query.q`, `limit` -> `query.limit`, `offset` -> `(query.page - 1) * query.limit`. Header: `Authorization: Bearer ${process.env.CORE_API_KEY}`.
- **Normalization Mapping:**
  - `id`: `'core:' + item.id`
  - `title`: `item.title`
  - `authors`: `item.authors ? item.authors.map(a => ({ name: a.name })) : []`
  - `description`: `item.abstract || 'CORE open access research paper.'`
  - `url`: `item.downloadUrl || item.canonicalUrl || 'https://core.ac.uk/works/' + item.id`
  - `publishedDate`: `item.publishedDate`
  - `contentType`: `ContentType.PAPER`
  - `sourceName`: `'core'`
  - `metadata`: `{ doi: item.doi, downloadUrl: item.downloadUrl, publisher: item.publisher }`
- **Mock Fallback:** If `CORE_API_KEY` is missing or API errors, returns mock CORE paper results with warning.

#### 7. Semantic Scholar (`semanticscholar`)
- **Class:** `SemanticScholarConnector` (`src/connectors/papers/semanticscholar.connector.ts`)
- **Category:** `ContentType.PAPER`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://api.semanticscholar.org/graph/v1/paper/search?query={q}&limit={limit}&offset={offset}&fields=paperId,title,abstract,authors,year,url,externalIds`
- **Parameter Mapping:** `query` -> `query.q`, `limit` -> `query.limit`, `offset` -> `(query.page - 1) * query.limit`.
- **Normalization Mapping:**
  - `id`: `'semanticscholar:' + item.paperId`
  - `title`: `item.title`
  - `authors`: `item.authors ? item.authors.map(a => ({ name: a.name })) : []`
  - `description`: `item.abstract || 'Semantic Scholar AI-indexed research paper.'`
  - `url`: `item.url || 'https://www.semanticscholar.org/paper/' + item.paperId`
  - `publishedDate`: `item.year ? String(item.year) : undefined`
  - `contentType`: `ContentType.PAPER`
  - `sourceName`: `'semanticscholar'`
  - `metadata`: `{ doi: item.externalIds?.DOI, arxivId: item.externalIds?.ArXiv }`
- **Mock Fallback:** Returns mock Semantic Scholar paper.

#### 8. arXiv (`arxiv`)
- **Class:** `ArxivConnector` (`src/connectors/papers/arxiv.connector.ts`)
- **Category:** `ContentType.PAPER`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://export.arxiv.org/api/query?search_query=all:{q}&start={offset}&max_results={limit}`
- **Parameter Mapping:** `search_query` -> `all:${query.q}`, `start` -> `(query.page - 1) * query.limit`, `max_results` -> `query.limit`.
- **Normalization Mapping:** (Parsed from XML response)
  - `id`: `'arxiv:' + extractArxivId(entry.id)`
  - `title`: `entry.title.replace(/\n/g, ' ').trim()`
  - `authors`: `entry.author ? (Array.isArray(entry.author) ? entry.author.map(a => ({ name: a.name })) : [{ name: entry.author.name }]) : []`
  - `description`: `entry.summary.replace(/\n/g, ' ').trim()`
  - `url`: `entry.id`
  - `publishedDate`: `entry.published?.substring(0, 10)`
  - `contentType`: `ContentType.PAPER`
  - `sourceName`: `'arxiv'`
  - `metadata`: `{ primaryCategory: entry['arxiv:primary_category']?.$.term, pdfUrl: entry.link.find(l => l.$.title === 'pdf')?.$.href }`
- **Mock Fallback:** Returns arXiv preprints (e.g. *"Deep Residual Learning for Image Recognition"*).

#### 9. PubMed (`pubmed`)
- **Class:** `PubMedConnector` (`src/connectors/papers/pubmed.connector.ts`)
- **Category:** `ContentType.PAPER`
- **Requires API Key:** `false`
- **Endpoint Structure:**
  1. `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={q}&retmode=json&retmax={limit}`
  2. `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id={ids}&retmode=json`
- **Parameter Mapping:** `term` -> `query.q`, `retmax` -> `query.limit`.
- **Normalization Mapping:**
  - `id`: `'pubmed:' + pmid`
  - `title`: `doc.title`
  - `authors`: `doc.authors ? doc.authors.map(a => ({ name: a.name })) : []`
  - `description`: `doc.source || 'Biomedical literature indexed by PubMed / NCBI.'`
  - `url`: `'https://pubmed.ncbi.nlm.nih.gov/' + pmid + '/'`
  - `publishedDate`: `doc.pubdate`
  - `contentType`: `ContentType.PAPER`
  - `sourceName`: `'pubmed'`
  - `metadata`: `{ pmid, journal: doc.source, volume: doc.volume, issue: doc.issue }`
- **Mock Fallback:** Returns PubMed medical paper mocks.

#### 10. Europe PMC (`europepmc`)
- **Class:** `EuropePmcConnector` (`src/connectors/papers/europepmc.connector.ts`)
- **Category:** `ContentType.PAPER`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query={q}&format=json&pageSize={limit}&page={page}`
- **Parameter Mapping:** `query` -> `query.q`, `pageSize` -> `query.limit`, `page` -> `query.page`.
- **Normalization Mapping:**
  - `id`: `'europepmc:' + item.id`
  - `title`: `item.title`
  - `authors`: `item.authorString ? item.authorString.split(', ').map(name => ({ name })) : []`
  - `description`: `item.abstractText || 'Life science article indexed by Europe PMC.'`
  - `url`: `'https://europepmc.org/article/' + item.source + '/' + item.id`
  - `publishedDate`: `item.firstPublicationDate`
  - `contentType`: `ContentType.PAPER`
  - `sourceName`: `'europepmc'`
  - `metadata`: `{ doi: item.doi, journal: item.journalTitle, pmcid: item.pmcid }`
- **Mock Fallback:** Returns Europe PMC article mocks.

#### 11. DOAJ - Directory of Open Access Journals (`doaj`)
- **Class:** `DoajConnector` (`src/connectors/papers/doaj.connector.ts`)
- **Category:** `ContentType.PAPER`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://doaj.org/api/v2/search/articles/{q}/{page}/{limit}`
- **Parameter Mapping:** `{q}` -> `encodeURIComponent(query.q)`, `{page}` -> `query.page`, `{limit}` -> `query.limit`.
- **Normalization Mapping:**
  - `id`: `'doaj:' + item.id`
  - `title`: `item.bibjson?.title`
  - `authors`: `item.bibjson?.author ? item.bibjson.author.map(a => ({ name: a.name, affiliation: a.affiliation })) : []`
  - `description`: `item.bibjson?.abstract || 'Peer-reviewed open access journal article from DOAJ.'`
  - `url`: `item.bibjson?.link?.find(l => l.type === 'fulltext')?.url || 'https://doaj.org/article/' + item.id`
  - `publishedDate`: `item.bibjson?.year ? String(item.bibjson.year) : undefined`
  - `contentType`: `ContentType.PAPER`
  - `sourceName`: `'doaj'`
  - `metadata`: `{ journal: item.bibjson?.journal?.title, publisher: item.bibjson?.journal?.publisher }`
- **Mock Fallback:** Returns DOAJ open access article mocks.

---

### 3.3 Category 3: Datasets

#### 12. Kaggle Metadata (`kaggle`)
- **Class:** `KaggleConnector` (`src/connectors/datasets/kaggle.connector.ts`)
- **Category:** `ContentType.DATASET`
- **Requires API Key:** `true` (env: `KAGGLE_USERNAME`, `KAGGLE_KEY`)
- **Endpoint Structure:** `https://www.kaggle.com/api/v1/datasets/list?search={q}&page={page}`
- **Parameter Mapping:** `search` -> `query.q`, `page` -> `query.page`. Basic Auth header: `Buffer.from(user:key).toString('base64')`.
- **Normalization Mapping:**
  - `id`: `'kaggle:' + dataset.ref`
  - `title`: `dataset.title`
  - `authors`: `[{ name: dataset.ownerName || dataset.ownerRef }]`
  - `description`: `dataset.description || 'Kaggle machine learning dataset.'`
  - `url`: `'https://www.kaggle.com/datasets/' + dataset.ref`
  - `publishedDate`: `dataset.lastUpdated`
  - `contentType`: `ContentType.DATASET`
  - `sourceName`: `'kaggle'`
  - `metadata`: `{ totalBytes: dataset.totalBytes, downloadCount: dataset.downloadCount, licenseName: dataset.licenseName }`
- **Mock Fallback:** If API credentials missing or request fails, returns mock Kaggle dataset (e.g. *"MNIST Handwritten Digits"*).

#### 13. Hugging Face Datasets (`huggingface`)
- **Class:** `HuggingFaceConnector` (`src/connectors/datasets/huggingface.connector.ts`)
- **Category:** `ContentType.DATASET`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://huggingface.co/api/datasets?search={q}&limit={limit}`
- **Parameter Mapping:** `search` -> `query.q`, `limit` -> `query.limit`.
- **Normalization Mapping:**
  - `id`: `'huggingface:' + item.id`
  - `title`: `item.id`
  - `authors`: `[{ name: item.author || item.id.split('/')[0] }]`
  - `description`: `item.description || 'Hugging Face dataset repository.'`
  - `url`: `'https://huggingface.co/datasets/' + item.id`
  - `publishedDate`: `item.lastModified`
  - `contentType`: `ContentType.DATASET`
  - `sourceName`: `'huggingface'`
  - `metadata`: `{ downloads: item.downloads, likes: item.likes, tags: item.tags?.slice(0, 5) }`
- **Mock Fallback:** Returns Hugging Face dataset mocks (e.g. *"squad"*, *"common_voice"*).

#### 14. Data.gov (`datagov`)
- **Class:** `DataGovConnector` (`src/connectors/datasets/datagov.connector.ts`)
- **Category:** `ContentType.DATASET`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://catalog.data.gov/api/3/action/package_search?q={q}&rows={limit}&start={offset}`
- **Parameter Mapping:** `q` -> `query.q`, `rows` -> `query.limit`, `start` -> `(query.page - 1) * query.limit`.
- **Normalization Mapping:**
  - `id`: `'datagov:' + item.id`
  - `title`: `item.title`
  - `authors`: `[{ name: item.author || item.organization?.title || 'U.S. Government' }]`
  - `description`: `item.notes || 'Open data package from Data.gov.'`
  - `url`: `'https://catalog.data.gov/dataset/' + (item.name || item.id)`
  - `publishedDate`: `item.metadata_modified || item.metadata_created`
  - `contentType`: `ContentType.DATASET`
  - `sourceName`: `'datagov'`
  - `metadata`: `{ publisher: item.organization?.title, resourcesCount: item.resources?.length }`
- **Mock Fallback:** Returns Data.gov government dataset mocks.

#### 15. Zenodo (`zenodo`)
- **Class:** `ZenodoConnector` (`src/connectors/datasets/zenodo.connector.ts`)
- **Category:** `ContentType.DATASET`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://zenodo.org/api/records/?q={q}&size={limit}&page={page}`
- **Parameter Mapping:** `q` -> `query.q`, `size` -> `query.limit`, `page` -> `query.page`.
- **Normalization Mapping:**
  - `id`: `'zenodo:' + hit.id`
  - `title`: `hit.metadata.title`
  - `authors`: `hit.metadata.creators ? hit.metadata.creators.map(c => ({ name: c.name, affiliation: c.affiliation })) : []`
  - `description`: `hit.metadata.description ? stripHtmlTags(hit.metadata.description) : 'Open research artifact on Zenodo.'`
  - `url`: `hit.links.html || 'https://zenodo.org/record/' + hit.id`
  - `publishedDate`: `hit.metadata.publication_date`
  - `contentType`: `ContentType.DATASET`
  - `sourceName`: `'zenodo'`
  - `metadata`: `{ doi: hit.doi, resourceType: hit.metadata.resource_type?.type, accessRight: hit.metadata.access_right }`
- **Mock Fallback:** Returns Zenodo open dataset mocks.

---

### 3.4 Category 4: Patents

#### 16. Google Patents (`googlepatents`)
- **Class:** `GooglePatentsConnector` (`src/connectors/patents/googlepatents.connector.ts`)
- **Category:** `ContentType.PATENT`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://patents.google.com/xhr/query?url=q%3D{q}` or Public Search API endpoint.
- **Parameter Mapping:** `q` -> `query.q`.
- **Normalization Mapping:**
  - `id`: `'googlepatents:' + patent.patentNumber`
  - `title`: `patent.title`
  - `authors`: `patent.inventors ? patent.inventors.map(name => ({ name })) : [{ name: 'Assignee / Inventor' }]`
  - `description`: `patent.abstract || 'Google Patents indexed patent specification.'`
  - `url`: `'https://patents.google.com/patent/' + patent.patentNumber + '/en'`
  - `publishedDate`: `patent.publicationDate`
  - `contentType`: `ContentType.PATENT`
  - `sourceName`: `'googlepatents'`
  - `metadata`: `{ assignee: patent.assignee, country: patent.countryCode }`
- **Mock Fallback:** Returns Google Patents mocks (e.g. *"System and Method for Distributed Machine Learning"*).

#### 17. USPTO (`uspto`)
- **Class:** `UsptoConnector` (`src/connectors/patents/uspto.connector.ts`)
- **Category:** `ContentType.PATENT`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://developer.uspto.gov/ibd-api/v1/patent/application?searchText={q}&rows={limit}`
- **Parameter Mapping:** `searchText` -> `query.q`, `rows` -> `query.limit`.
- **Normalization Mapping:**
  - `id`: `'uspto:' + doc.applicationNumberText`
  - `title`: `doc.inventionTitle`
  - `authors`: `doc.inventorNameArrayText ? doc.inventorNameArrayText.map(name => ({ name })) : [{ name: 'USPTO Inventor' }]`
  - `description`: `doc.abstractText ? doc.abstractText[0] : 'U.S. Patent and Trademark Office application.'`
  - `url`: `'https://patentcenter.uspto.gov/applications/' + doc.applicationNumberText`
  - `publishedDate`: `doc.publicationDate`
  - `contentType`: `ContentType.PATENT`
  - `sourceName`: `'uspto'`
  - `metadata`: `{ applicationNumber: doc.applicationNumberText, filingDate: doc.filingDate }`
- **Mock Fallback:** Returns USPTO application mocks.

#### 18. WIPO - World Intellectual Property Organization (`wipo`)
- **Class:** `WipoConnector` (`src/connectors/patents/wipo.connector.ts`)
- **Category:** `ContentType.PATENT`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://patentscope.wipo.int/search/rest/v1/search?q={q}`
- **Parameter Mapping:** `q` -> `query.q`.
- **Normalization Mapping:**
  - `id`: `'wipo:' + item.id`
  - `title`: `item.title`
  - `authors`: `item.applicants ? item.applicants.map(name => ({ name })) : [{ name: 'WIPO Applicant' }]`
  - `description`: `item.abstract || 'WIPO Patentscope international patent publication.'`
  - `url`: `'https://patentscope.wipo.int/search/en/detail.jsf?docId=' + item.id`
  - `publishedDate`: `item.publicationDate`
  - `contentType`: `ContentType.PATENT`
  - `sourceName`: `'wipo'`
  - `metadata`: `{ internationalAppNumber: item.pctNumber, publicationNumber: item.pubNumber }`
- **Mock Fallback:** Returns WIPO international patent mocks.

---

### 3.5 Category 5: Open-Source Repositories

#### 19. GitHub (`github`)
- **Class:** `GithubConnector` (`src/connectors/repos/github.connector.ts`)
- **Category:** `ContentType.REPO`
- **Requires API Key:** `false` (Optional token via `GITHUB_TOKEN`)
- **Endpoint Structure:** `https://api.github.com/search/repositories?q={q}&per_page={limit}&page={page}`
- **Parameter Mapping:** `q` -> `query.q`, `per_page` -> `query.limit`, `page` -> `query.page`. Optional header: `Authorization: Bearer ${process.env.GITHUB_TOKEN}`.
- **Normalization Mapping:**
  - `id`: `'github:' + repo.full_name`
  - `title`: `repo.full_name`
  - `authors`: `[{ name: repo.owner.login }]`
  - `description`: `repo.description || 'Open source repository on GitHub.'`
  - `url`: `repo.html_url`
  - `publishedDate`: `repo.pushed_at || repo.created_at`
  - `contentType`: `ContentType.REPO`
  - `sourceName`: `'github'`
  - `metadata`: `{ stars: repo.stargazers_count, forks: repo.forks_count, language: repo.language, license: repo.license?.spdx_id }`
- **Mock Fallback:** Returns GitHub open source repo mocks (e.g. *"tensorflow/tensorflow"*).

---

### 3.6 Category 6: Government Publications

#### 20. NASA Technical Reports (`nasa`)
- **Class:** `NasaConnector` (`src/connectors/gov/nasa.connector.ts`)
- **Category:** `ContentType.GOV`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://ntrs.nasa.gov/api/citations/search?q={q}&page.size={limit}`
- **Parameter Mapping:** `q` -> `query.q`, `page.size` -> `query.limit`.
- **Normalization Mapping:**
  - `id`: `'nasa:' + item.id`
  - `title`: `item.title`
  - `authors`: `item.authorAffiliations ? item.authorAffiliations.map(a => ({ name: a.meta?.author?.name || 'NASA Author', affiliation: a.meta?.organization?.name })) : [{ name: 'NASA' }]`
  - `description`: `item.abstract || 'NASA Technical Reports Server (NTRS) scientific publication.'`
  - `url`: `'https://ntrs.nasa.gov/citations/' + item.id`
  - `publishedDate`: `item.issueDate || item.publicationDate`
  - `contentType`: `ContentType.GOV`
  - `sourceName`: `'nasa'`
  - `metadata`: `{ center: item.center?.name, subjectCategories: item.subjectCategories }`
- **Mock Fallback:** Returns NASA technical report mocks (e.g. *"Apollo Guidance Computer Architecture"*).

#### 21. World Bank Open Data (`worldbank`)
- **Class:** `WorldBankConnector` (`src/connectors/gov/worldbank.connector.ts`)
- **Category:** `ContentType.GOV`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://api.worldbank.org/v2/documentSearch?qterm={q}&format=json&rows={limit}`
- **Parameter Mapping:** `qterm` -> `query.q`, `rows` -> `query.limit`.
- **Normalization Mapping:**
  - `id`: `'worldbank:' + doc.id`
  - `title`: `doc.display_title || doc.docdt`
  - `authors`: `doc.authors?.author ? (Array.isArray(doc.authors.author) ? doc.authors.author.map(name => ({ name })) : [{ name: doc.authors.author }]) : [{ name: 'World Bank Group' }]`
  - `description`: `doc.abstract || 'World Bank public knowledge and economic research document.'`
  - `url`: `doc.pdfurl || doc.guid || 'https://documents.worldbank.org/'`
  - `publishedDate`: `doc.docdt`
  - `contentType`: `ContentType.GOV`
  - `sourceName`: `'worldbank'`
  - `metadata`: `{ country: doc.count, docType: doc.docty }`
- **Mock Fallback:** Returns World Bank economic document mocks.

---

### 3.7 Category 7: Documentation

#### 22. MDN Web Docs (`mdn`)
- **Class:** `MdnConnector` (`src/connectors/docs/mdn.connector.ts`)
- **Category:** `ContentType.DOC`
- **Requires API Key:** `false`
- **Endpoint Structure:** `https://developer.mozilla.org/api/v1/search?q={q}&locale=en-US`
- **Parameter Mapping:** `q` -> `query.q`.
- **Normalization Mapping:**
  - `id`: `'mdn:' + (doc.slug || doc.mdn_url)`
  - `title`: `doc.title`
  - `authors`: `[{ name: 'MDN Web Docs Contributors' }]`
  - `description`: `doc.summary || 'Mozilla Developer Network web standards documentation.'`
  - `url`: `'https://developer.mozilla.org' + doc.mdn_url`
  - `publishedDate`: `undefined`
  - `contentType`: `ContentType.DOC`
  - `sourceName`: `'mdn'`
  - `metadata`: `{ locale: doc.locale, score: doc.score }`
- **Mock Fallback:** Returns MDN Web Docs mocks (e.g. *"Array.prototype.map() - JavaScript | MDN"*).

---

## 4. `SearchAggregatorService` Architectural Design

The `SearchAggregatorService` orchestrates execution across registered connectors, implements selection filtering, handles concurrent requests safely using `Promise.allSettled`, aggregates results, and collects error warnings.

### 4.1 Implementation Design (`src/search/search-aggregator.service.ts`)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { SearchQueryDto } from '../common/dto/search-query.dto';
import { SearchResponseDto } from '../common/dto/search-response.dto';
import { SearchResultDto } from '../common/dto/search-result.dto';
import { WarningDto } from '../common/dto/warning.dto';
import { IBaseConnector, ConnectorResult } from '../connectors/base/base-connector.interface';
import { OpenLibraryConnector } from '../connectors/books/openlibrary.connector';
import { GutenbergConnector } from '../connectors/books/gutenberg.connector';
import { GoogleBooksConnector } from '../connectors/books/googlebooks.connector';
import { InternetArchiveConnector } from '../connectors/books/internetarchive.connector';
import { OpenAlexConnector } from '../connectors/papers/openalex.connector';
import { CoreConnector } from '../connectors/papers/core.connector';
import { SemanticScholarConnector } from '../connectors/papers/semanticscholar.connector';
import { ArxivConnector } from '../connectors/papers/arxiv.connector';
import { PubMedConnector } from '../connectors/papers/pubmed.connector';
import { EuropePmcConnector } from '../connectors/papers/europepmc.connector';
import { DoajConnector } from '../connectors/papers/doaj.connector';
import { KaggleConnector } from '../connectors/datasets/kaggle.connector';
import { HuggingFaceConnector } from '../connectors/datasets/huggingface.connector';
import { DataGovConnector } from '../connectors/datasets/datagov.connector';
import { ZenodoConnector } from '../connectors/datasets/zenodo.connector';
import { GooglePatentsConnector } from '../connectors/patents/googlepatents.connector';
import { UsptoConnector } from '../connectors/patents/uspto.connector';
import { WipoConnector } from '../connectors/patents/wipo.connector';
import { GithubConnector } from '../connectors/repos/github.connector';
import { NasaConnector } from '../connectors/gov/nasa.connector';
import { WorldBankConnector } from '../connectors/gov/worldbank.connector';
import { MdnConnector } from '../connectors/docs/mdn.connector';

@Injectable()
export class SearchAggregatorService {
  private readonly logger = new Logger(SearchAggregatorService.name);
  private readonly connectors: IBaseConnector[];

  constructor(
    openLibrary: OpenLibraryConnector,
    gutenberg: GutenbergConnector,
    googleBooks: GoogleBooksConnector,
    internetArchive: InternetArchiveConnector,
    openAlex: OpenAlexConnector,
    core: CoreConnector,
    semanticScholar: SemanticScholarConnector,
    arxiv: ArxivConnector,
    pubMed: PubMedConnector,
    europePmc: EuropePmcConnector,
    doaj: DoajConnector,
    kaggle: KaggleConnector,
    huggingFace: HuggingFaceConnector,
    dataGov: DataGovConnector,
    zenodo: ZenodoConnector,
    googlePatents: GooglePatentsConnector,
    uspto: UsptoConnector,
    wipo: WipoConnector,
    github: GithubConnector,
    nasa: NasaConnector,
    worldBank: WorldBankConnector,
    mdn: MdnConnector,
  ) {
    this.connectors = [
      openLibrary,
      gutenberg,
      googleBooks,
      internetArchive,
      openAlex,
      core,
      semanticScholar,
      arxiv,
      pubMed,
      europePmc,
      doaj,
      kaggle,
      huggingFace,
      dataGov,
      zenodo,
      googlePatents,
      uspto,
      wipo,
      github,
      nasa,
      worldBank,
      mdn,
    ];
  }

  /**
   * Execute search across matching connectors in parallel using Promise.allSettled.
   */
  async search(query: SearchQueryDto): Promise<SearchResponseDto> {
    const targetConnectors = this.filterConnectors(query);

    this.logger.log(
      `Executing search for query="${query.q}" across ${targetConnectors.length} connectors`,
    );

    const promises = targetConnectors.map((connector) => connector.search(query));
    const settledResults = await Promise.allSettled(promises);

    const allResults: SearchResultDto[] = [];
    const warnings: WarningDto[] = [];

    settledResults.forEach((result, index) => {
      const connector = targetConnectors[index];

      if (result.status === 'fulfilled') {
        const { results, warning } = result.value;
        allResults.push(...results);
        if (warning) {
          warnings.push(warning);
        }
      } else {
        this.logger.error(
          `Connector ${connector.displayName} rejected: ${result.reason}`,
        );
        warnings.push({
          sourceName: connector.name,
          message: `Connector ${connector.displayName} failed to respond (${result.reason?.message || 'Rejected'}).`,
        });
      }
    });

    // Deduplicate results by ID
    const uniqueResultsMap = new Map<string, SearchResultDto>();
    for (const item of allResults) {
      if (!uniqueResultsMap.has(item.id)) {
        uniqueResultsMap.set(item.id, item);
      }
    }
    const deduplicatedResults = Array.from(uniqueResultsMap.values());

    // Apply pagination
    const total = deduplicatedResults.length;
    const page = query.page || 1;
    const limit = query.limit || 10;
    const startIndex = (page - 1) * limit;
    const paginatedResults = deduplicatedResults.slice(startIndex, startIndex + limit);

    return {
      query: query.q,
      total,
      page,
      limit,
      results: paginatedResults,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Filter active connectors based on query parameters (category & source).
   */
  private filterConnectors(query: SearchQueryDto): IBaseConnector[] {
    return this.connectors.filter((connector) => {
      if (query.category && connector.category !== query.category) {
        return false;
      }
      if (query.source && connector.name.toLowerCase() !== query.source.toLowerCase()) {
        return false;
      }
      return true;
    });
  }
}
```

---

## 5. Module Wireup Plan

### 5.1 `ConnectorsModule` (`src/connectors/connectors.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenLibraryConnector } from './books/openlibrary.connector';
import { GutenbergConnector } from './books/gutenberg.connector';
import { GoogleBooksConnector } from './books/googlebooks.connector';
import { InternetArchiveConnector } from './books/internetarchive.connector';
import { OpenAlexConnector } from './papers/openalex.connector';
import { CoreConnector } from './papers/core.connector';
import { SemanticScholarConnector } from './papers/semanticscholar.connector';
import { ArxivConnector } from './papers/arxiv.connector';
import { PubMedConnector } from './papers/pubmed.connector';
import { EuropePmcConnector } from './papers/europepmc.connector';
import { DoajConnector } from './papers/doaj.connector';
import { KaggleConnector } from './datasets/kaggle.connector';
import { HuggingFaceConnector } from './datasets/huggingface.connector';
import { DataGovConnector } from './datasets/datagov.connector';
import { ZenodoConnector } from './datasets/zenodo.connector';
import { GooglePatentsConnector } from './patents/googlepatents.connector';
import { UsptoConnector } from './patents/uspto.connector';
import { WipoConnector } from './patents/wipo.connector';
import { GithubConnector } from './repos/github.connector';
import { NasaConnector } from './gov/nasa.connector';
import { WorldBankConnector } from './gov/worldbank.connector';
import { MdnConnector } from './docs/mdn.connector';

const CONNECTORS = [
  OpenLibraryConnector,
  GutenbergConnector,
  GoogleBooksConnector,
  InternetArchiveConnector,
  OpenAlexConnector,
  CoreConnector,
  SemanticScholarConnector,
  ArxivConnector,
  PubMedConnector,
  EuropePmcConnector,
  DoajConnector,
  KaggleConnector,
  HuggingFaceConnector,
  DataGovConnector,
  ZenodoConnector,
  GooglePatentsConnector,
  UsptoConnector,
  WipoConnector,
  GithubConnector,
  NasaConnector,
  WorldBankConnector,
  MdnConnector,
];

@Module({
  imports: [HttpModule],
  providers: [...CONNECTORS],
  exports: [...CONNECTORS],
})
export class ConnectorsModule {}
```

### 5.2 `SearchModule` (`src/search/search.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { ConnectorsModule } from '../connectors/connectors.module';
import { SearchAggregatorService } from './search-aggregator.service';
import { SearchController } from './search.controller';

@Module({
  imports: [ConnectorsModule],
  controllers: [SearchController],
  providers: [SearchAggregatorService],
  exports: [SearchAggregatorService],
})
export class SearchModule {}
```

---

## 6. Comprehensive Unit Testing Strategy

The test suite validates schema normalization, timeout protection, and parallel fault-tolerant aggregation.

### 6.1 `connectors.spec.ts` (Connector Normalization & Resiliency Tests)

- **Test Suite 1: Category 1 Books Connectors**
  - Verify Open Library normalizes `doc` items to `SearchResultDto` with `openlibrary:` ID prefix.
  - Verify Gutendex response mapping for Project Gutenberg.
  - Verify Google Books response with missing optional fields handled cleanly.
  - Verify Internet Archive JSON response mapping.

- **Test Suite 2: Category 2 Papers Connectors**
  - Verify OpenAlex inverted abstract index reconstruction.
  - Verify CORE API key missing condition triggers mock fallback and populates `WarningDto`.
  - Verify arXiv XML-to-JSON parsing normalization.
  - Verify PubMed dual-endpoint lookup normalization.

- **Test Suite 3: Categories 3-7 Datasets, Patents, Repos, Gov, Docs**
  - Verify Hugging Face, Kaggle, Zenodo, Data.gov dataset field mapping.
  - Verify USPTO, Google Patents, WIPO patent field mapping.
  - Verify GitHub repository stargazers, languages, and repo URLs.
  - Verify NASA NTRS and World Bank document normalization.
  - Verify MDN Web Docs summary and URL resolution.

- **Test Suite 4: Timeout & Fault Tolerance**
  - Mock `HttpService.get` to delay response by 6000ms. Assert `BaseConnector` catches timeout and returns mock fallback + warning.
  - Mock `HttpService.get` to throw HTTP 500 / 429 errors. Assert exception handled gracefully with mock fallback.

### 6.2 `search-aggregator.service.spec.ts` (Aggregator Parallel Execution & Filtering Tests)

- **Test 1: Full Multi-Source Search**
  - Execute `search({ q: 'artificial intelligence' })`.
  - Assert all 22 connectors are executed via `Promise.allSettled`.
  - Assert results contain items from multiple content categories (`book`, `paper`, `dataset`, `patent`, `repo`, `gov`, `doc`).

- **Test 2: Category Filter Execution**
  - Execute `search({ q: 'quantum', category: ContentType.PAPER })`.
  - Assert only the 7 paper connectors are executed; all result items have `contentType === 'paper'`.

- **Test 3: Source Filter Execution**
  - Execute `search({ q: 'relativity', source: 'arxiv' })`.
  - Assert only `ArxivConnector` is executed; results contain only `arxiv` items.

- **Test 4: Partial Failure Resilience**
  - Mock 3 connectors to reject or generate warnings.
  - Assert `search()` returns status 200 equivalent response object.
  - Assert `warnings` array contains 3 entries matching failed sources.
  - Assert `results` array contains valid normalized results from the remaining 19 successful connectors.

- **Test 5: Pagination Slicing**
  - Mock 30 total aggregated items across connectors.
  - Execute `search({ q: 'test', page: 2, limit: 10 })`.
  - Assert `total === 30`, `page === 2`, `limit === 10`, and `results.length === 10`.

---

## 7. Verification Method

To verify implementation accuracy after development:
1. **Compilation Check:**
   `npm run build`
2. **Unit Test Execution:**
   `npm run test` or `npx jest src/connectors/connectors.spec.ts src/search/search-aggregator.service.spec.ts`
3. **Endpoint Swagger Inspection:**
   Start server (`npm run start`) and open `http://localhost:3000/api/docs` to verify `/api/v1/search` parameters and schemas.
4. **Resilience Verification:**
   Query `http://localhost:3000/api/v1/search?q=machine+learning` without external network access or with invalid API keys to confirm that response returns HTTP 200 with partial mock results and a non-empty `warnings` array.

---
