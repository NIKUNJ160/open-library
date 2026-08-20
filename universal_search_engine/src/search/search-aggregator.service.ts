import { Injectable, Logger } from '@nestjs/common';
import {
  ContentType,
  SearchQueryDto,
  SearchResponseDto,
  SearchResultDto,
  WarningDto,
} from './dto';
import { IBaseConnector } from '../connectors/base/base-connector.interface';
import { parseAdvancedQuery } from './utils/query-parser.util';

// ── Existing Connectors (Phase 1) ────────────────────────────────────────────
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

// ── Phase 2 New Connectors ───────────────────────────────────────────────────
import { WikisourceConnector } from '../connectors/literature/wikisource.connector';
import { CrossrefConnector } from '../connectors/research/crossref.connector';
import { WikidataConnector } from '../connectors/datasets/wikidata.connector';
import { OwidConnector } from '../connectors/datasets/owid.connector';
import { GitlabConnector } from '../connectors/code/gitlab.connector';
import { SourcegraphConnector } from '../connectors/code/sourcegraph.connector';
import { EpoConnector } from '../connectors/patents/epo.connector';
import { KubernetesDocsConnector } from '../connectors/docs/kubernetes.connector';
import { MicrosoftLearnConnector } from '../connectors/docs/microsoft-learn.connector';
import { PythonDocsConnector } from '../connectors/docs/python-docs.connector';
import { OpenApiDirectoryConnector } from '../connectors/docs/openapi-directory.connector';

@Injectable()
export class SearchAggregatorService {
  private readonly logger = new Logger(SearchAggregatorService.name);
  private readonly connectors: IBaseConnector[];

  constructor(
    // Phase 1 connectors
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
    // Phase 2 connectors
    wikisource: WikisourceConnector,
    crossref: CrossrefConnector,
    wikidata: WikidataConnector,
    owid: OwidConnector,
    gitlab: GitlabConnector,
    sourcegraph: SourcegraphConnector,
    epo: EpoConnector,
    kubernetesDocs: KubernetesDocsConnector,
    microsoftLearn: MicrosoftLearnConnector,
    pythonDocs: PythonDocsConnector,
    openApiDirectory: OpenApiDirectoryConnector,
  ) {
    this.connectors = [
      // Phase 1
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
      // Phase 2
      wikisource,
      crossref,
      wikidata,
      owid,
      gitlab,
      sourcegraph,
      epo,
      kubernetesDocs,
      microsoftLearn,
      pythonDocs,
      openApiDirectory,
    ];
  }

  /**
   * Return list of registered connectors.
   */
  getRegisteredConnectors(): IBaseConnector[] {
    return this.connectors;
  }

