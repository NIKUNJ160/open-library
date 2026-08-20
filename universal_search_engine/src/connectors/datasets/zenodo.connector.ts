import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class ZenodoConnector extends BaseConnector {
  readonly name = 'zenodo';
  readonly displayName = 'Zenodo';
  readonly category = ContentType.DATASET;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'dataset');
    const limit = query.limit || 10;
    const page = query.page || 1;
    const url = `https://zenodo.org/api/records/?q=${q}&size=${limit}&page=${page}`;

    const data = await this.fetchWithTimeout<any>(url);
    const hits = data?.hits?.hits || [];

    return hits.map((hit: any) => {
      const meta = hit.metadata || {};
      const authors = meta.creators?.length
        ? meta.creators.map((c: any) => ({ name: c.name, affiliation: c.affiliation }))
        : [{ name: 'Zenodo Creator' }];

      const description = meta.description
        ? meta.description.replace(/<[^>]*>?/gm, '').substring(0, 300)
        : 'Open research artifact hosted on Zenodo.';

      return {
        id: `zenodo:${hit.id}`,
        title: meta.title || 'Untitled Zenodo Record',
        authors,
        description,
        url: hit.links?.html || `https://zenodo.org/record/${hit.id}`,
        publishedDate: meta.publication_date,
        contentType: ContentType.DATASET,
        sourceName: this.name,
        metadata: {
          doi: meta.doi || hit.doi,
          resourceType: meta.resource_type?.type,
          accessRight: meta.access_right,
          license: meta.license?.id,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Astrophysics';
    return [
      {
        id: 'zenodo:3778301',
        title: `CERN Open Data Benchmark Dataset (${q})`,
        authors: [{ name: 'CERN Open Data Collaboration', affiliation: 'CERN' }],
        description: 'Proton-proton collision dataset recorded by the CMS detector at 8 TeV for open particle physics research.',
        url: 'https://zenodo.org/record/3778301',
        publishedDate: '2020-04-28',
        contentType: ContentType.DATASET,
        sourceName: this.name,
        score: 0.96,
        metadata: { doi: '10.5281/zenodo.3778301', resourceType: 'dataset', isMockFallback: true },
      },
      {
        id: 'zenodo:4582910',
        title: `Global Surface Temperature Anomaly Grids (${q})`,
        authors: [{ name: 'Hansen, James' }, { name: 'Sato, Makiko' }],
        description: 'Gridded monthly surface temperature anomaly dataset spanning 1880 to present.',
        url: 'https://zenodo.org/record/4582910',
        publishedDate: '2021-03-05',
        contentType: ContentType.DATASET,
        sourceName: this.name,
        score: 0.94,
        metadata: { doi: '10.5281/zenodo.4582910', resourceType: 'dataset', isMockFallback: true },
      },
    ];
  }
}
