import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class MdnConnector extends BaseConnector {
  readonly name = 'mdn';
  readonly displayName = 'MDN Web Docs';
  readonly category = ContentType.DOC;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'javascript');
    const url = `https://developer.mozilla.org/api/v1/search?q=${q}&locale=en-US`;

    const data = await this.fetchWithTimeout<any>(url);
    const documents = data?.documents || [];

    return documents.map((doc: any) => {
      const slug = doc.slug || doc.mdn_url || Math.random().toString(36).substring(7);
      return {
        id: `mdn:${slug}`,
        title: doc.title || 'Untitled MDN Article',
        authors: [{ name: 'MDN Web Docs Contributors' }],
        description: doc.summary || 'Mozilla Developer Network web standards documentation.',
        url: doc.mdn_url ? `https://developer.mozilla.org${doc.mdn_url}` : `https://developer.mozilla.org/en-US/docs/${slug}`,
        publishedDate: undefined,
        contentType: ContentType.DOC,
        sourceName: this.name,
        metadata: {
          locale: doc.locale,
          score: doc.score,
          slug: doc.slug,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Fetch API';
    return [
      {
        id: 'mdn:Web/API/Fetch_API/Using_Fetch',
        title: `Using the Fetch API - Web APIs | MDN (${q})`,
        authors: [{ name: 'MDN Web Docs Contributors' }],
        description: 'The Fetch API provides a JavaScript interface for accessing and manipulating parts of the protocol, such as requests and responses.',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch',
        contentType: ContentType.DOC,
        sourceName: this.name,
        score: 0.98,
        metadata: { locale: 'en-US', slug: 'Web/API/Fetch_API/Using_Fetch', isMockFallback: true },
      },
      {
        id: 'mdn:Web/JavaScript/Reference/Global_Objects/Promise',
        title: `Promise - JavaScript | MDN (${q})`,
        authors: [{ name: 'MDN Web Docs Contributors' }],
        description: 'The Promise object represents the eventual completion or failure of an asynchronous operation and its resulting value.',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
        contentType: ContentType.DOC,
        sourceName: this.name,
        score: 0.99,
        metadata: { locale: 'en-US', slug: 'Web/JavaScript/Reference/Global_Objects/Promise', isMockFallback: true },
      },
    ];
  }
}
