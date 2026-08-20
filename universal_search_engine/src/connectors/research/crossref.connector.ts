import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

/**
 * Crossref Connector — REST API
 * API: https://api.crossref.org/works?query={q}&rows={limit}
 * License: Open (Crossref metadata is freely accessible) | No API key required.
 * Polite pool: add User-Agent header with email contact.
 */
@Injectable()
export class CrossrefConnector extends BaseConnector {
  readonly name = 'crossref';
  readonly displayName = 'Crossref';
  readonly category = ContentType.PAPER;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'research');
    const limit = Math.min(query.limit || 10, 20);
    const offset = ((query.page || 1) - 1) * limit;
    const fields = 'DOI,title,author,abstract,published-print,published-online,URL,container-title,publisher,type,is-referenced-by-count,license';
    const url =
      `https://api.crossref.org/works?query=${q}&rows=${limit}&offset=${offset}` +
      `&select=${fields}`;

    const data = await this.fetchWithTimeout<any>(url, {
      'User-Agent': 'UniversalKnowledgeEngine/1.0 (https://github.com/universal-search; mailto:contact@example.com)',
    });
    const items: any[] = data?.message?.items || [];

    return items.map((item: any) => {
      const pubDate =
        item['published-print']?.['date-parts']?.[0]?.[0]?.toString() ||
        item['published-online']?.['date-parts']?.[0]?.[0]?.toString();
      const licenseUrl = item.license?.[0]?.URL;
      const doi = item.DOI;

      return {
        id: `crossref:${doi?.replace(/\//g, '_') || Math.random().toString(36).slice(7)}`,
        title: Array.isArray(item.title) ? item.title[0] : item.title || 'Untitled',
        authors: (item.author || []).map((a: any) => ({
          name: [a.given, a.family].filter(Boolean).join(' ') || a.name || 'Unknown',
        })),
        description: item.abstract?.replace(/<[^>]+>/g, '').trim() ||
          'No abstract available. See Crossref for full metadata.',
        url: item.URL || (doi ? `https://doi.org/${doi}` : 'https://crossref.org'),
        publishedDate: pubDate,
        contentType: ContentType.PAPER,
        sourceName: this.name,
        doi,
        license: licenseUrl,
        metadata: {
          journal: Array.isArray(item['container-title']) ? item['container-title'][0] : undefined,
          publisher: item.publisher,
          type: item.type,
          citationCount: item['is-referenced-by-count'],
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'research';
    return [
      {
        id: 'crossref:10.1038_s41586-021-03819-2',
        title: `Highly accurate protein structure prediction with AlphaFold (${q})`,
        authors: [{ name: 'John Jumper' }, { name: 'Richard Evans' }, { name: 'Alexander Pritzel' }],
        description: 'Proteins are essential to life, and understanding their structure can facilitate a good understanding of their function.',
        url: 'https://doi.org/10.1038/s41586-021-03819-2',
        publishedDate: '2021',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.99,
        doi: '10.1038/s41586-021-03819-2',
        license: 'CC BY 4.0',
        metadata: { journal: 'Nature', publisher: 'Springer', citationCount: 18000, isMockFallback: true },
      },
      {
        id: 'crossref:10.1145_3442188.3445922',
        title: `On the Dangers of Stochastic Parrots (${q})`,
        authors: [{ name: 'Emily Bender' }, { name: 'Timnit Gebru' }],
        description: 'Large language models trained on web text: the risks of stochastic parrots and what to do about them.',
        url: 'https://doi.org/10.1145/3442188.3445922',
        publishedDate: '2021',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.96,
        doi: '10.1145/3442188.3445922',
        metadata: { journal: 'FAccT', publisher: 'ACM', citationCount: 4500, isMockFallback: true },
      },
    ];
  }
}
