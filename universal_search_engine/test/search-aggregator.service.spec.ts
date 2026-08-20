import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { SearchAggregatorService } from '../src/search/search-aggregator.service';
import { ConnectorsModule } from '../src/connectors/connectors.module';
import { ContentType, SearchQueryDto } from '../src/search/dto';

describe('SearchAggregatorService', () => {
  let service: SearchAggregatorService;

  const mockHttpService = {
    get: jest.fn().mockImplementation(() => {
      // Instantly reject HTTP call so connectors cleanly invoke fallback mock data without 5s timeout delay
      return throwError(() => new Error('Network call disabled in unit test'));
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConnectorsModule],
      providers: [SearchAggregatorService],
    })
      .overrideProvider(HttpService)
      .useValue(mockHttpService)
      .compile();

    service = module.get<SearchAggregatorService>(SearchAggregatorService);
  });

  it('should be defined and register all 33 connectors', () => {
    expect(service).toBeDefined();
    const connectors = service.getRegisteredConnectors();
    expect(connectors.length).toBe(33);
  });

  it('should execute concurrent search across all 33 connectors when no filters are set', async () => {
    const query: SearchQueryDto = { q: 'quantum computing', page: 1, limit: 20 };
    const response = await service.search(query);

    expect(response.query).toBe('quantum computing');
    expect(response.page).toBe(1);
    expect(response.limit).toBe(20);
    expect(response.total).toBeGreaterThan(0);
    expect(response.results.length).toBeLessThanOrEqual(20);

    // Verify multiple content types are present in aggregated results
    const contentTypes = new Set(response.results.map((r) => r.contentType));
    expect(contentTypes.size).toBeGreaterThan(1);
  });

  it('should filter connectors by category (e.g. ContentType.PAPER)', async () => {
    const query: SearchQueryDto = {
      q: 'neural networks',
      category: ContentType.PAPER,
      page: 1,
      limit: 50,
    };
    const response = await service.search(query);

    expect(response.results.length).toBeGreaterThan(0);
    for (const item of response.results) {
      expect(item.contentType).toBe(ContentType.PAPER);
    }
  });

  it('should filter connectors by source slug (e.g. source: "github")', async () => {
    const query: SearchQueryDto = {
      q: 'react',
      source: 'github',
      page: 1,
      limit: 10,
    };
    const response = await service.search(query);

    expect(response.results.length).toBeGreaterThan(0);
    for (const item of response.results) {
      expect(item.sourceName).toBe('github');
    }
  });

  it('should handle partial failure and aggregate warnings cleanly', async () => {
    const query: SearchQueryDto = { q: 'data science', page: 1, limit: 10 };
    const response = await service.search(query);

    expect(response.results.length).toBeGreaterThan(0);
    expect(response.warnings).toBeDefined();
    expect(response.warnings?.length).toBeGreaterThan(0);

    const warningSources = response.warnings?.map((w) => w.sourceName);
    expect(warningSources).toContain('core');
    expect(warningSources).toContain('kaggle');
  });

  it('should correctly paginate results according to page and limit parameters', async () => {
    const queryPage1: SearchQueryDto = { q: 'machine learning', page: 1, limit: 5 };
    const responsePage1 = await service.search(queryPage1);

    expect(responsePage1.page).toBe(1);
    expect(responsePage1.limit).toBe(5);
    expect(responsePage1.results.length).toBe(5);

    const queryPage2: SearchQueryDto = { q: 'machine learning', page: 2, limit: 5 };
    const responsePage2 = await service.search(queryPage2);

    expect(responsePage2.page).toBe(2);
    expect(responsePage2.limit).toBe(5);
    expect(responsePage2.results.length).toBe(5);

    // Results on page 1 and page 2 should be different items
    const page1Ids = responsePage1.results.map((r) => r.id);
    const page2Ids = responsePage2.results.map((r) => r.id);
    const intersection = page1Ids.filter((id) => page2Ids.includes(id));
    expect(intersection.length).toBe(0);
  });

  it('should filter by author name if specified', async () => {
    const query: SearchQueryDto = { q: 'physics', author: 'Einstein', page: 1, limit: 10 };
    const response = await service.search(query);

    for (const item of response.results) {
      const hasEinstein = item.authors.some((a) => a.name.toLowerCase().includes('einstein'));
      expect(hasEinstein).toBe(true);
    }
  });
});
