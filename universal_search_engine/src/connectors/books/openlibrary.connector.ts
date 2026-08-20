import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class OpenLibraryConnector extends BaseConnector {
  readonly name = 'openlibrary';
  readonly displayName = 'Open Library';
  readonly category = ContentType.BOOK;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'knowledge');
    const page = query.page || 1;
    const limit = query.limit || 10;
    const url = `https://openlibrary.org/search.json?q=${q}&page=${page}&limit=${limit}`;

    const data = await this.fetchWithTimeout<any>(url);
    const docs = data?.docs || [];

    return docs.map((doc: any) => {
      const workId = doc.key ? doc.key.replace('/works/', '') : doc.edition_key?.[0] || Math.random().toString(36).substring(7);
      return {
        id: `openlibrary:${workId}`,
        title: doc.title || 'Untitled Book',
        authors: doc.author_name ? doc.author_name.map((name: string) => ({ name })) : [{ name: 'Unknown Author' }],
        description: doc.first_sentence?.[0] || doc.subtitle || 'Open Library public catalog entry.',
        url: doc.key ? `https://openlibrary.org${doc.key}` : 'https://openlibrary.org',
        publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
        contentType: ContentType.BOOK,
        sourceName: this.name,
        metadata: {
          isbns: doc.isbn?.slice(0, 5),
          coverId: doc.cover_i,
          editionCount: doc.edition_count,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Computer Science';
    return [
      {
        id: 'openlibrary:OL82586W',
        title: `Structure and Interpretation of Computer Programs (${q})`,
        authors: [{ name: 'Harold Abelson' }, { name: 'Gerald Jay Sussman' }],
        description: 'A classic computer science textbook teaching fundamentals of software engineering and programming paradigms.',
        url: 'https://openlibrary.org/works/OL82586W',
        publishedDate: '1984',
        contentType: ContentType.BOOK,
        sourceName: this.name,
        score: 0.98,
        metadata: { coverId: 82586, isMockFallback: true },
      },
      {
        id: 'openlibrary:OL275069W',
        title: `Design Patterns: Elements of Reusable Object-Oriented Software (${q})`,
        authors: [
          { name: 'Erich Gamma' },
          { name: 'Richard Helm' },
          { name: 'Ralph Johnson' },
          { name: 'John Vlissides' },
        ],
        description: 'A foundational software design patterns reference guide for software architects.',
        url: 'https://openlibrary.org/works/OL275069W',
        publishedDate: '1994',
        contentType: ContentType.BOOK,
        sourceName: this.name,
        score: 0.95,
        metadata: { coverId: 275069, isMockFallback: true },
      },
    ];
  }
}
