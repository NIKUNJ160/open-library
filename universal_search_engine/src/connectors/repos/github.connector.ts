import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class GithubConnector extends BaseConnector {
  readonly name = 'github';
  readonly displayName = 'GitHub Repositories';
  readonly category = ContentType.REPO;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected getApiKey(): string | undefined {
    return process.env.GITHUB_TOKEN;
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'awesome');
    const limit = query.limit || 10;
    const page = query.page || 1;
    const token = this.getApiKey();

    const headers: Record<string, string> = {
      'User-Agent': 'UniversalSearchEngine/1.0',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `https://api.github.com/search/repositories?q=${q}&per_page=${limit}&page=${page}`;
    const data = await this.fetchWithTimeout<any>(url, headers);
    const items = data?.items || [];

    return items.map((repo: any) => ({
      id: `github:${repo.full_name}`,
      title: repo.full_name,
      authors: [{ name: repo.owner?.login || 'GitHub User' }],
      description: repo.description || 'Open source software repository on GitHub.',
      url: repo.html_url,
      publishedDate: repo.pushed_at || repo.created_at,
      contentType: ContentType.REPO,
      sourceName: this.name,
      metadata: {
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        license: repo.license?.spdx_id,
        openIssues: repo.open_issues_count,
      },
    }));
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Machine Learning';
    return [
      {
        id: 'github:tensorflow/tensorflow',
        title: `tensorflow/tensorflow (${q})`,
        authors: [{ name: 'tensorflow' }],
        description: 'An open source machine learning framework for everyone created by Google Research.',
        url: 'https://github.com/tensorflow/tensorflow',
        publishedDate: '2023-10-01',
        contentType: ContentType.REPO,
        sourceName: this.name,
        score: 0.99,
        metadata: { stars: 182000, forks: 89000, language: 'C++', license: 'Apache-2.0', isMockFallback: true },
      },
      {
        id: 'github:pytorch/pytorch',
        title: `pytorch/pytorch (${q})`,
        authors: [{ name: 'pytorch' }],
        description: 'Tensors and Dynamic neural networks in Python with strong GPU acceleration.',
        url: 'https://github.com/pytorch/pytorch',
        publishedDate: '2023-10-05',
        contentType: ContentType.REPO,
        sourceName: this.name,
        score: 0.98,
        metadata: { stars: 78000, forks: 21000, language: 'Python', license: 'BSD-3-Clause', isMockFallback: true },
      },
    ];
  }
}
