import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class Eli5RequestDto {
  @ApiPropertyOptional({ description: 'URL of the document' })
  @IsString()
  @IsOptional()
  documentUrl?: string;

  @ApiPropertyOptional({ description: 'Text of the document' })
  @IsString()
  @IsOptional()
  text?: string;
}

export class Eli5ResponseDto {
  @ApiProperty({ description: 'The simplified explanation' })
  @IsString()
  explanation: string;
}
