import { IsNotEmpty, IsString, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOptionDto {
  @ApiProperty({ description: 'Option content' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ description: 'Whether this option is correct' })
  @IsNotEmpty()
  @IsBoolean()
  isCorrect: boolean;

  @ApiProperty({ description: 'Question ID' })
  @IsNotEmpty()
  @IsUUID()
  questionId: string;
}