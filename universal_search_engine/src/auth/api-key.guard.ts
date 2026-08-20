import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    const headerKey =
      request.headers['x-api-key'] || request.headers['X-API-KEY'];
    const queryKey = request.query ? (request.query['api_key'] || request.query['apiKey']) : undefined;

    const apiKey =
      (Array.isArray(headerKey) ? headerKey[0] : headerKey) ||
      (Array.isArray(queryKey) ? queryKey[0] : queryKey);

    const configuredKeys =
      process.env.API_KEY || process.env.API_KEYS || 'demo-api-key-12345';
    const validKeys = configuredKeys
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean);

    if (!apiKey || typeof apiKey !== 'string' || !validKeys.includes(apiKey)) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}
