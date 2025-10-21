import { IsNotEmpty, IsString, IsOptional, IsUUID, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LessonType {
  VIDEO = 'video',
  DOCUMENT = 'document',
  PRESENTATION = 'presentation',
  INTERACTIVE = 'interactive'
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
  @IsNumber()
  duration?: number;

  @ApiProperty({ description: 'Lesson type', enum: LessonType })
  @IsNotEmpty()
  @IsEnum(LessonType)
  type: LessonType;

  @ApiProperty({ description: 'Module ID' })
  @IsNotEmpty()
  @IsUUID()
  moduleId: string;
}