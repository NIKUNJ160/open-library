import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class WarningDto {
  @ApiProperty({
    description: 'Slug identifier of the connector that generated the warning',
    example: 'core',
  })
  @IsString()
  @IsNotEmpty()
  sourceName: string;

  @ApiProperty({
    description: 'Descriptive message explaining the failure or fallback state',
    example: 'CORE API timeout after 5000ms. Fallback mock data provided.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
