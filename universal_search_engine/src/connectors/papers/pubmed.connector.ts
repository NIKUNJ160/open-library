import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class PubMedConnector extends BaseConnector {
  readonly name = 'pubmed';
  readonly displayName = 'PubMed';
  readonly category = ContentType.PAPER;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'genomics');
    const limit = query.limit || 10;
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${q}&retmode=json&retmax=${limit}`;

    const searchData = await this.fetchWithTimeout<any>(searchUrl);
    const idList = searchData?.esearchresult?.idlist || [];
    if (!idList.length) return [];

    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(',')}&retmode=json`;
    const summaryData = await this.fetchWithTimeout<any>(summaryUrl);
    const resultObj = summaryData?.result || {};

    return idList.map((pmid: string) => {
      const doc = resultObj[pmid] || {};
      const authors = doc.authors?.length
        ? doc.authors.map((a: any) => ({ name: a.name }))
        : [{ name: 'PubMed Contributor' }];

      return {
        id: `pubmed:${pmid}`,
        title: doc.title || 'Untitled PubMed Article',
        authors,
        description: doc.source ? `Published in ${doc.source}. NCBI PubMed biomedical reference.` : 'PubMed biomedical article entry.',
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        publishedDate: doc.pubdate,
        contentType: ContentType.PAPER,
        sourceName: this.name,
        metadata: {
          pmid,
          journal: doc.source,
          volume: doc.volume,
          issue: doc.issue,
          pages: doc.pages,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'CRISPR Gene Editing';
    return [
      {
        id: 'pubmed:24310615',
        title: `Multiplex Genome Engineering Using CRISPR/Cas Systems (${q})`,
        authors: [{ name: 'Cong L' }, { name: 'Ran FA' }, { name: 'Cox D' }, { name: 'Lin S' }],
        description: 'Demonstrates functional Cas9-mediated genome editing in human and mouse cells.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24310615/',
        publishedDate: '2013-01-03',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.97,
        metadata: { pmid: '24310615', journal: 'Science', isMockFallback: true },
      },
      {
        id: 'pubmed:22961342',
        title: `A Programmable Dual-RNA-Guided DNA Endonuclease in Adaptive Bacterial Immunity (${q})`,
        authors: [{ name: 'Jinek M' }, { name: 'Chylinski K' }, { name: 'Fonfara I' }, { name: 'Doudna JA' }],
        description: 'Landmark paper describing the biochemical mechanism of CRISPR-Cas9 genome editing.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22961342/',
        publishedDate: '2012-08-17',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.98,
        metadata: { pmid: '22961342', journal: 'Science', isMockFallback: true },
      },
    ];
  }
}
