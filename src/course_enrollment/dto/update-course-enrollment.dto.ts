import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class UpdateCourseEnrollmentDto {
  @ApiProperty({ required: false, description: 'Whether the course is completed' })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @ApiProperty({ required: false, description: 'Date when the course was completed' })
  @IsOptional()
  @IsDateString()
  completedDate?: string;
}
