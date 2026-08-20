import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { correlationStorage } from '../logger/logger.service';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const headerValue = req.headers[CORRELATION_ID_HEADER] || req.headers['x-request-id'];
    const correlationId = (Array.isArray(headerValue) ? headerValue[0] : headerValue) || uuidv4();

    req.headers[CORRELATION_ID_HEADER] = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    (req as any).correlationId = correlationId;

    correlationStorage.run(correlationId, () => {
      next();
    });
  }
}
