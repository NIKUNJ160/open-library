import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

/**
 * Microsoft Learn Documentation Connector
 * Source: https://github.com/MicrosoftDocs (GitHub Code Search API)
 * Searches official Microsoft Learn documentation across repos like:
 *   - MicrosoftDocs/azure-docs
 *   - MicrosoftDocs/windows-uwp
 *   - MicrosoftDocs/dotnet-docs
 * License: CC BY 4.0 | Optional GITHUB_TOKEN for higher rate limits.
 */
@Injectable()
export class MicrosoftLearnConnector extends BaseConnector {
  readonly name = 'microsoft-learn';
  readonly displayName = 'Microsoft Learn';
  readonly category = ContentType.DOCUMENTATION;
  readonly requiresApiKey = false;

  // Top MS Learn repos to search across
  private readonly msRepos = [
    'MicrosoftDocs/azure-docs',
    'MicrosoftDocs/windows-uwp',
    'dotnet/docs',
  ];

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected getApiKey(): string | undefined {
    return process.env.GITHUB_TOKEN;
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = query.q || 'azure';
    const limit = Math.min(query.limit || 10, 30);

    // Search across the primary MS docs repo
    const repoFilter = 'org:MicrosoftDocs extension:md';
    const searchQ = encodeURIComponent(`${q} ${repoFilter}`);
    const url = `https://api.github.com/search/code?q=${searchQ}&per_page=${limit}`;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const token = this.getApiKey();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const data = await this.fetchWithTimeout<any>(url, headers);
    const items: any[] = data?.items || [];

    return items.map((item: any) => {
      const rawPath: string = item.path || '';
      const repoName: string = item.repository?.full_name || '';
      const title = (item.name || rawPath.split('/').pop() || 'doc')
        .replace(/\.md$/, '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      // Build Microsoft Learn URL where possible
      let learnUrl = item.html_url;
      if (repoName === 'MicrosoftDocs/azure-docs') {
        const articlePath = rawPath.replace('articles/', '').replace('.md', '');
        learnUrl = `https://learn.microsoft.com/en-us/azure/${articlePath}`;
      }

      return {
        id: `microsoft-learn:${item.sha}`,
        title,
        authors: [{ name: 'Microsoft' }],
        description: `Official Microsoft Learn documentation: ${repoName}/${rawPath}`,
        url: learnUrl,
        publishedDate: undefined,
        contentType: ContentType.DOCUMENTATION,
        sourceName: this.name,
        language: 'en',
        license: 'CC BY 4.0',
        metadata: {
          path: rawPath,
          repo: repoName,
          sha: item.sha,
          githubUrl: item.html_url,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'azure';
    return [
      {
        id: 'microsoft-learn:ms-azure-functions-overview',
        title: `Azure Functions Overview (${q})`,
        authors: [{ name: 'Microsoft' }],
        description: 'Azure Functions is a serverless solution that allows you to write less code, maintain less infrastructure, and save on costs.',
        url: 'https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview',
        publishedDate: undefined,
        contentType: ContentType.DOCUMENTATION,
        sourceName: this.name,
        score: 0.97,
        language: 'en',
        license: 'CC BY 4.0',
        metadata: { repo: 'MicrosoftDocs/azure-docs', isMockFallback: true },
      },
      {
        id: 'microsoft-learn:ms-dotnet-aspnetcore',
        title: `ASP.NET Core Documentation (${q})`,
        authors: [{ name: 'Microsoft' }],
        description: 'ASP.NET Core is a cross-platform, high-performance, open-source framework for building modern cloud-enabled Internet-connected apps.',
        url: 'https://learn.microsoft.com/en-us/aspnet/core/',
        publishedDate: undefined,
        contentType: ContentType.DOCUMENTATION,
        sourceName: this.name,
        score: 0.94,
        language: 'en',
        license: 'CC BY 4.0',
        metadata: { repo: 'dotnet/docs', isMockFallback: true },
      },
    ];
  }
}
