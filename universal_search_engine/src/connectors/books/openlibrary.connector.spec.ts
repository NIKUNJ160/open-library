import { Test, TestingModule } from '@nestjs/testing';
import { OpenLibraryConnector } from './openlibrary.connector';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { ContentType } from '../../search/dto';
import { AxiosResponse } from 'axios';

describe('OpenLibraryConnector', () => {
  let connector: OpenLibraryConnector;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenLibraryConnector,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    connector = module.get<OpenLibraryConnector>(OpenLibraryConnector);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(connector).toBeDefined();
  });

  it('should return normalized results', async () => {
    const mockResponse: AxiosResponse = {
      data: {
        docs: [
          {
            key: '/works/OL12345W',
            title: 'Test Book',
            author_name: ['Alice', 'Bob'],
            first_sentence: ['A great start.'],
            first_publish_year: 1999,
            isbn: ['1234567890'],
          },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

    const results = await connector.search({ q: 'test book' });

    expect(results.results).toHaveLength(1);
    expect(results.results[0].id).toBe('openlibrary:OL12345W');
    expect(results.results[0].title).toBe('Test Book');
    expect(results.results[0].authors).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
    expect(results.results[0].description).toBe('A great start.');
    expect(results.results[0].url).toBe('https://openlibrary.org/works/OL12345W');
    expect(results.results[0].publishedDate).toBe('1999');
    expect(results.results[0].contentType).toBe(ContentType.BOOK);
    expect(results.results[0].metadata?.isbns).toEqual(['1234567890']);
  });

  it('should handle API errors and return mock fallback', async () => {
    jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('API Error')));

    const results = await connector.search({ q: 'error book' });
    expect(results.results.length).toBeGreaterThan(0);
    expect(results.results[0].metadata?.isMockFallback).toBe(true);
  });
});
