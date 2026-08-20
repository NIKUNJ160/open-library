import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class InternetArchiveConnector extends BaseConnector {
  readonly name = 'internetarchive';
  readonly displayName = 'Internet Archive';
  readonly category = ContentType.BOOK;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'science');
    const limit = query.limit || 10;
    const page = query.page || 1;
    const url = `https://archive.org/advancedsearch.php?q=${q}+AND+mediatype:(texts)&fl[]=identifier,title,creator,description,date,publicdate&rows=${limit}&page=${page}&output=json`;

    const data = await this.fetchWithTimeout<any>(url);
    const docs = data?.response?.docs || [];

    return docs.map((doc: any) => {
      const creator = doc.creator;
      const authors = creator
        ? Array.isArray(creator)
          ? creator.map((name: string) => ({ name }))
          : [{ name: creator }]
        : [{ name: 'Internet Archive Contributor' }];

      const description = doc.description
        ? Array.isArray(doc.description)
          ? doc.description[0]
          : doc.description
        : 'Digitized text collection item from Internet Archive.';

      return {
        id: `internetarchive:${doc.identifier}`,
        title: doc.title || doc.identifier,
        authors,
        description,
        url: `https://archive.org/details/${doc.identifier}`,
        publishedDate: doc.date || doc.publicdate,
        contentType: ContentType.BOOK,
        sourceName: this.name,
        metadata: {
          identifier: doc.identifier,
          mediatype: 'texts',
        },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Archive';
    return [
      {
        id: 'internetarchive:principiamathematic01newt',
        title: `Philosophiae Naturalis Principia Mathematica (${q})`,
        authors: [{ name: 'Isaac Newton' }],
        description: 'Digitized historic copy of Newton laws of motion and universal gravitation.',
        url: 'https://archive.org/details/principiamathematic01newt',
        publishedDate: '1687-07-05',
        contentType: ContentType.BOOK,
        sourceName: this.name,
        score: 0.95,
        metadata: { identifier: 'principiamathematic01newt', isMockFallback: true },
      },
      {
        id: 'internetarchive:originofspecies00darw',
        title: `On the Origin of Species by Means of Natural Selection (${q})`,
        authors: [{ name: 'Charles Darwin' }],
        description: 'Foundational work of evolutionary biology digitized by Internet Archive.',
        url: 'https://archive.org/details/originofspecies00darw',
        publishedDate: '1859-11-24',
        contentType: ContentType.BOOK,
        sourceName: this.name,
        score: 0.93,
        metadata: { identifier: 'originofspecies00darw', isMockFallback: true },
      },
    ];
  }
}
