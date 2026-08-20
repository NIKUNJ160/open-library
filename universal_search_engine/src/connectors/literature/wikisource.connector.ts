import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

/**
 * Wikisource Connector — MediaWiki API
 * API: https://en.wikisource.org/w/api.php?action=query&list=search&srsearch={q}&format=json
 * License: CC BY-SA 4.0 | No API key required.
 */
@Injectable()
export class WikisourceConnector extends BaseConnector {
  readonly name = 'wikisource';
  readonly displayName = 'Wikisource';
  readonly category = ContentType.LITERATURE;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'literature');
    const limit = Math.min(query.limit || 10, 50);
    const url =
      `https://en.wikisource.org/w/api.php?action=query&list=search` +
      `&srsearch=${q}&srlimit=${limit}&format=json&origin=*`;

    const data = await this.fetchWithTimeout<any>(url);
    const items: any[] = data?.query?.search || [];

    return items.map((item: any) => ({
      id: `wikisource:${item.pageid}`,
      title: item.title || 'Untitled Wikisource Text',
      authors: [{ name: 'Wikisource Community' }],
      description: item.snippet?.replace(/<[^>]+>/g, '').trim() ||
        'Public domain text available on Wikisource.',
      url: `https://en.wikisource.org/wiki/${encodeURIComponent(item.title)}`,
      publishedDate: undefined,
      contentType: ContentType.LITERATURE,
      sourceName: this.name,
      language: 'en',
      license: 'CC BY-SA 4.0',
      metadata: {
        pageid: item.pageid,
        wordcount: item.wordcount,
        snippet: item.snippet,
      },
    }));
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'literature';
    return [
      {
        id: 'wikisource:1249',
        title: `Pride and Prejudice (${q})`,
        authors: [{ name: 'Jane Austen' }],
        description: 'Classic novel by Jane Austen, published in 1813. A story of love and social standing.',
        url: 'https://en.wikisource.org/wiki/Pride_and_Prejudice',
        publishedDate: '1813',
        contentType: ContentType.LITERATURE,
        sourceName: this.name,
        score: 0.97,
        language: 'en',
        license: 'Public Domain',
        metadata: { pageid: 1249, isMockFallback: true },
      },
      {
        id: 'wikisource:2798',
        title: `The Adventures of Sherlock Holmes (${q})`,
        authors: [{ name: 'Arthur Conan Doyle' }],
        description: 'Collection of twelve short stories by Arthur Conan Doyle, first published in 1892.',
        url: 'https://en.wikisource.org/wiki/The_Adventures_of_Sherlock_Holmes',
        publishedDate: '1892',
        contentType: ContentType.LITERATURE,
        sourceName: this.name,
        score: 0.95,
        language: 'en',
        license: 'Public Domain',
        metadata: { pageid: 2798, isMockFallback: true },
      },
    ];
  }
}
