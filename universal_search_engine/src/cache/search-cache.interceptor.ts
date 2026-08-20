import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { CacheService } from './cache.service';

@Injectable()
export class SearchCacheInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();

    // Only cache GET requests
    if (req.method !== 'GET') {
      return next.handle();
    }

    // Build deterministic cache key from sorted query params
    const sortedQueryParams = Object.keys(req.query || {})
      .sort()
      .map((k) => `${k}=${encodeURIComponent(String(req.query[k]))}`)
      .join('&');

    const cacheKey = `search_cache:${req.path}?${sortedQueryParams}`;
    const category =
      (req.query?.category as string) || (req.query?.type as string);

    const cachedData = await this.cacheService.get(cacheKey);

    if (cachedData) {
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('x-cache', 'HIT');
      }
      return of(cachedData);
    }

    if (res && typeof res.setHeader === 'function') {
      res.setHeader('x-cache', 'MISS');
    }

    const ttl = this.cacheService.getCategoryTtl(category);

    return next.handle().pipe(
      tap(async (responseBody) => {
        if (responseBody) {
          await this.cacheService.set(cacheKey, responseBody, ttl);
        }
      }),
    );
  }
}
