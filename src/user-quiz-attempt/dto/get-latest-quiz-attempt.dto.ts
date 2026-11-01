import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetLatestQuizAttemptDto {
  @ApiProperty({ description: 'Quiz ID' })
  @IsNotEmpty()
  @IsUUID()
  quizId: string;

  @ApiProperty({ description: 'Course enrollment ID' })
  @IsNotEmpty()
  @IsUUID()
  courseEnrollmentId: string;
}
