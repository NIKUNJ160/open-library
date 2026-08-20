import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

/**
 * Our World in Data Connector — ETL REST API
 * API: https://docs.owid.io/projects/etl/api/
 * Endpoint: https://api.ourworldindata.org/v1/indicators.json
 * License: CC BY 4.0 | No API key required.
 */
@Injectable()
export class OwidConnector extends BaseConnector {
  readonly name = 'owid';
  readonly displayName = 'Our World in Data';
  readonly category = ContentType.DATASET;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'global development');
    const limit = Math.min(query.limit || 10, 50);
    // OWID search via indicators list endpoint
    const url = `https://api.ourworldindata.org/v1/indicators.json?search=${q}&per_page=${limit}`;

    const data = await this.fetchWithTimeout<any>(url);
    const indicators: any[] = data?.indicators || data?.results || data || [];
    const items = Array.isArray(indicators) ? indicators.slice(0, limit) : [];

    return items.map((item: any) => ({
      id: `owid:${item.id || item.catalogPath || Math.random().toString(36).slice(7)}`,
      title: item.title || item.name || 'Our World in Data Indicator',
      authors: [{ name: 'Our World in Data' }],
      description: item.descriptionShort || item.description || item.attribution ||
        'Global development and research indicator dataset.',
      url: item.grapherUrl || `https://ourworldindata.org/grapher/${item.slug || item.id}`,
      publishedDate: item.updatedAt?.substring(0, 10) || item.datePublished,
      contentType: ContentType.DATASET,
      sourceName: this.name,
      language: 'en',
      license: 'CC BY 4.0',
      tags: item.tags || item.topics || [],
      metadata: {
        unit: item.unit,
        shortUnit: item.shortUnit,
        source: item.source?.name || item.origins?.[0]?.title,
        catalogPath: item.catalogPath,
      },
    }));
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'global development';
    return [
      {
        id: 'owid:1001',
        title: `CO2 emissions per capita (${q})`,
        authors: [{ name: 'Our World in Data' }],
        description: 'Annual CO2 emissions per person, measured in tonnes of CO2 per year.',
        url: 'https://ourworldindata.org/grapher/co-emissions-per-capita',
        publishedDate: '2024-01-01',
        contentType: ContentType.DATASET,
        sourceName: this.name,
        score: 0.97,
        license: 'CC BY 4.0',
        tags: ['climate', 'emissions', 'environment'],
        metadata: { unit: 'tonnes per person', source: 'Global Carbon Project', isMockFallback: true },
      },
      {
        id: 'owid:1002',
        title: `Life expectancy at birth (${q})`,
        authors: [{ name: 'Our World in Data' }],
        description: 'Period life expectancy at birth, in years, across countries and world regions.',
        url: 'https://ourworldindata.org/grapher/life-expectancy',
        publishedDate: '2024-01-01',
        contentType: ContentType.DATASET,
        sourceName: this.name,
        score: 0.95,
        license: 'CC BY 4.0',
        tags: ['health', 'demographics', 'life expectancy'],
        metadata: { unit: 'years', source: 'UN World Population Prospects', isMockFallback: true },
      },
    ];
  }
}
