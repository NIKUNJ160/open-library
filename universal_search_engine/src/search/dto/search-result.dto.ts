import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { AuthorDto } from './author.dto';
import { ContentType } from './content-type.enum';

export class SearchResultDto {
  @ApiProperty({
    description: 'Unique result identifier (formatted as {sourceName}:{sourceId})',
    example: 'arxiv:2104.12345',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Title of the publication, dataset, repo, or document',
    example: 'Attention Is All You Need',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'List of authors or contributors',
    type: [AuthorDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AuthorDto)
  authors: AuthorDto[];

  @ApiProperty({
    description: 'Abstract, description, or summary of the resource',
    example: 'We propose the Transformer model architecture...',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Canonical URL to full resource or metadata page',
    example: 'https://arxiv.org/abs/1706.03762',
  })
  @IsString()
  url: string;

  @ApiPropertyOptional({
    description: 'Publication or last modification date (ISO 8601 YYYY-MM-DD or YYYY format)',
    example: '2017-06-12',
  })
  @IsString()
  @IsOptional()
  publishedDate?: string;

  @ApiProperty({
    description: 'Resource category content type',
    enum: ContentType,
    example: ContentType.PAPER,
  })
  @IsEnum(ContentType)
  contentType: ContentType;

  @ApiProperty({
    description: 'Source connector slug identifier',
    example: 'arxiv',
  })
  @IsString()
  @IsNotEmpty()
  sourceName: string;

  @ApiPropertyOptional({
    description: 'Relevance score computed by source or aggregator',
    example: 0.95,
  })
  @IsNumber()
  @IsOptional()
  score?: number;

  @ApiPropertyOptional({
    description: 'Source-specific metadata (DOI, ISBN, stars, licenses, download URLs, etc.)',
    example: { doi: '10.48550/arXiv.1706.03762' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  // --- Phase 2 extended fields ---

  @ApiPropertyOptional({ description: 'Digital Object Identifier', example: '10.48550/arXiv.1706.03762' })
  @IsString()
  @IsOptional()
  doi?: string;

  @ApiPropertyOptional({ description: 'ISBN-10 or ISBN-13', example: '9780132350884' })
  @IsString()
  @IsOptional()
  isbn?: string;

  @ApiPropertyOptional({ description: 'Content language (ISO 639-1)', example: 'en' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Content license', example: 'CC BY 4.0' })
  @IsString()
  @IsOptional()
  license?: string;

  @ApiPropertyOptional({ description: 'Topic tags or keywords', example: ['machine-learning', 'nlp'] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Direct download URL (PDF, ZIP, etc.)', example: 'https://arxiv.org/pdf/1706.03762.pdf' })
  @IsString()
  @IsOptional()
  downloadUrl?: string;

  @ApiPropertyOptional({ description: 'Source code repository URL', example: 'https://github.com/owner/repo' })
  @IsString()
  @IsOptional()
  repositoryUrl?: string;

  @ApiPropertyOptional({ description: 'Last updated date (ISO 8601)', example: '2024-01-15' })
  @IsString()
  @IsOptional()
  updatedDate?: string;
}
