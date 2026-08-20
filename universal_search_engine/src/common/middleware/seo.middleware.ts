import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SeoMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Basic SEO indexing instruction for public endpoints
    res.setHeader('X-Robots-Tag', 'index, follow');

    // Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Cache-Control based on route type
    if (req.path.startsWith('/api/v1/search')) {
      // Allow caching for search results
      res.setHeader('Cache-Control', 'public, max-age=300');
    } else if (req.path.includes('/ai')) {
      // Prevent caching for AI or dynamic routes if they existed
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }

    next();
  }
}
