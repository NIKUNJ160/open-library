import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { ConnectorsModule } from './connectors/connectors.module';
import { SearchModule } from './search/search.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { ApiKeyGuard } from './auth/api-key.guard';
import { LoggerModule } from './common/logger/logger.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { AiModule } from './ai/ai.module';
import { SeoMiddleware } from './common/middleware/seo.middleware';
import { ResponseTimeMiddleware } from './common/middleware/response-time.middleware';

@Module({
  imports: [
    LoggerModule,
    HealthModule,
    ConnectorsModule,
    SearchModule,
    AuthModule,
    CacheModule,
    AiModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, SeoMiddleware, ResponseTimeMiddleware)
      .forRoutes('*');
  }
}
