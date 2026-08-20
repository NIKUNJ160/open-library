import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../base/base-connector';
import { ContentType, SearchQueryDto, SearchResultDto } from '../../search/dto';

@Injectable()
export class ArxivConnector extends BaseConnector {
  readonly name = 'arxiv';
  readonly displayName = 'arXiv';
  readonly category = ContentType.PAPER;
  readonly requiresApiKey = false;

  constructor(httpService?: HttpService) {
    super(httpService);
  }

  protected async executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]> {
    const q = encodeURIComponent(query.q || 'cs.AI');
    const limit = query.limit || 10;
    const start = ((query.page || 1) - 1) * limit;
    const url = `https://export.arxiv.org/api/query?search_query=all:${q}&start=${start}&max_results=${limit}`;

    const rawXml = await this.fetchWithTimeout<string>(url);
    return this.parseArxivXml(rawXml);
  }

  private parseArxivXml(xml: string): SearchResultDto[] {
    const results: SearchResultDto[] = [];
    if (!xml || typeof xml !== 'string') return results;

    const entries = xml.split('<entry>');
    for (let i = 1; i < entries.length; i++) {
      const entry = entries[i].split('</entry>')[0];

      const idMatch = entry.match(/<id>(.*?)<\/id>/s);
      const rawId = idMatch ? idMatch[1].trim() : '';
      const arxivId = rawId.replace('http://arxiv.org/abs/', '').replace('https://arxiv.org/abs/', '');

      const titleMatch = entry.match(/<title>(.*?)<\/title>/s);
      const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Untitled arXiv Paper';

      const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/s);
      const description = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : 'arXiv preprint.';

      const publishedMatch = entry.match(/<published>(.*?)<\/published>/s);
      const publishedDate = publishedMatch ? publishedMatch[1].trim().substring(0, 10) : undefined;

      const authorMatches = [...entry.matchAll(/<author>\s*<name>(.*?)<\/name>/gs)];
      const authors = authorMatches.length
        ? authorMatches.map((m) => ({ name: m[1].trim() }))
        : [{ name: 'arXiv Author' }];

      results.push({
        id: `arxiv:${arxivId || Math.random().toString(36).substring(7)}`,
        title,
        authors,
        description,
        url: rawId || `https://arxiv.org/abs/${arxivId}`,
        publishedDate,
        contentType: ContentType.PAPER,
        sourceName: this.name,
        metadata: {
          arxivId,
          pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
        },
      });
    }

    return results;
  }

  protected getMockResults(query: SearchQueryDto): SearchResultDto[] {
    const q = query.q || 'Computer Vision';
    return [
      {
        id: 'arxiv:1512.03385',
        title: `Deep Residual Learning for Image Recognition (${q})`,
        authors: [
          { name: 'Kaiming He' },
          { name: 'Xiangyu Zhang' },
          { name: 'Shaoqing Ren' },
          { name: 'Jian Sun' },
        ],
        description: 'Presents residual learning framework to ease the training of networks that are substantially deeper than those used previously.',
        url: 'https://arxiv.org/abs/1512.03385',
        publishedDate: '2015-12-10',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.98,
        metadata: { arxivId: '1512.03385', pdfUrl: 'https://arxiv.org/pdf/1512.03385.pdf', isMockFallback: true },
      },
      {
        id: 'arxiv:1706.03762',
        title: `Attention Is All You Need (${q})`,
        authors: [{ name: 'Ashish Vaswani' }, { name: 'Noam Shazeer' }],
        description: 'Proposes the Transformer architecture based on self-attention mechanisms.',
        url: 'https://arxiv.org/abs/1706.03762',
        publishedDate: '2017-06-12',
        contentType: ContentType.PAPER,
        sourceName: this.name,
        score: 0.99,
        metadata: { arxivId: '1706.03762', pdfUrl: 'https://arxiv.org/pdf/1706.03762.pdf', isMockFallback: true },
      },
    ];
  }
}
