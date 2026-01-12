import { IsNotEmpty, IsString, IsNumber, IsOptional, IsUUID, IsEnum, IsArray, ValidateNested, IsBoolean, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateOptionDto } from 'src/option/dto/create-option.dto';

export enum QuestionType {
  UNIQUE_SELECTION = 'UNIQUE_SELECTION',
  MULTIPLE_SELECTION = 'MULTIPLE_SELECTION',
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

  @ApiProperty({ description: 'Points for this question', minimum: 0 })
  @IsNotEmpty()
  @IsNumber()
  points: number;

  @ApiProperty({ description: 'Quiz ID' })
  @IsNotEmpty()
  @IsUUID()
  quizId: string;

  @ApiProperty({ description: 'Options for the question', type: [CreateOptionDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options: CreateOptionDto[];
}