import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ResponseTimeMiddleware implements NestMiddleware {
  private readonly logger = new Logger('ResponseTime');

  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime();

    const writeHead = res.writeHead;
    res.writeHead = function (this: Response, statusCode: any, ...args: any[]): any {
      const diff = process.hrtime(start);
      const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
      if (!this.headersSent) {
        this.setHeader('X-Response-Time', `${timeInMs}ms`);
      }
      return writeHead.apply(this, [statusCode, ...args]);
    };

    res.on('finish', () => {
      const diff = process.hrtime(start);
      const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
      
      if (parseFloat(timeInMs) > 2000) {
        this.logger.warn(`Slow request detected: ${req.method} ${req.originalUrl} took ${timeInMs}ms`);
      }
    });

    next();
  }
}
