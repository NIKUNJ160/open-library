import { Test, TestingModule } from '@nestjs/testing';
import { ZenodoConnector } from './zenodo.connector';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { ContentType } from '../../search/dto';
import { AxiosResponse } from 'axios';

describe('ZenodoConnector', () => {
  let connector: ZenodoConnector;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZenodoConnector,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    connector = module.get<ZenodoConnector>(ZenodoConnector);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(connector).toBeDefined();
  });

  it('should return normalized results', async () => {
    const mockResponse: AxiosResponse = {
      data: {
        hits: {
          hits: [
            {
              id: 12345,
              links: { html: 'https://zenodo.org/record/12345' },
              metadata: {
                title: 'Test Dataset',
                creators: [{ name: 'Doe, John', affiliation: 'University' }],
                description: '<p>A test dataset description.</p>',
                publication_date: '2023-01-01',
                doi: '10.5281/zenodo.12345',
                resource_type: { type: 'dataset' },
                access_right: 'open',
                license: { id: 'cc-by' },
              },
            },
          ],
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

    const results = await connector.search({ q: 'test dataset' });

    expect(results.results).toHaveLength(1);
    expect(results.results[0].id).toBe('zenodo:12345');
    expect(results.results[0].title).toBe('Test Dataset');
    expect(results.results[0].authors).toEqual([{ name: 'Doe, John', affiliation: 'University' }]);
    expect(results.results[0].description).toBe('A test dataset description.');
    expect(results.results[0].url).toBe('https://zenodo.org/record/12345');
    expect(results.results[0].publishedDate).toBe('2023-01-01');
    expect(results.results[0].contentType).toBe(ContentType.DATASET);
    expect(results.results[0].metadata?.doi).toBe('10.5281/zenodo.12345');
  });

  it('should handle API errors and return mock fallback', async () => {
    jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('API Error')));

    const results = await connector.search({ q: 'error test' });
    expect(results.results.length).toBeGreaterThan(0);
    expect(results.results[0].metadata?.isMockFallback).toBe(true);
  });
});
