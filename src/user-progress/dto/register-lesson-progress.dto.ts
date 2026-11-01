import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterLessonProgressDto {
  @ApiProperty({ description: 'Lesson ID' })
  @IsNotEmpty()
  @IsUUID()
  lessonId: string;

  @ApiProperty({ description: 'Course enrollment ID' })
  @IsNotEmpty()
  @IsUUID()
  courseEnrollmentId: string;
}
