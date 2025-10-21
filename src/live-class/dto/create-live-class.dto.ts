import { IsNotEmpty, IsString, IsOptional, IsUUID, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLiveClassDto {
  @ApiProperty({ description: 'Live class title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Live class description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Live class start date' })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  startedDate: Date;

  @ApiPropertyOptional({ description: 'Live class transmission link' })
  @IsOptional()
  @IsString()
  transmitionLink?: string;

  @ApiProperty({ description: 'Community ID' })
  @IsNotEmpty()
  @IsUUID()
  communityId: string;

  @ApiProperty({ description: 'Professor ID' })
  @IsNotEmpty()
  @IsUUID()
  professorId: string;
}