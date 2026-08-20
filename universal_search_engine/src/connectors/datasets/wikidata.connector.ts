import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

/**
 * Wikidata Connector — SPARQL Query Service
 * API: https://query.wikidata.org/sparql
 * License: CC0 1.0 | No API key required.
 */
@Injectable()
export class WikidataConnector extends BaseConnector {
  readonly name = 'wikidata';
  readonly displayName = 'Wikidata';
  readonly category = ContentType.KNOWLEDGE;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = (query.q || 'knowledge').replace(/"/g, '\\"');
    const limit = Math.min(query.limit || 10, 50);

    const sparql = `
SELECT ?item ?itemLabel ?itemDescription ?article WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:api "EntitySearch" ;
                    wikibase:endpoint "www.wikidata.org" ;
                    mwapi:search "${q}" ;
                    mwapi:language "en" .
    ?item wikibase:apiOutputItem mwapi:item .
  }
  OPTIONAL {
    ?article schema:about ?item ;
             schema:inLanguage "en" ;
             schema:isPartOf <https://en.wikipedia.org/> .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
} LIMIT ${limit}`.trim();

    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;

    const data = await this.fetchWithTimeout<any>(url, {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'UniversalKnowledgeEngine/1.0',
    });

    const bindings: any[] = data?.results?.bindings || [];
    return bindings.map((row: any) => {
      const qid = row.item?.value?.split('/').pop() || '';
      const label = row.itemLabel?.value || qid;
      const desc = row.itemDescription?.value || 'Wikidata structured knowledge entity.';
      const wpUrl = row.article?.value;

      return {
        id: `wikidata:${qid}`,
        title: label,
        authors: [{ name: 'Wikidata Contributors' }],
        description: desc,
        url: wpUrl || `https://www.wikidata.org/wiki/${qid}`,
        publishedDate: undefined,
        contentType: ContentType.KNOWLEDGE,
        sourceName: this.name,
        language: 'en',
        license: 'CC0 1.0',
        metadata: { qid, wikidataUrl: `https://www.wikidata.org/wiki/${qid}`, wikipediaUrl: wpUrl },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'knowledge';
    return [
      {
        id: 'wikidata:Q11660',
        title: `Artificial intelligence (${q})`,
        authors: [{ name: 'Wikidata Contributors' }],
        description: 'Intelligence of machines or software, as opposed to the intelligence of humans or animals.',
        url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
        publishedDate: undefined,
        contentType: ContentType.KNOWLEDGE,
        sourceName: this.name,
        score: 0.98,
        license: 'CC0 1.0',
        metadata: { qid: 'Q11660', isMockFallback: true },
      },
      {
        id: 'wikidata:Q2013',
        title: `Wikidata (${q})`,
        authors: [{ name: 'Wikidata Contributors' }],
        description: 'Free and open knowledge base that can be read and edited by both humans and machines.',
        url: 'https://en.wikipedia.org/wiki/Wikidata',
        publishedDate: undefined,
        contentType: ContentType.KNOWLEDGE,
        sourceName: this.name,
        score: 0.92,
        license: 'CC0 1.0',
        metadata: { qid: 'Q2013', isMockFallback: true },
      },
    ];
  }
}
