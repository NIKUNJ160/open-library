import { ContentType, SearchQueryDto, SearchResultDto, WarningDto } from '../../search/dto';

export interface ConnectorResult {
  results: SearchResultDto[];
  warning?: WarningDto;
}

export interface IBaseConnector {
  readonly name: string;
  readonly displayName: string;
  readonly category: ContentType;
  readonly requiresApiKey: boolean;

  search(query: SearchQueryDto): Promise<ConnectorResult>;
}
