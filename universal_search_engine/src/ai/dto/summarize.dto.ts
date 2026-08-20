import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class SummarizeRequestDto {
  @ApiPropertyOptional({ description: 'URL of the document' })
  @IsString()
  @IsOptional()
  documentUrl?: string;

  @ApiPropertyOptional({ description: 'Text of the document' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({ description: 'Length of the summary', enum: ['short', 'medium', 'long'] })
  @IsEnum(['short', 'medium', 'long'])
  @IsOptional()
  length?: 'short' | 'medium' | 'long' = 'medium';

  @ApiPropertyOptional({ description: 'Tone of the summary', enum: ['formal', 'casual', 'neutral'] })
  @IsEnum(['formal', 'casual', 'neutral'])
  @IsOptional()
  tone?: 'formal' | 'casual' | 'neutral' = 'formal';
}

export class SummarizeResponseDto {
  @ApiProperty({ description: 'The generated summary' })
  @IsString()
  summary: string;
}
