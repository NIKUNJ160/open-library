import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

/**
 * EPO (European Patent Office) Connector — OPS API v3.2 (STUB)
 * API: https://developers.epo.org/
 * Note: EPO OPS API requires OAuth2 consumer credentials (EPO_OPS_KEY + EPO_OPS_SECRET).
 * This connector returns realistic mock results until credentials are configured.
 * Set EPO_OPS_KEY and EPO_OPS_SECRET in .env to enable live patent search.
 */
@Injectable()
export class EpoConnector extends BaseConnector {
  readonly name = 'epo';
  readonly displayName = 'European Patent Office';
  readonly category = ContentType.PATENT;
  readonly requiresApiKey = true;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected getApiKey(): string | undefined {
    return process.env.EPO_OPS_KEY;
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    // OPS requires OAuth2 bearer token — obtain first, then search
    const key = process.env.EPO_OPS_KEY;
    const secret = process.env.EPO_OPS_SECRET;
    if (!key || !secret) throw new Error('EPO_OPS_KEY and EPO_OPS_SECRET required');

    // Step 1: Get OAuth token
    const tokenRes = await this.fetchWithTimeout<any>(
      'https://ops.epo.org/3.2/auth/accesstoken',
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
      },
    );
    const token: string = tokenRes?.access_token;

    // Step 2: Search patents
    const q = encodeURIComponent(query.q || 'technology');
    const url = `https://ops.epo.org/3.2/rest-services/published-data/search/full-cycle?q=txt%3D${q}&Range=1-${Math.min(query.limit || 10, 25)}`;
    const data = await this.fetchWithTimeout<any>(url, {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    });

    const docs = data?.['ops:world-patent-data']?.['ops:biblio-search']?.['ops:search-result']?.['exchange-documents'] || [];
    return docs.map((doc: any) => {
      const bib = doc['exchange-document']?.['bibliographic-data'];
      const title = bib?.['invention-title']?.[0]?.['$'] ||
        bib?.['invention-title']?.['$'] || 'EPO Patent';
      const appId = doc['exchange-document']?.['@doc-id'] || Math.random().toString(36).slice(7);

      return {
        id: `epo:${appId}`,
        title,
        authors: [],
        description: `European patent: ${title}`,
        url: `https://worldwide.espacenet.com/patent/search?q=${encodeURIComponent(appId)}`,
        publishedDate: undefined,
        contentType: ContentType.PATENT,
        sourceName: this.name,
        metadata: { docId: appId, source: 'EPO OPS API' },
      };
    });
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'technology';
    return [
      {
        id: 'epo:EP3456789A1',
        title: `Transformer neural network architecture for natural language processing (${q})`,
        authors: [{ name: 'European Inventor Team A' }],
        description: 'A novel transformer architecture with improved attention mechanisms for NLP tasks.',
        url: 'https://worldwide.espacenet.com/patent/search?q=EP3456789',
        publishedDate: '2022-03-15',
        contentType: ContentType.PATENT,
        sourceName: this.name,
        score: 0.94,
        metadata: {
          docId: 'EP3456789A1',
          office: 'EPO',
          status: 'Published',
          isMockFallback: true,
        },
      },
      {
        id: 'epo:EP4012345B1',
        title: `Distributed machine learning system with federated privacy preservation (${q})`,
        authors: [{ name: 'European Research Labs' }],
        description: 'A patent describing federated learning across distributed nodes with differential privacy.',
        url: 'https://worldwide.espacenet.com/patent/search?q=EP4012345',
        publishedDate: '2023-07-20',
        contentType: ContentType.PATENT,
        sourceName: this.name,
        score: 0.91,
        metadata: {
          docId: 'EP4012345B1',
          office: 'EPO',
          status: 'Granted',
          isMockFallback: true,
        },
      },
    ];
  }
}
