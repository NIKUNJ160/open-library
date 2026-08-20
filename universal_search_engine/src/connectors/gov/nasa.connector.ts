import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class NasaConnector extends BaseConnector {
  readonly name = 'nasa';
  readonly displayName = 'NASA Technical Reports';
  readonly category = ContentType.GOV;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'aerodynamics');
    const limit = query.limit || 10;
    const url = `https://ntrs.nasa.gov/api/citations/search?q=${q}&page.size=${limit}`;

    const data = await this.fetchWithTimeout<any>(url);
    const results = data?.results || [];

    return results.map((item: any) => {
      const authors = item.authorAffiliations?.length
        ? item.authorAffiliations.map((a: any) => ({
            name: a.meta?.author?.name || 'NASA Researcher',
            affiliation: a.meta?.organization?.name,
          }))
        : [{ name: 'NASA Technical Reports Server' }];

      return {
        id: `nasa:${item.id}`,
        title: item.title || 'Untitled NASA Report',
        authors,
        description: item.abstract || 'NASA Technical Reports Server (NTRS) scientific publication.',
        url: `https://ntrs.nasa.gov/citations/${item.id}`,
        publishedDate: item.issueDate || item.publicationDate,
        contentType: ContentType.GOV,
        sourceName: this.name,
        metadata: {
          center: item.center?.name,
          subjectCategories: item.subjectCategories,
          documentType: item.documentType,
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Space Exploration';
    return [
      {
        id: 'nasa:19750004812',
        title: `Apollo Guidance Computer Software Architecture and Operations (${q})`,
        authors: [{ name: 'Eyles, Donald', affiliation: 'MIT Charles Stark Draper Laboratory' }],
        description: 'Technical document detailing the real-time operating system, priority scheduler, and lunar landing code.',
        url: 'https://ntrs.nasa.gov/citations/19750004812',
        publishedDate: '1975-01-01',
        contentType: ContentType.GOV,
        sourceName: this.name,
        score: 0.97,
        metadata: { center: 'Johnson Space Center', documentType: 'Technical Report', isMockFallback: true },
      },
      {
        id: 'nasa:20110014290',
        title: `Curiosity Rover Entry, Descent, and Landing Systems Overview (${q})`,
        authors: [{ name: 'Steltzner, Adam', affiliation: 'Jet Propulsion Laboratory' }],
        description: 'Engineering overview of the Sky Crane landing architecture deployed during the Mars Science Laboratory mission.',
        url: 'https://ntrs.nasa.gov/citations/20110014290',
        publishedDate: '2011-08-10',
        contentType: ContentType.GOV,
        sourceName: this.name,
        score: 0.95,
        metadata: { center: 'Jet Propulsion Laboratory', documentType: 'Conference Paper', isMockFallback: true },
      },
    ];
  }
}
