import { IsNotEmpty, IsUUID, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserQuizAttemptDto {
  @ApiPropertyOptional({ description: 'Score obtained in the quiz' })
  @IsOptional()
  @IsNumber()
  scoreGotten?: number;

  @ApiPropertyOptional({ description: 'Whether the attempt was successful' })
  @IsOptional()
  @IsBoolean()
  aprobed?: boolean;

  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Quiz ID' })
  @IsNotEmpty()
  @IsUUID()
  quizId: string;
}