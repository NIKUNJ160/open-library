import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

/**
 * Sourcegraph Connector — GraphQL API (STUB)
 * API: https://sourcegraph.com/docs/api
 * Note: Public Sourcegraph API requires a token. This connector returns
 * high-quality mock results until a SOURCEGRAPH_TOKEN is configured.
 * Set SOURCEGRAPH_TOKEN in .env to enable live searches.
 */
@Injectable()
export class SourcegraphConnector extends BaseConnector {
  readonly name = 'sourcegraph';
  readonly displayName = 'Sourcegraph';
  readonly category = ContentType.CODE;
  readonly requiresApiKey = true;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected getApiKey(): string | undefined {
    return process.env.SOURCEGRAPH_TOKEN;
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const token = this.getApiKey();
    const q = encodeURIComponent(query.q || 'function');
    const limit = Math.min(query.limit || 10, 20);

    const graphqlQuery = JSON.stringify({
      query: `{
        search(query: "${query.q} count:${limit}", version: V3) {
          results {
            results {
              ... on FileMatch {
                file { path url }
                repository { name url }
                lineMatches { preview lineNumber }
              }
            }
          }
        }
      }`,
    });

    const data = await this.fetchWithTimeout<any>(
      'https://sourcegraph.com/.api/graphql',
      {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
      },
    );

    const matches = data?.data?.search?.results?.results || [];
    return matches.slice(0, limit).map((match: any, i: number) => ({
      id: `sourcegraph:${match.repository?.name?.replace(/\//g, '_')}_${i}`,
      title: `${match.repository?.name}: ${match.file?.path}`,
      authors: [{ name: match.repository?.name?.split('/')[0] || 'Unknown' }],
      description: match.lineMatches?.[0]?.preview?.trim() || 'Code match on Sourcegraph.',
      url: match.file?.url || match.repository?.url || 'https://sourcegraph.com',
      publishedDate: undefined,
      contentType: ContentType.CODE,
      sourceName: this.name,
      repositoryUrl: match.repository?.url,
      metadata: {
        repository: match.repository?.name,
        filePath: match.file?.path,
        lineMatches: match.lineMatches?.length || 0,
      },
    }));
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'search';
    return [
      {
        id: 'sourcegraph:github.com_torvalds_linux_kernel_sched_core.c',
        title: `torvalds/linux: kernel/sched/core.c (${q})`,
        authors: [{ name: 'Linus Torvalds' }],
        description: `Core Linux kernel scheduler implementation matching "${q}".`,
        url: 'https://sourcegraph.com/github.com/torvalds/linux/-/blob/kernel/sched/core.c',
        publishedDate: undefined,
        contentType: ContentType.CODE,
        sourceName: this.name,
        score: 0.94,
        repositoryUrl: 'https://github.com/torvalds/linux',
        metadata: { repository: 'torvalds/linux', filePath: 'kernel/sched/core.c', isMockFallback: true },
      },
      {
        id: 'sourcegraph:github.com_golang_go_src_runtime_proc.go',
        title: `golang/go: src/runtime/proc.go (${q})`,
        authors: [{ name: 'Go Team' }],
        description: `Go runtime goroutine scheduler implementation matching "${q}".`,
        url: 'https://sourcegraph.com/github.com/golang/go/-/blob/src/runtime/proc.go',
        publishedDate: undefined,
        contentType: ContentType.CODE,
        sourceName: this.name,
        score: 0.91,
        repositoryUrl: 'https://github.com/golang/go',
        metadata: { repository: 'golang/go', filePath: 'src/runtime/proc.go', isMockFallback: true },
      },
    ];
  }
}
