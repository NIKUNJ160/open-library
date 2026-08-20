import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

/**
 * GitLab Connector — REST API v4
 * API: https://docs.gitlab.com/api/rest/
 * Endpoint: https://gitlab.com/api/v4/projects?search={q}&order_by=star_count
 * Auth: Optional GITLAB_TOKEN for higher rate limits (50 req/min vs 10 req/min).
 */
@Injectable()
export class GitlabConnector extends BaseConnector {
  readonly name = 'gitlab';
  readonly displayName = 'GitLab';
  readonly category = ContentType.CODE;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected getApiKey(): string | undefined {
    return process.env.GITLAB_TOKEN;
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'open source');
    const limit = Math.min(query.limit || 10, 20);
    const url =
      `https://gitlab.com/api/v4/projects?search=${q}&order_by=star_count` +
      `&sort=desc&per_page=${limit}&visibility=public`;

    const headers: Record<string, string> = {};
    const token = this.getApiKey();
    if (token) headers['PRIVATE-TOKEN'] = token;

    const data = await this.fetchWithTimeout<any[]>(url, headers);
    const repos: any[] = Array.isArray(data) ? data : [];

    return repos.map((repo: any) => ({
      id: `gitlab:${repo.id}`,
      title: repo.name_with_namespace || repo.name,
      authors: [{ name: repo.namespace?.name || 'Unknown' }],
      description: repo.description || 'Open-source repository hosted on GitLab.',
      url: repo.web_url,
      publishedDate: repo.created_at?.substring(0, 10),
      updatedDate: repo.last_activity_at?.substring(0, 10),
      contentType: ContentType.CODE,
      sourceName: this.name,
      language: repo.predominant_language || undefined,
      license: repo.license?.name || undefined,
      tags: repo.topics || repo.tag_list || [],
      repositoryUrl: repo.web_url,
      metadata: {
        stars: repo.star_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        visibility: repo.visibility,
        defaultBranch: repo.default_branch,
        namespace: repo.namespace?.kind,
      },
    }));
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'open source';
    return [
      {
        id: 'gitlab:278964',
        title: `GitLab / gitlab-foss (${q})`,
        authors: [{ name: 'GitLab' }],
        description: 'GitLab Community Edition — a complete DevOps platform.',
        url: 'https://gitlab.com/gitlab-org/gitlab-foss',
        publishedDate: '2011-10-08',
        updatedDate: '2024-01-15',
        contentType: ContentType.CODE,
        sourceName: this.name,
        score: 0.97,
        language: 'Ruby',
        license: 'MIT',
        tags: ['devops', 'git', 'ci-cd'],
        repositoryUrl: 'https://gitlab.com/gitlab-org/gitlab-foss',
        metadata: { stars: 23000, forks: 6000, isMockFallback: true },
      },
      {
        id: 'gitlab:7764219',
        title: `GNOME / gnome-shell (${q})`,
        authors: [{ name: 'GNOME' }],
        description: 'Next generation GNOME shell, a core component of the GNOME desktop environment.',
        url: 'https://gitlab.gnome.org/GNOME/gnome-shell',
        publishedDate: '2010-12-01',
        updatedDate: '2024-01-10',
        contentType: ContentType.CODE,
        sourceName: this.name,
        score: 0.93,
        language: 'JavaScript',
        license: 'GPL-2.0',
        tags: ['gnome', 'desktop', 'linux'],
        repositoryUrl: 'https://gitlab.gnome.org/GNOME/gnome-shell',
        metadata: { stars: 1800, forks: 250, isMockFallback: true },
      },
    ];
  }
}
