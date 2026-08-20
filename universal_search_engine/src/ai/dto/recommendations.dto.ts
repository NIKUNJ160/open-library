import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class RecommendationsQueryDto {
  @ApiProperty({ description: 'ID of the document' })
  @IsString()
  documentId: string;

  @ApiPropertyOptional({ description: 'Number of recommendations to return' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 5;
}

export class RecommendationItemDto {
  @ApiProperty({ description: 'Recommended document ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Title of the recommended document' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'URL of the recommended document' })
  @IsString()
  url: string;
}

export class RecommendationsResponseDto {
  @ApiProperty({ description: 'List of recommendations', type: [RecommendationItemDto] })
  @IsArray()
  @Type(() => RecommendationItemDto)
  recommendations: RecommendationItemDto[];
}
