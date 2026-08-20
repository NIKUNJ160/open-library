import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class HuggingFaceConnector extends BaseConnector {
  readonly name = 'huggingface';
  readonly displayName = 'Hugging Face Datasets';
  readonly category = ContentType.DATASET;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'text');
    const limit = query.limit || 10;
    const url = `https://huggingface.co/api/datasets?search=${q}&limit=${limit}`;

    const data = await this.fetchWithTimeout<any[]>(url);
    const datasets = Array.isArray(data) ? data : [];

    return datasets.map((item: any) => {
      const author = item.author || (item.id.includes('/') ? item.id.split('/')[0] : 'HuggingFace User');
      return {
        id: `huggingface:${item.id}`,
        title: item.id,
        authors: [{ name: author }],
        description: item.description || `Hugging Face dataset repository: ${item.id}`,
        url: `https://huggingface.co/datasets/${item.id}`,
        publishedDate: item.lastModified,
        contentType: ContentType.DATASET,
        sourceName: this.name,
        metadata: {
          downloads: item.downloads,
          likes: item.likes,
          tags: item.tags?.slice(0, 5),
          private: item.private,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'NLP';
    return [
      {
        id: 'huggingface:rajpurkar/squad',
        title: `Stanford Question Answering Dataset (SQuAD) (${q})`,
        authors: [{ name: 'rajpurkar' }],
        description: 'Reading comprehension dataset consisting of questions posed by crowdworkers on Wikipedia articles.',
        url: 'https://huggingface.co/datasets/rajpurkar/squad',
        publishedDate: '2022-03-01',
        contentType: ContentType.DATASET,
        sourceName: this.name,
        score: 0.98,
        metadata: { downloads: 850000, likes: 450, tags: ['qa', 'en', 'wikipedia'], isMockFallback: true },
      },
      {
        id: 'huggingface:mozilla-foundation/common_voice_11_0',
        title: `Common Voice Corpus 11.0 (${q})`,
        authors: [{ name: 'mozilla-foundation' }],
        description: 'Multilingual speech dataset containing thousands of hours of voice recordings contributed by volunteers.',
        url: 'https://huggingface.co/datasets/mozilla-foundation/common_voice_11_0',
        publishedDate: '2022-09-20',
        contentType: ContentType.DATASET,
        sourceName: this.name,
        score: 0.94,
        metadata: { downloads: 320000, likes: 620, tags: ['audio', 'speech-recognition'], isMockFallback: true },
      },
    ];
  }
}
