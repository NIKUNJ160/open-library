import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { ContentType, SearchQueryDto } from '../src/search/dto';

// Books
import { OpenLibraryConnector } from '../src/connectors/books/openlibrary.connector';
import { GutenbergConnector } from '../src/connectors/books/gutenberg.connector';
import { GoogleBooksConnector } from '../src/connectors/books/googlebooks.connector';
import { InternetArchiveConnector } from '../src/connectors/books/internetarchive.connector';

// Papers
import { OpenAlexConnector } from '../src/connectors/papers/openalex.connector';
import { CoreConnector } from '../src/connectors/papers/core.connector';
import { SemanticScholarConnector } from '../src/connectors/papers/semanticscholar.connector';
import { ArxivConnector } from '../src/connectors/papers/arxiv.connector';
import { PubMedConnector } from '../src/connectors/papers/pubmed.connector';
import { EuropePmcConnector } from '../src/connectors/papers/europepmc.connector';
import { DoajConnector } from '../src/connectors/papers/doaj.connector';

// Datasets
import { KaggleConnector } from '../src/connectors/datasets/kaggle.connector';
import { HuggingFaceConnector } from '../src/connectors/datasets/huggingface.connector';
import { DataGovConnector } from '../src/connectors/datasets/datagov.connector';
import { ZenodoConnector } from '../src/connectors/datasets/zenodo.connector';

// Patents
import { GooglePatentsConnector } from '../src/connectors/patents/googlepatents.connector';
import { UsptoConnector } from '../src/connectors/patents/uspto.connector';
import { WipoConnector } from '../src/connectors/patents/wipo.connector';

// Repos
import { GithubConnector } from '../src/connectors/repos/github.connector';

// Gov
import { NasaConnector } from '../src/connectors/gov/nasa.connector';
import { WorldBankConnector } from '../src/connectors/gov/worldbank.connector';

// Docs
import { MdnConnector } from '../src/connectors/docs/mdn.connector';

