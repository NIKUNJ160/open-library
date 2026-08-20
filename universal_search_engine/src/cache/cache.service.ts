import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import Redis from 'ioredis';
import { getTtlForCategory } from './cache-ttl.config';

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: Redis | null = null;
  private isRedisActive = false;

  constructor(@Inject(CACHE_MANAGER) private readonly memoryCache: Cache) {}

  async onModuleInit() {
    const redisHost = process.env.REDIS_HOST;
    if (redisHost) {
      try {
        const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
        this.redisClient = new Redis({
          host: redisHost,
          port: redisPort,
          password: process.env.REDIS_PASSWORD || undefined,
          lazyConnect: true,
          connectTimeout: 2000,
          maxRetriesPerRequest: 1,
        });

        this.redisClient.on('connect', () => {
          this.logger.log(`Connected to Redis at ${redisHost}:${redisPort}`);
          this.isRedisActive = true;
        });

        this.redisClient.on('error', (err) => {
          this.logger.warn(
            `Redis connection error (${err.message}). Falling back to in-memory cache.`,
          );
          this.isRedisActive = false;
        });

        await this.redisClient.connect();
      } catch (err: any) {
        this.logger.warn(
          `Failed to initialize Redis client (${err.message}). Using in-memory cache fallback.`,
        );
        this.isRedisActive = false;
      }
    } else {
      this.logger.log('REDIS_HOST not set. Utilizing in-memory CacheManager.');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisActive && this.redisClient) {
      try {
        const data = await this.redisClient.get(key);
        if (data) return JSON.parse(data);
      } catch (err: any) {
        this.logger.warn(
          `Redis GET failed for key "${key}": ${err.message}. Fallback to memory.`,
        );
      }
    }

    try {
      const memoryValue = await this.memoryCache.get<T>(key);
      return memoryValue ?? null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? getTtlForCategory();

    if (this.isRedisActive && this.redisClient) {
      try {
        await this.redisClient.set(key, JSON.stringify(value), 'EX', ttl);
      } catch (err: any) {
        this.logger.warn(
          `Redis SET failed for key "${key}": ${err.message}. Writing to memory fallback.`,
        );
      }
    }

    try {
      await this.memoryCache.set(key, value, ttl * 1000);
    } catch (err: any) {
      this.logger.error(
        `Memory cache SET failed for key "${key}": ${err.message}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    if (this.isRedisActive && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch {}
    }
    try {
      await this.memoryCache.del(key);
    } catch {}
  }

  getCategoryTtl(category?: string): number {
    return getTtlForCategory(category);
  }
}
