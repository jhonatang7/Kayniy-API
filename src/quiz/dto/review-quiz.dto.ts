import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewQuizQuestionDto {
  @ApiProperty({ description: 'Question ID' })
  @IsNotEmpty()
  @IsUUID()
  questionId: string;

  @ApiProperty({
    description: 'Selected option IDs for this question',
    type: [String],
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  answers: string[];
}

export class ReviewQuizDto {
  @ApiProperty({ description: 'Quiz ID' })
  @IsNotEmpty()
  @IsUUID()
  quizId: string;

  @ApiProperty({ description: 'Course enrollment ID' })
  @IsNotEmpty()
  @IsUUID()
  courseEnrollmentId: string;

  @ApiProperty({
    description: 'Questions and selected option IDs',
    type: [ReviewQuizQuestionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewQuizQuestionDto)
  questions: ReviewQuizQuestionDto[];
}
