import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class WipoConnector extends BaseConnector {
  readonly name = 'wipo';
  readonly displayName = 'WIPO Patentscope';
  readonly category = ContentType.PATENT;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'biotechnology');
    const url = `https://patentscope.wipo.int/search/rest/v1/search?q=${q}`;

    const data = await this.fetchWithTimeout<any>(url);
    const items = data?.items || data?.results || [];

    return items.map((item: any) => {
      const docId = item.id || item.pctNumber || item.pubNumber || Math.random().toString(36).substring(7);
      const applicants = item.applicants?.length
        ? item.applicants.map((name: string) => ({ name }))
        : [{ name: 'WIPO Applicant' }];

      return {
        id: `wipo:${docId}`,
        title: item.title || 'Untitled WIPO International Application',
        authors: applicants,
        description: item.abstract || 'World Intellectual Property Organization international patent publication.',
        url: `https://patentscope.wipo.int/search/en/detail.jsf?docId=${docId}`,
        publishedDate: item.publicationDate,
        contentType: ContentType.PATENT,
        sourceName: this.name,
        metadata: {
          internationalAppNumber: item.pctNumber,
          publicationNumber: item.pubNumber,
          ipcClassification: item.ipc,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Biotechnology';
    return [
      {
        id: 'wipo:WO2021087654A1',
        title: `CRISPR-Guided Nucleic Acid Diagnostics (${q})`,
        authors: [{ name: 'Sherlock Biosciences, Inc.' }],
        description: 'Method for rapid isothermal detection of viral RNA sequences using collateral cleavage activity.',
        url: 'https://patentscope.wipo.int/search/en/detail.jsf?docId=WO2021087654A1',
        publishedDate: '2021-05-14',
        contentType: ContentType.PATENT,
        sourceName: this.name,
        score: 0.94,
        metadata: { internationalAppNumber: 'PCT/US2020/058912', publicationNumber: 'WO2021087654A1', isMockFallback: true },
      },
      {
        id: 'wipo:WO2022140892A1',
        title: `Solid-State Lithium Battery Electrolyte Formulations (${q})`,
        authors: [{ name: 'QuantumScape Battery Inc.' }],
        description: 'Ceramic separator membranes for dendrite-free high energy density solid-state lithium metal batteries.',
        url: 'https://patentscope.wipo.int/search/en/detail.jsf?docId=WO2022140892A1',
        publishedDate: '2022-07-07',
        contentType: ContentType.PATENT,
        sourceName: this.name,
        score: 0.96,
        metadata: { internationalAppNumber: 'PCT/US2021/065120', publicationNumber: 'WO2022140892A1', isMockFallback: true },
      },
    ];
  }
}
