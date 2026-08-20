import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class GoogleBooksConnector extends BaseConnector {
  readonly name = 'googlebooks';
  readonly displayName = 'Google Books';
  readonly category = ContentType.BOOK;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected getApiKey(): string | undefined {
    return process.env.GOOGLE_BOOKS_API_KEY;
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'knowledge');
    const limit = query.limit || 10;
    const startIndex = ((query.page || 1) - 1) * limit;
    const apiKey = this.getApiKey();
    const keyParam = apiKey ? `&key=${apiKey}` : '';
    const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&startIndex=${startIndex}&maxResults=${limit}${keyParam}`;

    const data = await this.fetchWithTimeout<any>(url);
    const items = data?.items || [];

    return items.map((item: any) => {
      const vol = item.volumeInfo || {};
      return {
        id: `googlebooks:${item.id}`,
        title: vol.title || 'Untitled Book',
        authors: vol.authors ? vol.authors.map((name: string) => ({ name })) : [{ name: 'Unknown' }],
        description: vol.description || 'Google Books catalog entry.',
        url: vol.infoLink || vol.canonicalVolumeLink || `https://books.google.com/books?id=${item.id}`,
        publishedDate: vol.publishedDate,
        contentType: ContentType.BOOK,
        sourceName: this.name,
        metadata: {
          publisher: vol.publisher,
          pageCount: vol.pageCount,
          categories: vol.categories,
          isbn: vol.industryIdentifiers,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Computer Networks';
    return [
      {
        id: 'googlebooks:mock101',
        title: `Computer Networks: A Systems Approach (${q})`,
        authors: [{ name: 'Larry L. Peterson' }, { name: 'Bruce S. Davie' }],
        description: 'Comprehensive introduction to system architectural concepts in computer networks.',
        url: 'https://books.google.com/books?id=mock101',
        publishedDate: '2011-03-02',
        contentType: ContentType.BOOK,
        sourceName: this.name,
        score: 0.95,
        metadata: { publisher: 'Morgan Kaufmann', pageCount: 850, isMockFallback: true },
      },
      {
        id: 'googlebooks:mock102',
        title: `Artificial Intelligence: A Modern Approach (${q})`,
        authors: [{ name: 'Stuart Russell' }, { name: 'Peter Norvig' }],
        description: 'The standard reference and textbook for artificial intelligence and machine learning.',
        url: 'https://books.google.com/books?id=mock102',
        publishedDate: '2020-04-28',
        contentType: ContentType.BOOK,
        sourceName: this.name,
        score: 0.97,
        metadata: { publisher: 'Pearson', pageCount: 1136, isMockFallback: true },
      },
    ];
  }
}
