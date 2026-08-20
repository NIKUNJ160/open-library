import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class UsptoConnector extends BaseConnector {
  readonly name = 'uspto';
  readonly displayName = 'USPTO';
  readonly category = ContentType.PATENT;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'semiconductor');
    const limit = query.limit || 10;
    const url = `https://developer.uspto.gov/ibd-api/v1/patent/application?searchText=${q}&rows=${limit}`;

    const data = await this.fetchWithTimeout<any>(url);
    const docs = data?.response?.docs || [];

    return docs.map((doc: any) => {
      const appNum = doc.applicationNumberText || Math.random().toString(36).substring(7);
      const inventors = doc.inventorNameArrayText?.length
        ? doc.inventorNameArrayText.map((name: string) => ({ name }))
        : [{ name: 'USPTO Applicant / Inventor' }];

      return {
        id: `uspto:${appNum}`,
        title: doc.inventionTitle || 'Untitled USPTO Application',
        authors: inventors,
        description: doc.abstractText?.[0] || 'U.S. Patent and Trademark Office patent application filing.',
        url: `https://patentcenter.uspto.gov/applications/${appNum}`,
        publishedDate: doc.publicationDate,
        contentType: ContentType.PATENT,
        sourceName: this.name,
        metadata: {
          applicationNumber: appNum,
          filingDate: doc.filingDate,
          mainClass: doc.mainClass,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Quantum Computing';
    return [
      {
        id: 'uspto:16/982104',
        title: `Superconducting Quantum Processor Architecture (${q})`,
        authors: [{ name: 'John Martinis' }, { name: 'Pedram Roushan' }],
        description: 'Fault-tolerant quantum logic gate array with tunable coupler elements.',
        url: 'https://patentcenter.uspto.gov/applications/16982104',
        publishedDate: '2021-04-15',
        contentType: ContentType.PATENT,
        sourceName: this.name,
        score: 0.95,
        metadata: { applicationNumber: '16/982104', filingDate: '2020-08-01', isMockFallback: true },
      },
      {
        id: 'uspto:17/104928',
        title: `Autonomous Vehicle Sensor Fusion Pipeline (${q})`,
        authors: [{ name: 'Andrej Karpathy' }, { name: 'Ashok Elluswamy' }],
        description: 'Multi-camera spatial occupancy grid prediction for vision-based vehicle guidance.',
        url: 'https://patentcenter.uspto.gov/applications/17104928',
        publishedDate: '2022-01-20',
        contentType: ContentType.PATENT,
        sourceName: this.name,
        score: 0.97,
        metadata: { applicationNumber: '17/104928', filingDate: '2020-11-25', isMockFallback: true },
      },
    ];
  }
}
