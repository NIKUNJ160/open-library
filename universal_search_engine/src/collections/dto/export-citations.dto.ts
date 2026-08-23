import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray, IsIn } from 'class-validator';

export class ExportCitationsDto {
  @ApiProperty({
    description: 'Citation format style',
    enum: ['apa', 'mla', 'chicago', 'bibtex', 'ris'],
    example: 'bibtex',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['apa', 'mla', 'chicago', 'bibtex', 'ris'])
  format: 'apa' | 'mla' | 'chicago' | 'bibtex' | 'ris';

  @ApiPropertyOptional({
    description: 'Collection ID (UUID) to export all documents inside',
    example: 'd21c2d2e-4b68-4a6c-94df-d9d13e9a4f6a',
  })
  @IsUUID()
  @IsOptional()
  collectionId?: string;

  @ApiPropertyOptional({
    description: 'Specific Document IDs to generate citations for',
    example: ['b1c5d6c1-b6f5-415c-a9af-2df1a6ee7605'],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  documentIds?: string[];

  @ApiPropertyOptional({
    description: 'Arbitrary list of metadata records to format (useful if not in database)',
  })
  @IsArray()
  @IsOptional()
  items?: Record<string, any>[];
}
