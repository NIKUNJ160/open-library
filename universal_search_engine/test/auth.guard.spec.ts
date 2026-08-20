import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from '../src/auth/api-key.guard';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    delete process.env.API_KEY;
    delete process.env.API_KEYS;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  function createMockContext(
    headers: Record<string, any> = {},
    query: Record<string, any> = {},
  ): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          query,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access if route is marked with @Public()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const ctx = createMockContext();
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access with default valid x-api-key header', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = createMockContext({ 'x-api-key': 'demo-api-key-12345' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access with uppercase X-API-KEY header', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = createMockContext({ 'X-API-KEY': 'demo-api-key-12345' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access with valid api_key query parameter', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = createMockContext({}, { api_key: 'demo-api-key-12345' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access with valid apiKey query parameter', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = createMockContext({}, { apiKey: 'demo-api-key-12345' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should support multiple comma-separated keys from process.env.API_KEY', () => {
    process.env.API_KEY = 'key-one, key-two';
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const ctx1 = createMockContext({ 'x-api-key': 'key-one' });
    const ctx2 = createMockContext({ 'x-api-key': 'key-two' });
    const ctx3 = createMockContext({ 'x-api-key': 'key-three' });

    expect(guard.canActivate(ctx1)).toBe(true);
    expect(guard.canActivate(ctx2)).toBe(true);
    expect(() => guard.canActivate(ctx3)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when API key is missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = createMockContext({}, {});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when API key is invalid', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = createMockContext({ 'x-api-key': 'invalid-key-abc' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
