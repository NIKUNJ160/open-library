import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class RagIngestDto {
  @ApiProperty({
    description: 'Title of the document',
    example: 'Quantum Computing and Quantum Mechanics Overview',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Full text content of the document to ingest and chunk into pgvector',
    example:
      'Quantum computing is a rapidly-emerging technology that harnesses the laws of quantum mechanics to solve problems too complex for classical computers. Key principles include superposition, entanglement, and quantum interference.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Source URL of the document',
    example: 'https://open-library.org/science/quantum-overview',
  })
  @IsString()
  @IsOptional()
  sourceUrl?: string;

  @ApiPropertyOptional({
    description: 'Source name or publisher',
    example: 'Open Library Scientific',
  })
  @IsString()
  @IsOptional()
  sourceName?: string;

  @ApiPropertyOptional({
    description: 'Content type category (e.g. book, research_paper, article, documentation)',
    example: 'research_paper',
  })
  @IsString()
  @IsOptional()
  contentType?: string;

  @ApiPropertyOptional({
    description: 'Authors of the document',
    example: ['Dr. Alice Vance', 'Prof. Bob Smith'],
  })
  @IsOptional()
  authors?: string[] | string;

  @ApiPropertyOptional({
    description: 'Arbitrary metadata key-value pairs',
    example: { doi: '10.1000/182', year: 2024, subject: 'Physics' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class RagIngestResponseDto {
  @ApiProperty({ description: 'Operation status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Persisted document UUID in PostgreSQL', example: 'd3b07384-d113-40a2-9447-e16104449830' })
  documentId: string;

  @ApiProperty({ description: 'Number of chunks created and embedded', example: 3 })
  chunksCount: number;

  @ApiProperty({ description: 'Status message', example: 'Successfully ingested and vectorized document with 3 chunks.' })
  message: string;
}