  /**
   * Execute search across matching connectors in parallel using Promise.allSettled.
   */
  async search(query: SearchQueryDto): Promise<SearchResponseDto> {
    const parsed = parseAdvancedQuery(query.q || '');
    const cleanQ =
      parsed.cleanQuery !== undefined && parsed.cleanQuery !== ''
        ? parsed.cleanQuery
        : query.q;

    const effectiveQuery: SearchQueryDto = {
      ...query,
      q: cleanQ,
    };

    const targetConnectors = this.filterConnectors(effectiveQuery);

    this.logger.log(
      `Executing aggregated search for q="${query.q || ''}", category="${effectiveQuery.category || 'all'}", source="${effectiveQuery.source || 'all'}" across ${targetConnectors.length} connectors`,
    );

    const promises = targetConnectors.map((connector) =>
      connector.search(effectiveQuery),
    );
    const settledResults = await Promise.allSettled(promises);

    const allResults: SearchResultDto[] = [];
    const warnings: WarningDto[] = [];

    settledResults.forEach((result, index) => {
      const connector = targetConnectors[index];

      if (result.status === 'fulfilled') {
        const { results, warning } = result.value;
        if (results && Array.isArray(results)) {
          allResults.push(...results);
        }
        if (warning) {
          warnings.push(warning);
        }
      } else {
        const reasonMsg = result.reason?.message || 'Rejected';
        this.logger.error(
          `Connector ${connector.displayName} rejected: ${reasonMsg}`,
        );
        warnings.push({
          sourceName: connector.name,
          message: `Connector ${connector.displayName} failed to respond (${reasonMsg}).`,
        });
      }
    });

    // Extract effective filters combining DTO fields and parsed query operators
    const authorFilter = query.author || parsed.author;
    const startDate = query.after || query.dateFrom || parsed.after;
    const endDate = query.before || query.dateTo || parsed.before;
    const yearFilter = query.year || parsed.year;
    const doiFilter = query.doi || parsed.doi;
    const isbnFilter = query.isbn || parsed.isbn;
    const journalFilter = query.journal || parsed.journal;
    const publisherFilter = query.publisher || parsed.publisher;
    const freeFilter = query.free !== undefined ? query.free : parsed.free;
    const pdfFilter = query.pdf !== undefined ? query.pdf : parsed.pdf;
    const openAccessFilter =
      query.open_access !== undefined ? query.open_access : parsed.open_access;
    const peerReviewedFilter =
      query.peer_reviewed !== undefined
        ? query.peer_reviewed
        : parsed.peer_reviewed;
    const typeFilter = query.type || parsed.type;

    let filteredResults = allResults;

    if (authorFilter) {
      const authorQuery = authorFilter.toLowerCase();
      filteredResults = filteredResults.filter((item) =>
        item.authors?.some((a) => a.name.toLowerCase().includes(authorQuery)),
      );
    }

    if (startDate) {
      filteredResults = filteredResults.filter((item) => {
        if (!item.publishedDate) return true;
        return item.publishedDate >= startDate;
      });
    }

    if (endDate) {
      filteredResults = filteredResults.filter((item) => {
        if (!item.publishedDate) return true;
        return item.publishedDate <= endDate;
      });
    }

    if (yearFilter) {
      filteredResults = filteredResults.filter((item) => {
        if (!item.publishedDate) return true;
        return item.publishedDate.startsWith(String(yearFilter));
      });
    }

    if (doiFilter) {
      const low = doiFilter.toLowerCase();
      filteredResults = filteredResults.filter(
        (item) =>
          item.metadata?.doi?.toLowerCase().includes(low) ||
          item.id.toLowerCase().includes(low),
      );
    }

    if (isbnFilter) {
      const cleanIsbn = isbnFilter.replace(/[- ]/g, '').toLowerCase();
      filteredResults = filteredResults.filter(
        (item) =>
          item.metadata?.isbn?.replace(/[- ]/g, '').toLowerCase().includes(cleanIsbn) ||
          item.id.replace(/[- ]/g, '').toLowerCase().includes(cleanIsbn),
      );
    }

    if (journalFilter) {
      const low = journalFilter.toLowerCase();
      filteredResults = filteredResults.filter((item) =>
        item.metadata?.journal?.toLowerCase().includes(low),
      );
    }

    if (publisherFilter) {
      const low = publisherFilter.toLowerCase();
      filteredResults = filteredResults.filter((item) =>
        item.metadata?.publisher?.toLowerCase().includes(low),
      );
    }

    if (typeFilter) {
      const low = typeFilter.toLowerCase();
      filteredResults = filteredResults.filter(
        (item) =>
          item.contentType?.toLowerCase() === low ||
          item.metadata?.type?.toLowerCase() === low,
      );
    }

    if (freeFilter) {
      filteredResults = filteredResults.filter(
        (item) => item.metadata?.isFree !== false,
      );
    }

    if (pdfFilter) {
      filteredResults = filteredResults.filter(
        (item) =>
          item.metadata?.hasPdf === true ||
          (item.url && item.url.toLowerCase().endsWith('.pdf')),
      );
    }

    if (openAccessFilter) {
      filteredResults = filteredResults.filter(
        (item) => item.metadata?.isOpenAccess === true,
      );
    }

    if (peerReviewedFilter) {
      filteredResults = filteredResults.filter(
        (item) => item.metadata?.isPeerReviewed === true,
      );
    }

    // Deduplicate results by ID
    const uniqueResultsMap = new Map<string, SearchResultDto>();
    for (const item of filteredResults) {
      if (!uniqueResultsMap.has(item.id)) {
        uniqueResultsMap.set(item.id, item);
      }
    }
    const deduplicatedResults = Array.from(uniqueResultsMap.values());

    // Apply pagination
    const total = deduplicatedResults.length;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const startIndex = (page - 1) * limit;
    const paginatedResults = deduplicatedResults.slice(
      startIndex,
      startIndex + limit,
    );

    return {
      query: query.q || '',
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
      if (
        query.source &&
        connector.name.toLowerCase() !== query.source.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }
}
