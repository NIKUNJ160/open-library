import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

// Books
import { OpenLibraryConnector } from './books/openlibrary.connector';
import { GutenbergConnector } from './books/gutenberg.connector';
import { GoogleBooksConnector } from './books/googlebooks.connector';
import { InternetArchiveConnector } from './books/internetarchive.connector';

// Research Papers
import { OpenAlexConnector } from './papers/openalex.connector';
import { CoreConnector } from './papers/core.connector';
import { SemanticScholarConnector } from './papers/semanticscholar.connector';
import { ArxivConnector } from './papers/arxiv.connector';
import { PubMedConnector } from './papers/pubmed.connector';
import { EuropePmcConnector } from './papers/europepmc.connector';
import { DoajConnector } from './papers/doaj.connector';

// Datasets
import { KaggleConnector } from './datasets/kaggle.connector';
import { HuggingFaceConnector } from './datasets/huggingface.connector';
import { DataGovConnector } from './datasets/datagov.connector';
import { ZenodoConnector } from './datasets/zenodo.connector';

// Patents
import { GooglePatentsConnector } from './patents/googlepatents.connector';
import { UsptoConnector } from './patents/uspto.connector';
import { WipoConnector } from './patents/wipo.connector';

// Repos
import { GithubConnector } from './repos/github.connector';

// Government Publications
import { NasaConnector } from './gov/nasa.connector';
import { WorldBankConnector } from './gov/worldbank.connector';

// Documentation
import { MdnConnector } from './docs/mdn.connector';

// ── Phase 2 New Connectors ──────────────────────────────────────────────────

// Literature
import { WikisourceConnector } from './literature/wikisource.connector';

// Research
import { CrossrefConnector } from './research/crossref.connector';

// Datasets (extended)
import { WikidataConnector } from './datasets/wikidata.connector';
import { OwidConnector } from './datasets/owid.connector';

// Code
import { GitlabConnector } from './code/gitlab.connector';
import { SourcegraphConnector } from './code/sourcegraph.connector';

// Patents (extended)
import { EpoConnector } from './patents/epo.connector';

// Documentation (extended)
import { KubernetesDocsConnector } from './docs/kubernetes.connector';
import { MicrosoftLearnConnector } from './docs/microsoft-learn.connector';
import { PythonDocsConnector } from './docs/python-docs.connector';
import { OpenApiDirectoryConnector } from './docs/openapi-directory.connector';

// ───────────────────────────────────────────────────────────────────────────

const CONNECTORS = [
  // Existing (Phase 1)
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
  // Phase 2 additions
  WikisourceConnector,
  CrossrefConnector,
  WikidataConnector,
  OwidConnector,
  GitlabConnector,
  SourcegraphConnector,
  EpoConnector,
  KubernetesDocsConnector,
  MicrosoftLearnConnector,
  PythonDocsConnector,
  OpenApiDirectoryConnector,
];

@Module({
  imports: [HttpModule],
  providers: [...CONNECTORS],
  exports: [...CONNECTORS],
})
export class ConnectorsModule {}
