import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { Document } from './database/entities/document.entity';
import { DocumentChunk } from './database/entities/document-chunk.entity';
import { DatabaseModule } from './database/database.module';
import { Collection } from './collections/entities/collection.entity';
import { CollectionsModule } from './collections/collections.module';
import { JobsModule } from './jobs/jobs.module';
import { GraphEntity } from './graph/entities/graph-entity.entity';
import { GraphRelation } from './graph/entities/graph-relation.entity';
import { GraphModule } from './graph/graph.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'knowledge_db'),
        entities: [Document, DocumentChunk, Collection, GraphEntity, GraphRelation],
        synchronize: true, // Auto-create tables for now; disable in production
        logging: false,
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    LoggerModule,
    HealthModule,
    ConnectorsModule,
    SearchModule,
    AuthModule,
    CacheModule,
    AiModule,
    CollectionsModule,
    JobsModule,
    GraphModule,
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
