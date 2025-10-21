import { IsNotEmpty, IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export class CreateCourseDto {
  @ApiProperty({ description: 'Course name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Course description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Course level', enum: CourseLevel })
  @IsNotEmpty()
  @IsString()
  level: CourseLevel;

  @ApiPropertyOptional({ description: 'Is course deleted?' })
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean = false;

  @ApiProperty({ description: 'User ID (creator)' })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Community ID' })
  @IsNotEmpty()
  @IsUUID()
  communityId: string;
}