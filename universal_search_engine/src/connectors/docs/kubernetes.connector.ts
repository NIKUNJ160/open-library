import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

/**
 * Kubernetes Documentation Connector
 * Source: https://github.com/kubernetes/website (GitHub Code Search API)
 * Searches official Kubernetes documentation markdown files.
 * License: CC BY 4.0 | Uses GitHub API (optional GITHUB_TOKEN for higher limits).
 */
@Injectable()
export class KubernetesDocsConnector extends BaseConnector {
  readonly name = 'kubernetes-docs';
  readonly displayName = 'Kubernetes Documentation';
  readonly category = ContentType.DOCUMENTATION;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected getApiKey(): string | undefined {
    return process.env.GITHUB_TOKEN;
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(`${query.q || 'kubernetes'} repo:kubernetes/website path:content/en/docs extension:md`);
    const limit = Math.min(query.limit || 10, 30);
    const url = `https://api.github.com/search/code?q=${q}&per_page=${limit}`;

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
      // Convert GitHub path to kubernetes.io URL
      const docPath = rawPath
        .replace('content/en/docs/', '')
        .replace('content/en/', '')
        .replace(/_index\.md$/, '/')
        .replace(/\.md$/, '/');
      const k8sUrl = `https://kubernetes.io/docs/${docPath}`;
      const title = (item.name || rawPath.split('/').pop() || 'doc')
        .replace(/\.md$/, '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      return {
        id: `kubernetes-docs:${item.sha}`,
        title,
        authors: [{ name: 'Kubernetes Community' }],
        description: `Official Kubernetes documentation: ${rawPath}`,
        url: k8sUrl,
        publishedDate: undefined,
        contentType: ContentType.DOCUMENTATION,
        sourceName: this.name,
        language: 'en',
        license: 'CC BY 4.0',
        metadata: {
          path: rawPath,
          repo: 'kubernetes/website',
          sha: item.sha,
          githubUrl: item.html_url,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'kubernetes';
    return [
      {
        id: 'kubernetes-docs:k8s-pods-overview',
        title: `Pods (${q})`,
        authors: [{ name: 'Kubernetes Community' }],
        description: 'Pods are the smallest deployable units of computing that you can create and manage in Kubernetes.',
        url: 'https://kubernetes.io/docs/concepts/workloads/pods/',
        publishedDate: undefined,
        contentType: ContentType.DOCUMENTATION,
        sourceName: this.name,
        score: 0.98,
        language: 'en',
        license: 'CC BY 4.0',
        metadata: { path: 'content/en/docs/concepts/workloads/pods/_index.md', isMockFallback: true },
      },
      {
        id: 'kubernetes-docs:k8s-deployments',
        title: `Deployments (${q})`,
        authors: [{ name: 'Kubernetes Community' }],
        description: 'A Deployment provides declarative updates for Pods and ReplicaSets.',
        url: 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/',
        publishedDate: undefined,
        contentType: ContentType.DOCUMENTATION,
        sourceName: this.name,
        score: 0.96,
        language: 'en',
        license: 'CC BY 4.0',
        metadata: { path: 'content/en/docs/concepts/workloads/controllers/deployment.md', isMockFallback: true },
      },
    ];
  }
}
