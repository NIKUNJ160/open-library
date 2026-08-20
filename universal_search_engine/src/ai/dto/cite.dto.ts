import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsObject } from 'class-validator';

export class CiteRequestDto {
  @ApiProperty({ description: 'Metadata of the resource' })
  @IsObject()
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Citation format', enum: ['apa', 'mla', 'chicago', 'bibtex', 'ris'] })
  @IsEnum(['apa', 'mla', 'chicago', 'bibtex', 'ris'])
  format: 'apa' | 'mla' | 'chicago' | 'bibtex' | 'ris';
}

export class CiteResponseDto {
  @ApiProperty({ description: 'The generated citation' })
  @IsString()
  citation: string;
}
