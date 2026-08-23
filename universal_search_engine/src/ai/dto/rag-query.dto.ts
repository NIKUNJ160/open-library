import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RagQueryDto {
  @ApiProperty({
    description: 'Natural language question to answer using RAG',
    example: 'What is quantum superposition and how does it benefit computing?',
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiPropertyOptional({
    description: 'Number of top similar chunks to retrieve from pgvector',
    example: 5,
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  topK?: number = 5;

  @ApiPropertyOptional({
    description: 'Cosine distance threshold for retrieval (smaller is more similar, 1.0 default)',
    example: 1.0,
    default: 1.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  similarityThreshold?: number = 1.0;
}

export class RagSourceChunkDto {
  @ApiProperty({ description: 'Chunk text content' })
  content: string;

  @ApiProperty({ description: 'Index of chunk within the document', example: 0 })
  chunkIndex: number;

  @ApiProperty({ description: 'Source document UUID', example: 'd3b07384-d113-40a2-9447-e16104449830' })
  documentId: string;

  @ApiPropertyOptional({ description: 'Source document title', example: 'Quantum Computing Fundamentals' })
  documentTitle?: string;

  @ApiPropertyOptional({ description: 'Source URL if available', example: 'https://example.com/doc' })
  sourceUrl?: string;

  @ApiPropertyOptional({ description: 'Source name or provider', example: 'Open Library' })
  sourceName?: string;
}

export class RagQueryResponseDto {
  @ApiProperty({ description: 'Original user question', example: 'What is quantum superposition?' })
  question: string;

  @ApiProperty({ description: 'AI-generated context-grounded answer' })
  answer: string;

  @ApiProperty({ description: 'Retrieved context chunks used for grounding', type: [RagSourceChunkDto] })
  sources: RagSourceChunkDto[];

  @ApiProperty({ description: 'Nvidia NIM LLM model used for generation', example: 'openai/gpt-oss-120b' })
  model: string;

  @ApiProperty({ description: 'Number of retrieved chunks used as context', example: 3 })
  retrievedChunksCount: number;
}
