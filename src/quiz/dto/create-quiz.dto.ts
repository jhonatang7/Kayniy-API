import { IsNotEmpty, IsString, IsNumber, IsOptional, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuizDto {
  @ApiProperty({ description: 'Quiz name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Quiz description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Passing score (percentage)', minimum: 0, maximum: 100 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore: number;

  @ApiProperty({ description: 'Module ID' })
  @IsNotEmpty()
  @IsUUID()
  moduleId: string;
}