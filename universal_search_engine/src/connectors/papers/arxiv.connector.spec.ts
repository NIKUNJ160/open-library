import { Test, TestingModule } from '@nestjs/testing';
import { ArxivConnector } from './arxiv.connector';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { ContentType } from '../../search/dto';
import { AxiosResponse } from 'axios';

describe('ArxivConnector', () => {
  let connector: ArxivConnector;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArxivConnector,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    connector = module.get<ArxivConnector>(ArxivConnector);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(connector).toBeDefined();
  });

  it('should parse XML and return normalized results', async () => {
    const mockXml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <id>http://arxiv.org/abs/2101.12345</id>
          <published>2021-01-01T00:00:00Z</published>
          <title>A Test Paper</title>
          <summary>This is a test summary for a test paper.</summary>
          <author><name>Jane Doe</name></author>
          <author><name>John Smith</name></author>
        </entry>
      </feed>
    `;

    const mockResponse: AxiosResponse = {
      data: mockXml,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

    const results = await connector.search({ q: 'test paper' });

    expect(results.results).toHaveLength(1);
    expect(results.results[0].id).toBe('arxiv:2101.12345');
    expect(results.results[0].title).toBe('A Test Paper');
    expect(results.results[0].authors).toEqual([{ name: 'Jane Doe' }, { name: 'John Smith' }]);
    expect(results.results[0].description).toBe('This is a test summary for a test paper.');
    expect(results.results[0].url).toBe('http://arxiv.org/abs/2101.12345');
    expect(results.results[0].publishedDate).toBe('2021-01-01');
    expect(results.results[0].contentType).toBe(ContentType.PAPER);
    expect(results.results[0].metadata?.arxivId).toBe('2101.12345');
  });

  it('should handle API errors and return mock fallback', async () => {
    jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('API Timeout')));

    const results = await connector.search({ q: 'timeout test' });
    expect(results.results.length).toBeGreaterThan(0);
    expect(results.results[0].metadata?.isMockFallback).toBe(true);
  });
});
