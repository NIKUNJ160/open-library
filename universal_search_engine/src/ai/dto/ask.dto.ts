import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class AskRequestDto {
  @ApiPropertyOptional({ description: 'URL of the document' })
  @IsString()
  @IsOptional()
  documentUrl?: string;

  @ApiPropertyOptional({ description: 'Text of the document' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiProperty({ description: 'The question to ask about the document' })
  @IsString()
  question: string;
}

export class AskResponseDto {
  @ApiProperty({ description: 'The answer to the question' })
  @IsString()
  answer: string;
}
