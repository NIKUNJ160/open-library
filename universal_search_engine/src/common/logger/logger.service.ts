import { Injectable, LoggerService } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export const correlationStorage = new AsyncLocalStorage<string>();

@Injectable()
export class CustomLogger implements LoggerService {
  private format(level: string, message: any, context?: string): string {
    const timestamp = new Date().toISOString();
    const correlationId = correlationStorage.getStore() || 'N/A';
    const msgStr = typeof message === 'object' ? JSON.stringify(message) : message;

    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      correlationId,
      context: context || 'Application',
      message: msgStr,
    });
  }

  log(message: any, context?: string) {
    console.log(this.format('info', message, context));
  }

  error(message: any, trace?: string, context?: string) {
    console.error(this.format('error', message, context));
    if (trace) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'ERROR_TRACE', trace }));
    }
  }

  warn(message: any, context?: string) {
    console.warn(this.format('warn', message, context));
  }

  debug(message: any, context?: string) {
    console.debug(this.format('debug', message, context));
  }

  verbose(message: any, context?: string) {
    console.log(this.format('verbose', message, context));
  }
}
