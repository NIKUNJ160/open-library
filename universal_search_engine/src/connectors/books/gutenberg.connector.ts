import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class GutenbergConnector extends BaseConnector {
  readonly name = 'gutenberg';
  readonly displayName = 'Project Gutenberg';
  readonly category = ContentType.BOOK;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'classics');
    const page = query.page || 1;
    const url = `https://gutendex.com/books/?search=${q}&page=${page}`;

    const data = await this.fetchWithTimeout<any>(url);
    const books = data?.results || [];

    return books.map((book: any) => ({
      id: `gutenberg:${book.id}`,
      title: book.title || 'Untitled Gutenberg eBook',
      authors: book.authors?.length
        ? book.authors.map((a: any) => ({ name: a.name }))
        : [{ name: 'Anonymous' }],
      description: book.subjects?.length
        ? book.subjects.slice(0, 3).join('; ')
        : 'Public domain eBook from Project Gutenberg catalog.',
      url:
        book.formats?.['text/html'] ||
        book.formats?.['text/plain'] ||
        `https://www.gutenberg.org/ebooks/${book.id}`,
      publishedDate: undefined,
      contentType: ContentType.BOOK,
      sourceName: this.name,
      metadata: {
        downloads: book.download_count,
        languages: book.languages,
        formats: book.formats ? Object.keys(book.formats) : [],
      },
    }));
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Classics';
    return [
      {
        id: 'gutenberg:84',
        title: `Frankenstein; Or, The Modern Prometheus (${q})`,
        authors: [{ name: 'Shelley, Mary Wollstonecraft' }],
        description: 'Gothic science fiction classic exploring creation, humanity, and ethics.',
        url: 'https://www.gutenberg.org/ebooks/84',
        contentType: ContentType.BOOK,
        sourceName: this.name,
        score: 0.96,
        metadata: { downloads: 45000, languages: ['en'], isMockFallback: true },
      },
      {
        id: 'gutenberg:1342',
        title: `Pride and Prejudice (${q})`,
        authors: [{ name: 'Austen, Jane' }],
        description: 'Classic novel depicting manners, education, and marriage in Regency Britain.',
        url: 'https://www.gutenberg.org/ebooks/1342',
        contentType: ContentType.BOOK,
        sourceName: this.name,
        score: 0.94,
        metadata: { downloads: 52000, languages: ['en'], isMockFallback: true },
      },
    ];
  }
}
