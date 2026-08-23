import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateCollectionDto {
  @ApiProperty({
    description: 'Name of the collection',
    example: 'Deep Learning Papers',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of what this collection is for',
    example: 'A collection of key papers regarding neural networks and transformers.',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
