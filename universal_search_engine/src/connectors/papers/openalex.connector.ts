import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class OpenAlexConnector extends BaseConnector {
  readonly name = 'openalex';
  readonly displayName = 'OpenAlex';
  readonly category = ContentType.PAPER;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'machine learning');
    const limit = query.limit || 10;
    const page = query.page || 1;
    const url = `https://api.openalex.org/works?search=${q}&per_page=${limit}&page=${page}`;

    const data = await this.fetchWithTimeout<any>(url);
    const results = data?.results || [];

    return results.map((work: any) => {
      const cleanId = work.id ? work.id.replace('https://openalex.org/', '') : Math.random().toString(36).substring(7);
      const authors = work.authorships?.length
        ? work.authorships.map((a: any) => ({
            name: a.author?.display_name || 'Unknown Author',
            affiliation: a.institutions?.[0]?.display_name,
          }))
        : [{ name: 'Unknown Author' }];

      let description = 'OpenAlex paper metadata entry.';
      if (work.abstract_inverted_index) {
        description = this.reconstructAbstract(work.abstract_inverted_index);
      }

      return {
        id: `openalex:${cleanId}`,
        title: work.display_name || work.title || 'Untitled Work',
        authors,
        description,
        url: work.primary_location?.landing_page_url || work.doi || `https://openalex.org/${cleanId}`,
        publishedDate: work.publication_date || (work.publication_year ? String(work.publication_year) : undefined),
        contentType: ContentType.PAPER,
        sourceName: this.name,
        metadata: {
          doi: work.doi,
          citedByCount: work.cited_by_count,
          concepts: work.concepts?.slice(0, 5).map((c: any) => c.display_name),
        },
      };
    });
  }

  private reconstructAbstract(invertedIndex: Record<string, number[]>): string {
    const positionsMap: { [pos: number]: string } = {};
    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        positionsMap[pos] = word;
      }
    }
    const maxPos = Math.max(...Object.keys(positionsMap).map(Number));
    const words: string[] = [];
    for (let i = 0; i <= maxPos; i++) {
      if (positionsMap[i]) {
        words.push(positionsMap[i]);
      }
    }
    return words.join(' ');
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Deep Learning';
    return [
      {
        id: 'openalex:W2963403868',
        title: `Deep Learning in Neural Networks: An Overview (${q})`,
        authors: [{ name: 'Jürgen Schmidhuber', affiliation: 'IDSIA' }],
        description: 'Comprehensive overview of deep learning architectures, supervised learning, unsupervised learning, and reinforcement learning.',
        url: 'https://openalex.org/W2963403868',
        publishedDate: '2015-01-01',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.97,
        metadata: { doi: '10.1016/j.neunet.2014.09.003', citedByCount: 15400, isMockFallback: true },
      },
      {
        id: 'openalex:W2108182372',
        title: `Generative Adversarial Nets (${q})`,
        authors: [{ name: 'Ian Goodfellow' }, { name: 'Yoshua Bengio', affiliation: 'MILA' }],
        description: 'Proposes a framework for estimating generative models via an adversarial process.',
        url: 'https://openalex.org/W2108182372',
        publishedDate: '2014-06-10',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.95,
        metadata: { doi: '10.48550/arXiv.1406.2661', citedByCount: 42000, isMockFallback: true },
      },
    ];
  }
}
