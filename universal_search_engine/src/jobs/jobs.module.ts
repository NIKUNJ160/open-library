import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../database/entities/document.entity';
import { EmbeddingProcessor } from './processors/embedding.processor';
import { IngestionProcessor } from './processors/ingestion.processor';
import { CacheRefreshProcessor } from './processors/cache-refresh.processor';
import { DatabaseModule } from '../database/database.module';
import { AiModule } from '../ai/ai.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'embedding' },
      { name: 'ingestion' },
      { name: 'cache-refresh' },
    ),
    TypeOrmModule.forFeature([Document]),
    DatabaseModule,
    AiModule,
    SearchModule,
  ],
  providers: [EmbeddingProcessor, IngestionProcessor, CacheRefreshProcessor],
  exports: [BullModule],
})
export class JobsModule implements OnModuleInit {
  constructor(
    @InjectQueue('ingestion') private readonly ingestionQueue: Queue,
    @InjectQueue('cache-refresh') private readonly cacheRefreshQueue: Queue,
  ) {}

  async onModuleInit() {
    // Schedule ingestion sweep every 12 hours
    await this.ingestionQueue.upsertJobScheduler(
      'scheduled-connector-sweep',
      {
        pattern: '0 */12 * * *', // every 12 hours
      },
      {
        name: 'connector-sweep',
        data: { query: 'artificial intelligence' },
      },
    );

    // Schedule cache optimization every 6 hours
    await this.cacheRefreshQueue.upsertJobScheduler(
      'scheduled-cache-cleanup',
      {
        pattern: '0 */6 * * *', // every 6 hours
      },
      {
        name: 'cache-cleanup',
        data: {},
      },
    );
  }
}
