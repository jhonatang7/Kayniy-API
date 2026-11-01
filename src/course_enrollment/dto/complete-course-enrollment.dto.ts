import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteCourseEnrollmentDto {
  @ApiProperty({ description: 'Course enrollment ID' })
  @IsNotEmpty()
  @IsUUID()
  courseEnrollmentId: string;
}
