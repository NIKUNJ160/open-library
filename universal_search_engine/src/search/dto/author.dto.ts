import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AuthorDto {
  @ApiProperty({
    description: 'Full name of the author or contributing entity',
    example: 'Albert Einstein',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Institutional affiliation or organization',
    example: 'Institute for Advanced Study, Princeton',
  })
  @IsString()
  @IsOptional()
  affiliation?: string;
}
