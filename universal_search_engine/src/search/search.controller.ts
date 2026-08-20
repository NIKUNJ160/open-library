import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchQueryDto, SearchResponseDto } from './dto';
import { SearchAggregatorService } from './search-aggregator.service';
import { SearchCacheInterceptor } from '../cache/search-cache.interceptor';

@ApiTags('Search')
@Controller('search')
@UseInterceptors(SearchCacheInterceptor)
export class SearchController {
  constructor(
    private readonly searchAggregatorService: SearchAggregatorService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Search across 22 open knowledge sources',
    description:
      'Aggregates knowledge results across 7 categories (Books, Research Papers, Datasets, Patents, Repos, Gov, Docs) with parallel fault-tolerant execution.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved aggregated search results',
    type: SearchResponseDto,
  })
  async search(@Query() query: SearchQueryDto): Promise<SearchResponseDto> {
    return this.searchAggregatorService.search(query);
  }
}