describe('Connectors Suite (22 Connectors)', () => {
  let httpService: HttpService;

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('Books Connectors', () => {
    it('OpenLibraryConnector should normalize response and generate fallback when HTTP fails', async () => {
      const connector = new OpenLibraryConnector(mockHttpService as any);
      expect(connector.name).toBe('openlibrary');
      expect(connector.category).toBe(ContentType.BOOK);

      // Mock successful response
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            docs: [
              {
                key: '/works/OL12345W',
                title: 'Test Book Title',
                author_name: ['Test Author'],
                first_sentence: ['A sentence.'],
                first_publish_year: 2020,
              },
            ],
          },
        }),
      );

      const query: SearchQueryDto = { q: 'computer science', page: 1, limit: 10 };
      const res = await connector.search(query);

      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('openlibrary:OL12345W');
      expect(res.results[0].title).toBe('Test Book Title');
      expect(res.results[0].contentType).toBe(ContentType.BOOK);
      expect(res.results[0].sourceName).toBe('openlibrary');
    });

    it('GutenbergConnector should handle search query correctly', async () => {
      const connector = new GutenbergConnector(mockHttpService as any);
      expect(connector.name).toBe('gutenberg');
      expect(connector.category).toBe(ContentType.BOOK);

      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            results: [
              {
                id: 84,
                title: 'Frankenstein',
                authors: [{ name: 'Mary Shelley' }],
                subjects: ['Gothic'],
                formats: { 'text/html': 'https://www.gutenberg.org/ebooks/84.html.images' },
              },
            ],
          },
        }),
      );

      const res = await connector.search({ q: 'Frankenstein', page: 1, limit: 10 });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('gutenberg:84');
      expect(res.results[0].authors[0].name).toBe('Mary Shelley');
    });

    it('GoogleBooksConnector should normalize API volume result', async () => {
      const connector = new GoogleBooksConnector(mockHttpService as any);
      expect(connector.name).toBe('googlebooks');

      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            items: [
              {
                id: 'vol123',
                volumeInfo: {
                  title: 'Google Book Title',
                  authors: ['Author One'],
                  description: 'Desc',
                  infoLink: 'https://books.google.com/vol123',
                  publishedDate: '2021',
                },
              },
            ],
          },
        }),
      );

      const res = await connector.search({ q: 'AI', page: 1, limit: 10 });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('googlebooks:vol123');
    });

    it('InternetArchiveConnector should parse mediatype texts doc', async () => {
      const connector = new InternetArchiveConnector(mockHttpService as any);
      expect(connector.name).toBe('internetarchive');

      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            response: {
              docs: [
                {
                  identifier: 'archive_doc_1',
                  title: 'Archive Book',
                  creator: 'Archive Creator',
                  description: 'Public domain text',
                  date: '1900',
                },
              ],
            },
          },
        }),
      );

      const res = await connector.search({ q: 'history', page: 1, limit: 10 });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('internetarchive:archive_doc_1');
    });
  });

  describe('Research Papers Connectors', () => {
    it('OpenAlexConnector should reconstruct inverted abstract index', async () => {
      const connector = new OpenAlexConnector(mockHttpService as any);
      expect(connector.name).toBe('openalex');
      expect(connector.category).toBe(ContentType.PAPER);

      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            results: [
              {
                id: 'https://openalex.org/W1001',
                display_name: 'OpenAlex Paper Title',
                authorships: [{ author: { display_name: 'Dr. Smith' } }],
                abstract_inverted_index: { Paper: [0], Abstract: [1] },
                doi: 'https://doi.org/10.1000/182',
                publication_year: 2022,
              },
            ],
          },
        }),
      );

      const res = await connector.search({ q: 'paper', page: 1, limit: 10 });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('openalex:W1001');
      expect(res.results[0].description).toBe('Paper Abstract');
    });

    it('CoreConnector should return warning when API key is missing', async () => {
      const connector = new CoreConnector(mockHttpService as any);
      expect(connector.name).toBe('core');
      expect(connector.requiresApiKey).toBe(true);

      const res = await connector.search({ q: 'physics', page: 1, limit: 10 });
      expect(res.results.length).toBeGreaterThan(0); // Mock fallback results
      expect(res.warning).toBeDefined();
      expect(res.warning?.sourceName).toBe('core');
      expect(res.warning?.message).toContain('API key missing');
    });

    it('SemanticScholarConnector should normalize graph API response', async () => {
      const connector = new SemanticScholarConnector(mockHttpService as any);
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            data: [
              {
                paperId: 'paper123',
                title: 'Semantic Scholar Title',
                abstract: 'Abstract content',
                authors: [{ name: 'Author A' }],
                year: 2021,
              },
            ],
          },
        }),
      );

      const res = await connector.search({ q: 'NLP', page: 1, limit: 10 });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('semanticscholar:paper123');
    });

    it('ArxivConnector should parse raw arXiv XML query output', async () => {
      const connector = new ArxivConnector(mockHttpService as any);
      const xmlData = `
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <id>http://arxiv.org/abs/2104.12345v1</id>
            <title>Arxiv Test Paper</title>
            <summary>Arxiv Test Abstract</summary>
            <published>2021-04-25T00:00:00Z</published>
            <author><name>Alice Bob</name></author>
          </entry>
        </feed>
      `;

      mockHttpService.get.mockReturnValueOnce(of({ data: xmlData }));

      const res = await connector.search({ q: 'cs.AI', page: 1, limit: 10 });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('arxiv:2104.12345v1');
      expect(res.results[0].title).toBe('Arxiv Test Paper');
      expect(res.results[0].authors[0].name).toBe('Alice Bob');
    });

    it('PubMedConnector should fetch search and summary results', async () => {
      const connector = new PubMedConnector(mockHttpService as any);

      // First call (esearch)
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            esearchresult: { idlist: ['12345678'] },
          },
        }),
      );
      // Second call (esummary)
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            result: {
              '12345678': {
                title: 'PubMed Medical Paper',
                authors: [{ name: 'Doctor Smith' }],
                source: 'Journal of Medicine',
                pubdate: '2020 Jan 1',
              },
            },
          },
        }),
      );

      const res = await connector.search({ q: 'genomics', page: 1, limit: 10 });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('pubmed:12345678');
      expect(res.results[0].title).toBe('PubMed Medical Paper');
    });

    it('EuropePmcConnector should normalize article result', async () => {
      const connector = new EuropePmcConnector(mockHttpService as any);
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            resultList: {
              result: [
                {
                  id: 'PMC12345',
                  title: 'Europe PMC Title',
                  authorString: 'Author One, Author Two',
                  abstractText: 'Bio abstract',
                  firstPublicationDate: '2019-05-10',
                },
              ],
            },
          },
        }),
      );

      const res = await connector.search({ q: 'biology', page: 1, limit: 10 });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('europepmc:PMC12345');
      expect(res.results[0].authors.length).toBe(2);
    });

    it('DoajConnector should parse article search result', async () => {
      const connector = new DoajConnector(mockHttpService as any);
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            results: [
              {
                id: 'doaj_art_1',
                bibjson: {
                  title: 'DOAJ Article Title',
                  author: [{ name: 'DOAJ Author' }],
                  abstract: 'DOAJ Abstract',
                  year: 2022,
                },
              },
            ],
          },
        }),
      );

      const res = await connector.search({ q: 'open access', page: 1, limit: 10 });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('doaj:doaj_art_1');
    });
  });

  describe('Datasets, Patents, Repos, Gov, Docs Connectors', () => {
    it('KaggleConnector should trigger warning when API credentials are missing', async () => {
      const connector = new KaggleConnector(mockHttpService as any);
      expect(connector.requiresApiKey).toBe(true);

      const res = await connector.search({ q: 'dataset' });
      expect(res.results.length).toBeGreaterThan(0);
      expect(res.warning).toBeDefined();
    });

    it('HuggingFaceConnector should normalize datasets API list', async () => {
      const connector = new HuggingFaceConnector(mockHttpService as any);
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: [
            {
              id: 'owner/dataset_name',
              author: 'owner',
              description: 'HF dataset',
              downloads: 5000,
            },
          ],
        }),
      );

      const res = await connector.search({ q: 'nlp' });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('huggingface:owner/dataset_name');
    });

    it('DataGovConnector should normalize package search results', async () => {
      const connector = new DataGovConnector(mockHttpService as any);
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            result: {
              results: [
                {
                  id: 'datagov_pkg_1',
                  name: 'climate-pkg',
                  title: 'DataGov Climate Package',
                  notes: 'Notes description',
                  author: 'NOAA',
                },
              ],
            },
          },
        }),
      );

      const res = await connector.search({ q: 'climate' });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('datagov:datagov_pkg_1');
    });

    it('ZenodoConnector should normalize record hits', async () => {
      const connector = new ZenodoConnector(mockHttpService as any);
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            hits: {
              hits: [
                {
                  id: 123456,
                  metadata: {
                    title: 'Zenodo Record Title',
                    creators: [{ name: 'Zenodo Creator' }],
                    description: '<p>HTML Description</p>',
                    publication_date: '2021-01-01',
                  },
                },
              ],
            },
          },
        }),
      );

      const res = await connector.search({ q: 'record' });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('zenodo:123456');
    });

    it('GooglePatentsConnector should parse patent search result', async () => {
      const connector = new GooglePatentsConnector(mockHttpService as any);
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            results: {
              cluster: [
                {
                  result: [
                    {
                      patent: {
                        publication_number: 'US1234567B2',
                        title: 'Patented Invention',
                        assignee: 'Tech Corp',
                        snippet: 'Patent abstract snippet',
                        publication_date: '2022-03-01',
                      },
                    },
                  ],
                },
              ],
            },
          },
        }),
      );

      const res = await connector.search({ q: 'patent' });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('googlepatents:US1234567B2');
    });

    it('UsptoConnector should parse application results', async () => {
      const connector = new UsptoConnector(mockHttpService as any);
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            response: {
              docs: [
                {
                  applicationNumberText: '16123456',
                  inventionTitle: 'USPTO Invention',
                  inventorNameArrayText: ['Inventor A'],
                  abstractText: ['Application abstract'],
                },
              ],
            },
          },
        }),
      );

      const res = await connector.search({ q: 'uspto' });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('uspto:16123456');
    });

    it('WipoConnector should parse international patent result', async () => {
      const connector = new WipoConnector(mockHttpService as any);
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            items: [
              {
                id: 'WO2022000001A1',
                title: 'WIPO International Application',
                applicants: ['Global Corp'],
                abstract: 'WIPO Abstract',
              },
            ],
          },
        }),
      );

      const res = await connector.search({ q: 'wipo' });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('wipo:WO2022000001A1');
    });

    it('GithubConnector should normalize repository items', async () => {
      const connector = new GithubConnector(mockHttpService as any);
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            items: [
              {
                full_name: 'facebook/react',
                owner: { login: 'facebook' },
                description: 'The library for web and native user interfaces.',
                html_url: 'https://github.com/facebook/react',
                stargazers_count: 220000,
                language: 'JavaScript',
              },
            ],
          },
        }),
      );

      const res = await connector.search({ q: 'react' });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('github:facebook/react');
      expect(res.results[0].contentType).toBe(ContentType.REPO);
    });

    it('NasaConnector should normalize NTRS citations', async () => {
      const connector = new NasaConnector(mockHttpService as any);
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            results: [
              {
                id: '20200012345',
                title: 'NASA Lunar Landing Study',
                authorAffiliations: [{ meta: { author: { name: 'NASA Engineer' } } }],
                abstract: 'Lunar propulsion study',
                issueDate: '2020-05-15',
              },
            ],
          },
        }),
      );

      const res = await connector.search({ q: 'nasa' });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('nasa:20200012345');
      expect(res.results[0].contentType).toBe(ContentType.GOV);
    });

    it('WorldBankConnector should normalize document search results', async () => {
      const connector = new WorldBankConnector(mockHttpService as any);
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            documents: {
              doc1: {
                id: 'WB123',
                display_title: 'World Bank Trade Policy Report',
                authors: { author: 'World Bank Economist' },
                abstract: 'Trade economic analysis',
                pdfurl: 'https://documents.worldbank.org/report.pdf',
              },
            },
          },
        }),
      );

      const res = await connector.search({ q: 'trade' });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('worldbank:WB123');
      expect(res.results[0].contentType).toBe(ContentType.GOV);
    });

    it('MdnConnector should normalize MDN API search results', async () => {
      const connector = new MdnConnector(mockHttpService as any);
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: {
            documents: [
              {
                title: 'Array.prototype.map()',
                summary: 'The map() method creates a new array...',
                mdn_url: '/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map',
                slug: 'Web/JavaScript/Reference/Global_Objects/Array/map',
              },
            ],
          },
        }),
      );

      const res = await connector.search({ q: 'Array map' });
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe('mdn:Web/JavaScript/Reference/Global_Objects/Array/map');
      expect(res.results[0].contentType).toBe(ContentType.DOC);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('BaseConnector should catch HTTP errors and return mock fallback with warning', async () => {
      const connector = new OpenLibraryConnector(mockHttpService as any);
      mockHttpService.get.mockReturnValueOnce(
        throwError(() => new Error('Connection refused / 500 Internal Server Error')),
      );

      const res = await connector.search({ q: 'test failure' });
      expect(res.results.length).toBeGreaterThan(0);
      expect(res.warning).toBeDefined();
      expect(res.warning?.sourceName).toBe('openlibrary');
      expect(res.warning?.message).toContain('failed');
    });
  });
});
