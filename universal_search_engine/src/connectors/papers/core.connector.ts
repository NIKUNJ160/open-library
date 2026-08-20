import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class CoreConnector extends BaseConnector {
  readonly name = 'core';
  readonly displayName = 'CORE';
  readonly category = ContentType.PAPER;
  readonly requiresApiKey = true;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected getApiKey(): string | undefined {
    return process.env.CORE_API_KEY;
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'research');
    const limit = query.limit || 10;
    const offset = ((query.page || 1) - 1) * limit;
    const apiKey = this.getApiKey();

    const url = `https://api.core.ac.uk/v3/search/works?q=${q}&limit=${limit}&offset=${offset}`;
    const headers: Record<string, string> = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};

    const data = await this.fetchWithTimeout<any>(url, headers);
    const results = data?.results || [];

    return results.map((item: any) => ({
      id: `core:${item.id}`,
      title: item.title || 'Untitled Work',
      authors: item.authors?.length
        ? item.authors.map((a: any) => ({ name: a.name || 'Unknown Author' }))
        : [{ name: 'CORE Contributor' }],
      description: item.abstract || 'CORE open access research paper.',
      url: item.downloadUrl || item.canonicalUrl || `https://core.ac.uk/works/${item.id}`,
      publishedDate: item.publishedDate,
      contentType: ContentType.PAPER,
      sourceName: this.name,
      metadata: {
        doi: item.doi,
        downloadUrl: item.downloadUrl,
        publisher: item.publisher,
      },
    }));
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Open Science';
    return [
      {
        id: 'core:82341901',
        title: `The FAIR Guiding Principles for scientific data management (${q})`,
        authors: [{ name: 'Mark D. Wilkinson' }, { name: 'Michel Dumontier' }],
        description: 'Guidelines to improve Findability, Accessibility, Interoperability, and Reuse of digital assets.',
        url: 'https://core.ac.uk/works/82341901',
        publishedDate: '2016-03-15',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.96,
        metadata: { doi: '10.1038/sdata.2016.18', publisher: 'Nature Publishing Group', isMockFallback: true },
      },
      {
        id: 'core:94102911',
        title: `Open Access Publishing in European Higher Education (${q})`,
        authors: [{ name: 'Elena Giglia' }],
        description: 'Analysis of policies, repositories, and open research metrics across European academic institutions.',
        url: 'https://core.ac.uk/works/94102911',
        publishedDate: '2019-09-20',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.91,
        metadata: { publisher: 'CORE Open Access', isMockFallback: true },
      },
    ];
  }
}
