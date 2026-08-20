import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { SearchCacheInterceptor } from './search-cache.interceptor';

@Module({
  imports: [
    NestCacheModule.register({
      ttl: 3600 * 1000,
      max: 1000,
    }),
  ],
  providers: [CacheService, SearchCacheInterceptor],
  exports: [CacheService, SearchCacheInterceptor],
})
export class CacheModule {}
