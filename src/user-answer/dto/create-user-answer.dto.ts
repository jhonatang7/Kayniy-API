import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserAnswerDto {
  @ApiProperty({ description: 'Quiz attempt ID' })
  @IsNotEmpty()
  @IsUUID()
  attemptId: string;

  @ApiProperty({ description: 'Question ID' })
  @IsNotEmpty()
  @IsUUID()
  questionId: string;

  @ApiProperty({ description: 'Selected option ID' })
  @IsNotEmpty()
  @IsUUID()
  optionId: string;
}