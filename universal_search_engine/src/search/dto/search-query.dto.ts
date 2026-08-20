import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ContentType } from './content-type.enum';

export class SearchQueryDto {
  @ApiPropertyOptional({
    description: 'Search query string',
    example: 'machine learning',
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({
    description: 'Filter by content category',
    enum: ContentType,
    example: ContentType.PAPER,
  })
  @IsEnum(ContentType)
  @IsOptional()
  category?: ContentType;

  @ApiPropertyOptional({
    description: 'Filter by specific source connector name slug (e.g. openlibrary, arxiv, github)',
    example: 'arxiv',
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter publications published after date (YYYY-MM-DD or YYYY)',
    example: '2020-01-01',
  })
  @IsString()
  @IsOptional()
  after?: string;

  @ApiPropertyOptional({
    description: 'Filter publications published before date (YYYY-MM-DD or YYYY)',
    example: '2026-12-31',
  })
  @IsString()
  @IsOptional()
  before?: string;

  @ApiPropertyOptional({
    description: 'Filter start date (alias for after)',
    example: '2020-01-01',
  })
  @IsString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter end date (alias for before)',
    example: '2026-12-31',
  })
  @IsString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by author name',
    example: 'Einstein',
  })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiPropertyOptional({
    description: 'Sort order (e.g., relevance, date, score)',
    example: 'relevance',
  })
  @IsString()
  @IsOptional()
  sort?: string;

  @ApiPropertyOptional({
    description: 'Resource sub-type filter',
    example: 'article',
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by DOI' })
  @IsString()
  @IsOptional()
  doi?: string;

  @ApiPropertyOptional({ description: 'Filter by ISBN' })
  @IsString()
  @IsOptional()
  isbn?: string;

  @ApiPropertyOptional({ description: 'Filter by publication year' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ description: 'Filter by journal name' })
  @IsString()
  @IsOptional()
  journal?: string;

  @ApiPropertyOptional({ description: 'Filter by publisher name' })
  @IsString()
  @IsOptional()
  publisher?: string;

  @ApiPropertyOptional({ description: 'Filter for free items' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  free?: boolean;

  @ApiPropertyOptional({ description: 'Filter for items with PDF link' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  pdf?: boolean;

  @ApiPropertyOptional({ description: 'Filter for Open Access publications' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  open_access?: boolean;

  @ApiPropertyOptional({ description: 'Filter for peer-reviewed items' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  peer_reviewed?: boolean;
}
