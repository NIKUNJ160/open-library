import { Module } from '@nestjs/common';
import { ConnectorsModule } from '../connectors/connectors.module';
import { CacheModule } from '../cache/cache.module';
import { SearchAggregatorService } from './search-aggregator.service';
import { SearchController } from './search.controller';

@Module({
  imports: [ConnectorsModule, CacheModule],
  controllers: [SearchController],
  providers: [SearchAggregatorService],
  exports: [SearchAggregatorService],
})
export class SearchModule {}
