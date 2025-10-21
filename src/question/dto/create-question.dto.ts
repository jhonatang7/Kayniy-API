import { IsNotEmpty, IsString, IsNumber, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer'
}

export class CreateQuestionDto {
  @ApiProperty({ description: 'Question title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Question description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Question type', enum: QuestionType })
  @IsNotEmpty()
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({ description: 'Question order in quiz' })
  @IsNotEmpty()
  @IsNumber()
  order: number;

  @ApiProperty({ description: 'Quiz ID' })
  @IsNotEmpty()
  @IsUUID()
  quizId: string;
}