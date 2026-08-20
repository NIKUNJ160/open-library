import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class EuropePmcConnector extends BaseConnector {
  readonly name = 'europepmc';
  readonly displayName = 'Europe PMC';
  readonly category = ContentType.PAPER;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'bioinformatics');
    const limit = query.limit || 10;
    const page = query.page || 1;
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${q}&format=json&pageSize=${limit}&page=${page}`;

    const data = await this.fetchWithTimeout<any>(url);
    const results = data?.resultList?.result || [];

    return results.map((item: any) => {
      const authors = item.authorString
        ? item.authorString.split(', ').map((name: string) => ({ name }))
        : [{ name: 'Unknown Author' }];

      return {
        id: `europepmc:${item.id}`,
        title: item.title || 'Untitled Europe PMC Article',
        authors,
        description: item.abstractText || 'Life science article indexed by Europe PMC.',
        url: item.doi ? `https://doi.org/${item.doi}` : `https://europepmc.org/article/${item.source || 'MED'}/${item.id}`,
        publishedDate: item.firstPublicationDate,
        contentType: ContentType.PAPER,
        sourceName: this.name,
        metadata: {
          doi: item.doi,
          journal: item.journalTitle,
          pmcid: item.pmcid,
          citedByCount: item.citedByCount,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Molecular Biology';
    return [
      {
        id: 'europepmc:PMC3087412',
        title: `The European Bioinformatics Institute Database Infrastructure (${q})`,
        authors: [{ name: 'Brooksbank C' }, { name: 'McEntyre J' }, { name: 'Apweiler R' }],
        description: 'Comprehensive overview of biological database platforms and open access life science archives at EMBL-EBI.',
        url: 'https://europepmc.org/article/PMC/PMC3087412',
        publishedDate: '2010-11-20',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.94,
        metadata: { pmcid: 'PMC3087412', isMockFallback: true },
      },
      {
        id: 'europepmc:PMC4281320',
        title: `UniProt: the universal protein knowledgebase (${q})`,
        authors: [{ name: 'The UniProt Consortium' }],
        description: 'Central hub for protein sequence and functional annotation resources.',
        url: 'https://europepmc.org/article/PMC/PMC4281320',
        publishedDate: '2014-10-16',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.96,
        metadata: { pmcid: 'PMC4281320', isMockFallback: true },
      },
    ];
  }
}
