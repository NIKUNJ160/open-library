import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

/**
 * Python Documentation Connector
 * Source: https://docs.python.org/3/ (Python docs search API)
 * Uses the official Python documentation search endpoint.
 * License: Python Software Foundation License | No API key required.
 */
@Injectable()
export class PythonDocsConnector extends BaseConnector {
  readonly name = 'python-docs';
  readonly displayName = 'Python Documentation';
  readonly category = ContentType.DOCUMENTATION;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'python');
    const limit = Math.min(query.limit || 10, 20);

    // Python docs uses Sphinx search — query the JSON search index
    const url = `https://docs.python.org/3/search.html?q=${q}&check_keywords=yes&area=default`;

    // Python docs doesn't have a public JSON API, so use the Sphinx opensearch endpoint
    // that returns JSON results via the _sphinx_opensearch endpoint
    const searchUrl = `https://docs.python.org/3/search.html?q=${q}&count=${limit}`;

    // Fallback to searching the Python docs via GitHub code search on cpython repo
    const ghQ = encodeURIComponent(`${query.q} repo:python/cpython path:Doc extension:rst`);
    const ghUrl = `https://api.github.com/search/code?q=${ghQ}&per_page=${limit}`;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;

    const data = await this.fetchWithTimeout<any>(ghUrl, headers);
    const items: any[] = data?.items || [];

    return items.map((item: any) => {
      const rawPath: string = item.path || '';
      const docPath = rawPath
        .replace('Doc/', '')
        .replace(/\.rst$/, '')
        .replace(/\/index$/, '/');
      const pyUrl = `https://docs.python.org/3/${docPath}.html`;
      const title = (item.name || rawPath.split('/').pop() || 'doc')
        .replace(/\.rst$/, '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      return {
        id: `python-docs:${item.sha}`,
        title,
        authors: [{ name: 'Python Software Foundation' }],
        description: `Official Python 3 documentation: ${rawPath}`,
        url: pyUrl,
        publishedDate: undefined,
        contentType: ContentType.DOCUMENTATION,
        sourceName: this.name,
        language: 'en',
        license: 'Python Software Foundation License',
        metadata: {
          path: rawPath,
          repo: 'python/cpython',
          sha: item.sha,
          githubUrl: item.html_url,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'python';
    return [
      {
        id: 'python-docs:asyncio-overview',
        title: `asyncio — Asynchronous I/O (${q})`,
        authors: [{ name: 'Python Software Foundation' }],
        description: 'asyncio is a library to write concurrent code using the async/await syntax.',
        url: 'https://docs.python.org/3/library/asyncio.html',
        publishedDate: undefined,
        contentType: ContentType.DOCUMENTATION,
        sourceName: this.name,
        score: 0.98,
        language: 'en',
        license: 'Python Software Foundation License',
        metadata: { section: 'library', isMockFallback: true },
      },
      {
        id: 'python-docs:dataclasses',
        title: `dataclasses — Data Classes (${q})`,
        authors: [{ name: 'Python Software Foundation' }],
        description: 'This module provides a decorator and functions for automatically adding generated special methods to classes.',
        url: 'https://docs.python.org/3/library/dataclasses.html',
        publishedDate: undefined,
        contentType: ContentType.DOCUMENTATION,
        sourceName: this.name,
        score: 0.95,
        language: 'en',
        license: 'Python Software Foundation License',
        metadata: { section: 'library', isMockFallback: true },
      },
    ];
  }
}
