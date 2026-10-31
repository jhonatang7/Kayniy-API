import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LessonType {
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

export class CreateLessonDto {
  @ApiProperty({ description: 'Lesson title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Lesson description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Content URL' })
  @IsOptional()
  @IsString()
  urlContent?: string;

  @ApiPropertyOptional({ description: 'Lesson duration in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  duration?: number;

  @ApiProperty({ description: 'Lesson order within the module', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order: number;

  @ApiProperty({ description: 'Lesson type', enum: LessonType })
  @IsNotEmpty()
  @IsEnum(LessonType)
  type: LessonType;

  @ApiProperty({ description: 'Module ID' })
  @IsNotEmpty()
  @IsUUID()
  moduleId: string;
}
