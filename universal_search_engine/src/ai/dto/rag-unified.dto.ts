import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RagUnifiedDto {
  // Query fields
  @ApiPropertyOptional({
    description: 'Question to answer using RAG (provide either question to query or content+title to ingest)',
    example: 'What are the main principles of quantum computing?',
  })
  @IsString()
  @IsOptional()
  question?: string;

  @ApiPropertyOptional({
    description: 'Number of top similar chunks to retrieve',
    example: 5,
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  topK?: number;

  @ApiPropertyOptional({
    description: 'Cosine distance threshold for retrieval',
    example: 1.0,
    default: 1.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  similarityThreshold?: number;

  // Ingest fields
  @ApiPropertyOptional({
    description: 'Title of the document to ingest',
    example: 'Quantum Computing and Mechanics',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Full text content of document to ingest',
    example: 'Quantum computing is a rapidly emerging technology...',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Source URL of the document',
    example: 'https://open-library.org/science/quantum',
  })
  @IsString()
  @IsOptional()
  sourceUrl?: string;

  @ApiPropertyOptional({
    description: 'Source name or provider',
    example: 'Open Library',
  })
  @IsString()
  @IsOptional()
  sourceName?: string;

  @ApiPropertyOptional({
    description: 'Content type category',
    example: 'research_paper',
  })
  @IsString()
  @IsOptional()
  contentType?: string;

  @ApiPropertyOptional({
    description: 'Authors of the document',
  })
  @IsOptional()
  authors?: string[] | string;

  @ApiPropertyOptional({
    description: 'Arbitrary metadata',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
