import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateModuleDto {
  @ApiProperty({ description: 'Module title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Module description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Community ID' })
  @IsNotEmpty()
  @IsUUID()
  communityId: string;
}