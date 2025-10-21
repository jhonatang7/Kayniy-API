import { IsNotEmpty, IsUUID, IsBoolean, IsOptional, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserProgressDto {
  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Lesson ID' })
  @IsNotEmpty()
  @IsUUID()
  lessonId: string;

  @ApiProperty({ description: 'Whether the lesson is completed' })
  @IsNotEmpty()
  @IsBoolean()
  isCompleted: boolean;

  @ApiPropertyOptional({ description: 'Date when the lesson was completed' })
  @IsOptional()
  @IsDate()
  completedDate?: Date;
}