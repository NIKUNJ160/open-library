import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class DoajConnector extends BaseConnector {
  readonly name = 'doaj';
  readonly displayName = 'DOAJ';
  readonly category = ContentType.PAPER;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'open access');
    const limit = query.limit || 10;
    const page = query.page || 1;
    const url = `https://doaj.org/api/v2/search/articles/${q}/${page}/${limit}`;

    const data = await this.fetchWithTimeout<any>(url);
    const results = data?.results || [];

    return results.map((item: any) => {
      const bib = item.bibjson || {};
      const authors = bib.author?.length
        ? bib.author.map((a: any) => ({ name: a.name || 'Unknown Author', affiliation: a.affiliation }))
        : [{ name: 'DOAJ Author' }];

      const fulltextLink = bib.link?.find((l: any) => l.type === 'fulltext')?.url;

      return {
        id: `doaj:${item.id}`,
        title: bib.title || 'Untitled DOAJ Article',
        authors,
        description: bib.abstract || 'Peer-reviewed open access journal article indexed by DOAJ.',
        url: fulltextLink || `https://doaj.org/article/${item.id}`,
        publishedDate: bib.year ? String(bib.year) : undefined,
        contentType: ContentType.PAPER,
        sourceName: this.name,
        metadata: {
          journal: bib.journal?.title,
          publisher: bib.journal?.publisher,
          issn: bib.journal?.issns,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Environmental Science';
    return [
      {
        id: 'doaj:a1b2c3d4e5f6',
        title: `Global Trends in Renewable Energy Transition (${q})`,
        authors: [{ name: 'Maria Rodriguez', affiliation: 'University of Barcelona' }],
        description: 'Comprehensive open-access study analyzing solar and wind capacity expansion worldwide.',
        url: 'https://doaj.org/article/a1b2c3d4e5f6',
        publishedDate: '2023',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.92,
        metadata: { journal: 'Journal of Open Sustainable Energy', isMockFallback: true },
      },
      {
        id: 'doaj:f6e5d4c3b2a1',
        title: `Advances in Open Source Medical Imaging Software (${q})`,
        authors: [{ name: 'Hans Weber', affiliation: 'TU Munich' }],
        description: 'Review of open access diagnostic algorithms and DICOM image processing pipelines.',
        url: 'https://doaj.org/article/f6e5d4c3b2a1',
        publishedDate: '2022',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.90,
        metadata: { journal: 'Open Medical Physics', isMockFallback: true },
      },
    ];
  }
}
