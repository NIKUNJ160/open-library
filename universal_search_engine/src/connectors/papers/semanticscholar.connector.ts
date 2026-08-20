import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class SemanticScholarConnector extends BaseConnector {
  readonly name = 'semanticscholar';
  readonly displayName = 'Semantic Scholar';
  readonly category = ContentType.PAPER;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'transformer');
    const limit = query.limit || 10;
    const offset = ((query.page || 1) - 1) * limit;
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${q}&limit=${limit}&offset=${offset}&fields=paperId,title,abstract,authors,year,url,externalIds`;

    const data = await this.fetchWithTimeout<any>(url);
    const papers = data?.data || [];

    return papers.map((item: any) => ({
      id: `semanticscholar:${item.paperId}`,
      title: item.title || 'Untitled Paper',
      authors: item.authors?.length
        ? item.authors.map((a: any) => ({ name: a.name }))
        : [{ name: 'Unknown Author' }],
      description: item.abstract || 'Semantic Scholar AI-indexed research paper.',
      url: item.url || `https://www.semanticscholar.org/paper/${item.paperId}`,
      publishedDate: item.year ? String(item.year) : undefined,
      contentType: ContentType.PAPER,
      sourceName: this.name,
      metadata: {
        doi: item.externalIds?.DOI,
        arxivId: item.externalIds?.ArXiv,
        magId: item.externalIds?.MAG,
      },
    }));
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Attention Mechanism';
    return [
      {
        id: 'semanticscholar:20420598e944415c9a54a99d3d01e2222bedd363',
        title: `Attention Is All You Need (${q})`,
        authors: [
          { name: 'Ashish Vaswani' },
          { name: 'Noam Shazeer' },
          { name: 'Niki Parmar' },
          { name: 'Jakob Uszkoreit' },
        ],
        description: 'We propose the Transformer, a model architecture based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
        url: 'https://www.semanticscholar.org/paper/20420598e944415c9a54a99d3d01e2222bedd363',
        publishedDate: '2017',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.99,
        metadata: { arxivId: '1706.03762', doi: '10.48550/arXiv.1706.03762', isMockFallback: true },
      },
      {
        id: 'semanticscholar:df2b0e26d0599ce3e70df8a9da02d5169480e643',
        title: `BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding (${q})`,
        authors: [{ name: 'Jacob Devlin' }, { name: 'Ming-Wei Chang' }, { name: 'Kenton Lee' }],
        description: 'Introduces BERT designed to pre-train deep bidirectional representations from unlabeled text.',
        url: 'https://www.semanticscholar.org/paper/df2b0e26d0599ce3e70df8a9da02d5169480e643',
        publishedDate: '2018',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.97,
        metadata: { arxivId: '1810.04805', isMockFallback: true },
      },
    ];
  }
}
