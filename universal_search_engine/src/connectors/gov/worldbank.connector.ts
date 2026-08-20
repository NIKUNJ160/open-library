import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class WorldBankConnector extends BaseConnector {
  readonly name = 'worldbank';
  readonly displayName = 'World Bank Documents';
  readonly category = ContentType.GOV;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'economics');
    const limit = query.limit || 10;
    const url = `https://api.worldbank.org/v2/documentSearch?qterm=${q}&format=json&rows=${limit}`;

    const data = await this.fetchWithTimeout<any>(url);
    const documentsObj = data?.documents || {};
    const docs = Object.values(documentsObj).filter((d: any) => typeof d === 'object' && d?.id);

    return docs.map((doc: any) => {
      const authorField = doc.authors?.author;
      const authors = authorField
        ? Array.isArray(authorField)
          ? authorField.map((name: string) => ({ name }))
          : [{ name: authorField }]
        : [{ name: 'World Bank Group' }];

      return {
        id: `worldbank:${doc.id}`,
        title: doc.display_title || doc.docdt || 'Untitled World Bank Document',
        authors,
        description: doc.abstract || 'World Bank public knowledge and economic research publication.',
        url: doc.pdfurl || doc.guid || 'https://documents.worldbank.org/',
        publishedDate: doc.docdt,
        contentType: ContentType.GOV,
        sourceName: this.name,
        metadata: {
          country: doc.count,
          docType: doc.docty,
          reportNumber: doc.repnb,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Global Poverty';
    return [
      {
        id: 'worldbank:1742091',
        title: `World Development Report: Data for Better Lives (${q})`,
        authors: [{ name: 'World Bank Group' }],
        description: 'Examining the potential of data for improving economic development, governance, and poverty reduction.',
        url: 'https://documents.worldbank.org/en/publication/documents-reports/documentdetail/1742091',
        publishedDate: '2021-03-24',
        contentType: ContentType.GOV,
        sourceName: this.name,
        score: 0.96,
        metadata: { country: 'World', docType: 'World Development Report', isMockFallback: true },
      },
      {
        id: 'worldbank:3890123',
        title: `Global Economic Prospects: Sub-Saharan Africa Analysis (${q})`,
        authors: [{ name: 'Indermit Gill' }, { name: 'Ayhan Kose' }],
        description: 'Semi-annual economic growth projections, inflation forecasts, and fiscal sustainability assessments.',
        url: 'https://documents.worldbank.org/en/publication/documents-reports/documentdetail/3890123',
        publishedDate: '2023-01-10',
        contentType: ContentType.GOV,
        sourceName: this.name,
        score: 0.93,
        metadata: { country: 'Sub-Saharan Africa', docType: 'Economic Report', isMockFallback: true },
      },
    ];
  }
}
