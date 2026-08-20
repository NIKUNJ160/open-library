import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { SearchAggregatorService } from './../src/search/search-aggregator.service';

describe('Search & Health (e2e)', () => {
  let app: INestApplication;
  let searchService: SearchAggregatorService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SearchAggregatorService)
      .useValue({
        search: jest.fn().mockResolvedValue({
          query: 'test',
          total: 1,
          page: 1,
          limit: 10,
          results: [
            {
              id: 'test-1',
              title: 'Test Result',
              authors: [{ name: 'Test Author' }],
              contentType: 'book',
            }
          ]
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    searchService = moduleFixture.get<SearchAggregatorService>(SearchAggregatorService);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/health (GET) should return 200', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.version).toBe('1.0.0');
      });
  });

  it('/api/v1/search (GET) should return results with valid api key', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search?q=test')
      .set('x-api-key', process.env.API_KEY || 'development-key') // In development, the auth guard might accept 'development-key' if it's default
      .expect(200)
      .expect((res) => {
        expect(res.body.results).toBeDefined();
        expect(res.body.results).toHaveLength(1);
        expect(res.body.results[0].title).toBe('Test Result');
      });
  });

  it('/api/v1/search (GET) should handle unauthenticated request', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search?q=test')
      // No x-api-key provided
      .expect(401);
  });
});
