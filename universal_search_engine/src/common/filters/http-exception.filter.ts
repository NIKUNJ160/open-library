import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomLogger, correlationStorage } from '../logger/logger.service';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: CustomLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const correlationId =
      correlationStorage.getStore() ||
      (request.headers[CORRELATION_ID_HEADER] as string) ||
      'N/A';

    let message: any = 'Internal server error';
    let errors: any = undefined;

    if (exception instanceof HttpException) {
      const resObj = exception.getResponse();
      if (typeof resObj === 'string') {
        message = resObj;
      } else if (typeof resObj === 'object' && resObj !== null) {
        message = (resObj as any).message || exception.message;
        if (Array.isArray((resObj as any).message)) {
          errors = (resObj as any).message;
          message = 'Validation failed';
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      correlationId,
      message,
      ...(status === 401 ? { error: 'Unauthorized' } : status === 400 ? { error: 'Bad Request' } : {}),
      ...(errors ? { errors } : {}),
    };

    this.logger.error(
      `HTTP ${status} [${request.method} ${request.url}] - ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : undefined,
      'HttpExceptionFilter',
    );

    response.status(status).json(errorResponse);
  }
}
