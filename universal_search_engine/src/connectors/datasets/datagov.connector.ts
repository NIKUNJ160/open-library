import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class DataGovConnector extends BaseConnector {
  readonly name = 'datagov';
  readonly displayName = 'Data.gov';
  readonly category = ContentType.DATASET;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'climate');
    const limit = query.limit || 10;
    const start = ((query.page || 1) - 1) * limit;
    const url = `https://catalog.data.gov/api/3/action/package_search?q=${q}&rows=${limit}&start=${start}`;

    const data = await this.fetchWithTimeout<any>(url);
    const packages = data?.result?.results || [];

    return packages.map((item: any) => ({
      id: `datagov:${item.id}`,
      title: item.title || item.name || 'Untitled Data.gov Package',
      authors: [{ name: item.author || item.organization?.title || 'U.S. Federal Government' }],
      description: item.notes || 'Open data package published on Data.gov catalog.',
      url: `https://catalog.data.gov/dataset/${item.name || item.id}`,
      publishedDate: item.metadata_modified || item.metadata_created,
      contentType: ContentType.DATASET,
      sourceName: this.name,
      metadata: {
        publisher: item.organization?.title,
        resourcesCount: item.resources?.length,
        maintainer: item.maintainer,
      },
    }));
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Environmental Data';
    return [
      {
        id: 'datagov:noaa-climate-normals-2020',
        title: `NOAA U.S. Climate Normals 1991-2020 (${q})`,
        authors: [{ name: 'National Oceanic and Atmospheric Administration' }],
        description: '30-year average meteorological observations of temperature, precipitation, and climate metrics across the US.',
        url: 'https://catalog.data.gov/dataset/noaa-climate-normals-2020',
        publishedDate: '2021-05-04',
        contentType: ContentType.DATASET,
        sourceName: this.name,
        score: 0.95,
        metadata: { publisher: 'NOAA / Department of Commerce', resourcesCount: 12, isMockFallback: true },
      },
      {
        id: 'datagov:usda-food-data-central',
        title: `USDA FoodData Central Nutritional Dataset (${q})`,
        authors: [{ name: 'U.S. Department of Agriculture' }],
        description: 'Comprehensive data on nutrients and food components for agricultural and health research.',
        url: 'https://catalog.data.gov/dataset/usda-food-data-central',
        publishedDate: '2023-04-18',
        contentType: ContentType.DATASET,
        sourceName: this.name,
        score: 0.93,
        metadata: { publisher: 'USDA Agricultural Research Service', resourcesCount: 8, isMockFallback: true },
      },
    ];
  }
}
