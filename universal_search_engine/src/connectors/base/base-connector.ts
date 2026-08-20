import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { ContentType, SearchQueryDto, SearchResultDto, WarningDto } from '../../search/dto';
import { IBaseConnector, ConnectorResult } from './base-connector.interface';

export abstract class BaseConnector implements IBaseConnector {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly category: ContentType;
  abstract readonly requiresApiKey: boolean;

  protected readonly logger = new Logger(this.constructor.name);
  protected readonly TIMEOUT_MS = 5000;

  constructor(protected readonly httpService?: HttpService) {}

  /**
   * Execute connector search with strict timeout and fallback resilience.
   */
  async search(query: SearchQueryDto): Promise<ConnectorResult> {
    try {
      const apiKey = this.getApiKey();
      if (this.requiresApiKey && !apiKey) {
        this.logger.warn(`Missing required API key for ${this.displayName}. Returning fallback mock data.`);
        return {
          results: this.getMockResults(query),
          warning: {
            sourceName: this.name,
            message: `API key missing for ${this.displayName}. Fallback mock results provided.`,
          },
        };
      }

      const results = await this.executeSearch(query);
      return { results };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Error executing ${this.displayName} search: ${errorMessage}`, error.stack);

      return {
        results: this.getMockResults(query),
        warning: {
          sourceName: this.name,
          message: `${this.displayName} search failed (${errorMessage}). Fallback mock results provided.`,
        },
      };
    }
  }

  protected getApiKey(): string | undefined {
    return undefined;
  }

  /**
   * Method implemented by subclasses to execute external API search and perform normalization.
   */
  protected abstract executeSearch(query: SearchQueryDto): Promise<SearchResultDto[]>;

  /**
   * Perform HTTP GET request with 5-second timeout protection.
   */
  protected async fetchWithTimeout<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
    if (!this.httpService) {
      throw new Error(`HttpService is not injected in ${this.displayName}`);
    }

    const response$ = this.httpService
      .get<T>(url, { headers, timeout: this.TIMEOUT_MS })
      .pipe(
        timeout(this.TIMEOUT_MS),
        catchError((err) => {
          throw new Error(`HTTP request to ${url} failed: ${err.message}`);
        }),
      );

    const response = await firstValueFrom(response$);
    return response.data;
  }

  /**
   * Fallback mock results generated when API fails, times out, or credentials are missing.
   */
  protected abstract getMockResults(query: SearchQueryDto): SearchResultDto[];
}
