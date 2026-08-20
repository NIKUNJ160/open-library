import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  providers: [Reflector, ApiKeyGuard],
  exports: [ApiKeyGuard],
})
export class AuthModule {}
