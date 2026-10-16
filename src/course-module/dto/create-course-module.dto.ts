import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseModuleDto {
  @ApiProperty({ description: 'Course ID' })
  @IsNotEmpty()
  @IsUUID()
  courseId: string;

  @ApiProperty({ description: 'Module ID' })
  @IsNotEmpty()
  @IsUUID()
  moduleId: string;

  @ApiProperty({ description: 'Module position within the course', minimum: 0 })
  @IsInt()
  @Min(0)
  order: number;
}