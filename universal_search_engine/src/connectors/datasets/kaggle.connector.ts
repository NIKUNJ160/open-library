import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class KaggleConnector extends BaseConnector {
  readonly name = 'kaggle';
  readonly displayName = 'Kaggle Datasets';
  readonly category = ContentType.DATASET;
  readonly requiresApiKey = true;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected getApiKey(): string | undefined {
    return process.env.KAGGLE_KEY && process.env.KAGGLE_USERNAME
      ? `${process.env.KAGGLE_USERNAME}:${process.env.KAGGLE_KEY}`
      : undefined;
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'machine learning');
    const page = query.page || 1;
    const creds = this.getApiKey();
    const headers: Record<string, string> = {};
    if (creds) {
      const auth = Buffer.from(creds).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const url = `https://www.kaggle.com/api/v1/datasets/list?search=${q}&page=${page}`;
    const data = await this.fetchWithTimeout<any[]>(url, headers);
    const datasets = Array.isArray(data) ? data : [];

    return datasets.map((ds: any) => ({
      id: `kaggle:${ds.ref}`,
      title: ds.title || ds.ref,
      authors: [{ name: ds.ownerName || ds.ownerRef || 'Kaggle User' }],
      description: ds.description || 'Kaggle machine learning and data science dataset.',
      url: `https://www.kaggle.com/datasets/${ds.ref}`,
      publishedDate: ds.lastUpdated,
      contentType: ContentType.DATASET,
      sourceName: this.name,
      metadata: {
        totalBytes: ds.totalBytes,
        downloadCount: ds.downloadCount,
        licenseName: ds.licenseName,
        voteCount: ds.voteCount,
      },
    }));
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Computer Vision';
    return [
      {
        id: 'kaggle:odd-mar-mnist',
        title: `MNIST Handwritten Digits Dataset (${q})`,
        authors: [{ name: 'Yann LeCun' }],
        description: '70,000 grayscale images of handwritten digits (0-9) formatted for machine learning benchmarks.',
        url: 'https://www.kaggle.com/datasets/odd-mar-mnist',
        publishedDate: '2021-02-15',
        contentType: ContentType.DATASET,
        sourceName: this.name,
        score: 0.98,
        metadata: { totalBytes: 11594000, downloadCount: 150000, licenseName: 'CC BY-SA 3.0', isMockFallback: true },
      },
      {
        id: 'kaggle:allen-cv-covid19-dataset',
        title: `CORD-19 COVID-19 Open Research Dataset (${q})`,
        authors: [{ name: 'Allen Institute for AI' }],
        description: 'Free resource of over 1,000,000 scholarly articles about COVID-19 and coronaviruses for NLP.',
        url: 'https://www.kaggle.com/datasets/allen-cv-covid19-dataset',
        publishedDate: '2022-05-10',
        contentType: ContentType.DATASET,
        sourceName: this.name,
        score: 0.95,
        metadata: { totalBytes: 8500000000, downloadCount: 98000, isMockFallback: true },
      },
    ];
  }
}
