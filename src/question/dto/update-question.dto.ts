import { IsNotEmpty, IsString, IsOptional, IsUUID, IsEnum, IsArray, ValidateNested, IsBoolean, ArrayMinSize, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { QuestionType } from './create-question.dto';

export class UpdateOptionDto {
  @ApiPropertyOptional({ description: 'Option ID (if exists)' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ description: 'Option content' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ description: 'Whether this option is correct' })
  @IsNotEmpty()
  @IsBoolean()
  isCorrect: boolean;
}

export class UpdateQuestionDto {
  @ApiPropertyOptional({ description: 'Question title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Question description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Question type', enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiPropertyOptional({ description: 'Points for this question', minimum: 0 })
  @IsOptional()
  @IsNumber()
  points?: number;

  @ApiPropertyOptional({ description: 'Quiz ID' })
  @IsOptional()
  @IsUUID()
  quizId?: string;

  @ApiPropertyOptional({ description: 'Options for the question', type: [UpdateOptionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => UpdateOptionDto)
  options?: UpdateOptionDto[];
}