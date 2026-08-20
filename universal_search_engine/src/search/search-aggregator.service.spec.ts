import { Test, TestingModule } from '@nestjs/testing';
import { SearchAggregatorService } from './search-aggregator.service';
import { ContentType } from './dto';

describe('SearchAggregatorService', () => {
  let service: SearchAggregatorService;
  
  const mockConnector1 = {
    name: 'connector1',
    displayName: 'Connector 1',
    category: ContentType.BOOK,
    search: jest.fn(),
  };

  const mockConnector2 = {
    name: 'connector2',
    displayName: 'Connector 2',
    category: ContentType.PAPER,
    search: jest.fn(),
  };

  beforeEach(() => {
    const allMockConnectors = [mockConnector1, mockConnector2];
    // 22 Phase 1 connectors + 11 Phase 2 connectors = 33 total
    service = new (SearchAggregatorService as any)(
      ...Array(33).fill(0).map((_, i) => allMockConnectors[i] || {
        name: `dummy${i}`,
        category: 'dummy',
        requiresApiKey: false,
        search: jest.fn().mockResolvedValue({ results: [] }),
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call connectors in parallel and merge results', async () => {
    const result1 = { id: '1', title: 'Book 1', contentType: ContentType.BOOK };
    const result2 = { id: '2', title: 'Paper 1', contentType: ContentType.PAPER };

    mockConnector1.search.mockResolvedValue({ results: [result1] });
    mockConnector2.search.mockResolvedValue({ results: [result2] });

    const response = await service.search({ q: 'test' });
    
    expect(response.results).toHaveLength(2);
    expect(response.total).toBe(2);
    expect(response.warnings).toBeUndefined();
    expect(mockConnector1.search).toHaveBeenCalled();
    expect(mockConnector2.search).toHaveBeenCalled();
  });

  it('should return partial results with warnings if a connector fails', async () => {
    const result1 = { id: '1', title: 'Book 1', contentType: ContentType.BOOK };
    
    mockConnector1.search.mockResolvedValue({ results: [result1] });
    mockConnector2.search.mockRejectedValue(new Error('Network error'));

    const response = await service.search({ q: 'test' });
    
    expect(response.results).toHaveLength(1);
    expect(response.warnings).toBeDefined();
    expect(response.warnings?.[0].message).toContain('Network error');
  });

  it('should filter results properly', async () => {
    const result1 = { id: '1', title: 'Book 1', authors: [{ name: 'Jane' }] };
    const result2 = { id: '2', title: 'Paper 1', authors: [{ name: 'John' }] };

    mockConnector1.search.mockResolvedValue({ results: [result1] });
    mockConnector2.search.mockResolvedValue({ results: [result2] });

    const response = await service.search({ q: 'test', author: 'jane' });
    
    expect(response.results).toHaveLength(1);
    expect(response.results[0].id).toBe('1');
  });

  it('should handle empty query', async () => {
    mockConnector1.search.mockResolvedValue({ results: [] });
    mockConnector2.search.mockResolvedValue({ results: [] });
    
    const response = await service.search({ q: '' });
    expect(response.query).toBe('');
    expect(response.results).toHaveLength(0);
  });
});
