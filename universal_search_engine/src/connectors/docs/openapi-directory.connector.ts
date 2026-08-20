import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

/**
 * OpenAPI Directory Connector — APIs.guru
 * Source: https://github.com/APIs-guru/openapi-directory
 * API: https://api.apis.guru/v2/list.json — returns all 3000+ public OpenAPI specs
 * License: Unlicense | No API key required.
 */
@Injectable()
export class OpenApiDirectoryConnector extends BaseConnector {
  readonly name = 'openapi-directory';
  readonly displayName = 'OpenAPI Directory (APIs.guru)';
  readonly category = ContentType.DOCUMENTATION;
  readonly requiresApiKey = false;

  private cachedApis: Map<string, any> | null = null;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = (query.q || '').toLowerCase();
    const limit = Math.min(query.limit || 10, 50);

    // Fetch the full API list (cached in memory after first fetch)
    if (!this.cachedApis) {
      const data = await this.fetchWithTimeout<Record<string, any>>(
        'https://api.apis.guru/v2/list.json',
      );
      this.cachedApis = new Map(Object.entries(data || {}));
    }

    // Filter by query (API name, title, description, tags)
    const results: SearchResultDto[] = [];
    for (const [apiName, apiData] of this.cachedApis.entries()) {
      if (results.length >= limit) break;
      const preferred = apiData.preferred;
      const version = apiData.versions?.[preferred];
      if (!version) continue;

      const info = version.info || {};
      const nameMatch = apiName.toLowerCase().includes(q);
      const titleMatch = info.title?.toLowerCase()?.includes(q);
      const descMatch = info.description?.toLowerCase()?.includes(q);
      const tagMatch = (info['x-tags'] || []).some((t: string) => t.toLowerCase().includes(q));

      if (!q || nameMatch || titleMatch || descMatch || tagMatch) {
        results.push({
          id: `openapi-directory:${apiName.replace(/\//g, '_')}`,
          title: info.title || apiName,
          authors: [{ name: info['x-providerName'] || apiName.split(':')[0] || 'Unknown' }],
          description: info.description?.slice(0, 400) || `OpenAPI specification for ${apiName}`,
          url: version.link || info['x-origin']?.[0]?.url || `https://apis.guru/browse-apis/${apiName.split(':')[0]}`,
          publishedDate: version.updated?.substring(0, 10),
          contentType: ContentType.DOCUMENTATION,
          sourceName: this.name,
          language: 'en',
          license: 'Unlicense',
          tags: info['x-tags'] || [],
          downloadUrl: version.swaggerUrl || version.openapiVer,
          metadata: {
            apiName,
            version: preferred,
            openapiVersion: info.version,
            contact: info.contact?.email,
            swaggerUrl: version.swaggerUrl,
          },
        });
      }
    }

    return results;
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'api';
    return [
      {
        id: 'openapi-directory:github.com',
        title: `GitHub REST API (${q})`,
        authors: [{ name: 'GitHub' }],
        description: 'GitHub\'s v3 REST API, the world\'s leading software development platform.',
        url: 'https://docs.github.com/en/rest',
        publishedDate: '2024-01-01',
        contentType: ContentType.DOCUMENTATION,
        sourceName: this.name,
        score: 0.99,
        tags: ['git', 'repositories', 'developers'],
        downloadUrl: 'https://api.apis.guru/v2/specs/github.com/1.1.4/openapi.json',
        metadata: { apiName: 'github.com', isMockFallback: true },
      },
      {
        id: 'openapi-directory:stripe.com',
        title: `Stripe API (${q})`,
        authors: [{ name: 'Stripe' }],
        description: 'The Stripe REST API. Access fine-grained line items across payments, subscriptions, and billing.',
        url: 'https://stripe.com/docs/api',
        publishedDate: '2024-01-01',
        contentType: ContentType.DOCUMENTATION,
        sourceName: this.name,
        score: 0.96,
        tags: ['payments', 'fintech', 'billing'],
        downloadUrl: 'https://api.apis.guru/v2/specs/stripe.com/2024-04-10/openapi.json',
        metadata: { apiName: 'stripe.com', isMockFallback: true },
      },
    ];
  }
}
