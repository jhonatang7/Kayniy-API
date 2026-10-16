import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LessonOrderItemDto {
  @ApiProperty({ description: 'Lesson ID' })
  @IsNotEmpty()
  @IsUUID()
  lessonId: string;

  @ApiProperty({ description: 'Lesson position within the module', minimum: 1 })
  @IsInt()
  @Min(1)
  order: number;
}

export class UpdateLessonOrderDto {
  @ApiProperty({ description: 'Module ID' })
  @IsNotEmpty()
  @IsUUID()
  moduleId: string;

  @ApiProperty({ description: 'Lessons and their new positions', type: [LessonOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LessonOrderItemDto)
  lessons: LessonOrderItemDto[];
}