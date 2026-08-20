import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class GooglePatentsConnector extends BaseConnector {
  readonly name = 'googlepatents';
  readonly displayName = 'Google Patents';
  readonly category = ContentType.PATENT;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'machine learning');
    const url = `https://patents.google.com/xhr/query?url=q%3D${q}`;

    const data = await this.fetchWithTimeout<any>(url);
    const results = data?.results?.cluster?.[0]?.result || [];

    return results.map((item: any) => {
      const patent = item.patent || {};
      const patentNum = patent.publication_number || patent.id || Math.random().toString(36).substring(7);
      const title = patent.title || 'Untitled Patent';
      const assignee = patent.assignee || 'Patent Assignee';
      const inventors = patent.inventor
        ? (Array.isArray(patent.inventor) ? patent.inventor.map((name: string) => ({ name })) : [{ name: patent.inventor }])
        : [{ name: assignee }];

      return {
        id: `googlepatents:${patentNum}`,
        title,
        authors: inventors,
        description: patent.snippet || 'Google Patents indexed patent specification document.',
        url: `https://patents.google.com/patent/${patentNum}/en`,
        publishedDate: patent.publication_date,
        contentType: ContentType.PATENT,
        sourceName: this.name,
        metadata: {
          assignee,
          patentNumber: patentNum,
          countryCode: patent.country_code,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Neural Networks';
    return [
      {
        id: 'googlepatents:US10922588B2',
        title: `System and Method for Distributed Deep Neural Network Acceleration (${q})`,
        authors: [{ name: 'Jeff Dean' }, { name: 'Sanjay Ghemawat' }],
        description: 'Hardware architecture and memory mapping techniques for parallel matrix operations in deep learning workloads.',
        url: 'https://patents.google.com/patent/US10922588B2/en',
        publishedDate: '2021-02-16',
        contentType: ContentType.PATENT,
        sourceName: this.name,
        score: 0.96,
        metadata: { assignee: 'Google LLC', countryCode: 'US', isMockFallback: true },
      },
      {
        id: 'googlepatents:US11200481B2',
        title: `Self-Attention Mechanisms for Sequence Processing Systems (${q})`,
        authors: [{ name: 'Ashish Vaswani' }, { name: 'Jakob Uszkoreit' }],
        description: 'Neural network architectures utilizing scaled dot-product attention for multi-head sequence transformation.',
        url: 'https://patents.google.com/patent/US11200481B2/en',
        publishedDate: '2021-12-14',
        contentType: ContentType.PATENT,
        sourceName: this.name,
        score: 0.98,
        metadata: { assignee: 'Google LLC', countryCode: 'US', isMockFallback: true },
      },
    ];
  }
}
