import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsArray, IsObject } from 'class-validator';

export class AddItemDto {
  @ApiPropertyOptional({
    description: 'Existing Document ID (UUID) if already ingested',
    example: 'b1c5d6c1-b6f5-415c-a9af-2df1a6ee7605',
  })
  @IsUUID()
  @IsOptional()
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Title of the external document (used if documentId is not provided)',
    example: 'Attention Is All You Need',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'URL of the external document',
    example: 'https://arxiv.org/abs/1706.03762',
  })
  @IsString()
  @IsOptional()
  sourceUrl?: string;

  @ApiPropertyOptional({
    description: 'Source engine/database name',
    example: 'arxiv',
  })
  @IsString()
  @IsOptional()
  sourceName?: string;

  @ApiPropertyOptional({
    description: 'Category/type of content (e.g. paper, book, dataset)',
    example: 'paper',
  })
  @IsString()
  @IsOptional()
  contentType?: string;

  @ApiPropertyOptional({
    description: 'List of authors',
    example: ['Vaswani, Ashish', 'Shazeer, Noam'],
  })
  @IsArray()
  @IsOptional()
  authors?: string[];

  @ApiPropertyOptional({
    description: 'Extra source-specific metadata',
    example: { journal: 'NIPS 2017' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
