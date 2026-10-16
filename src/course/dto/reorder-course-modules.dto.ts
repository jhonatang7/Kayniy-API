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

export class CourseModuleOrderItem {
  @ApiProperty({ description: 'Module ID' })
  @IsNotEmpty()
  @IsUUID()
  moduleId: string;

  @ApiProperty({ description: 'Module position within the course', minimum: 0 })
  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderCourseModulesDto {
  @ApiProperty({ description: 'Course ID' })
  @IsNotEmpty()
  @IsUUID()
  courseId: string;

  @ApiProperty({ type: [CourseModuleOrderItem] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CourseModuleOrderItem)
  modules: CourseModuleOrderItem[];
}
