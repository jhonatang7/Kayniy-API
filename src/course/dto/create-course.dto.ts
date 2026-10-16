import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CourseLevel {
  BASIC = 'Basic',
  MEDIUM = 'Medium',
  HARD = 'Hard',
}

export class CourseModuleItemDto {
  @ApiProperty({ description: 'Module ID' })
  @IsNotEmpty()
  @IsUUID()
  moduleId: string;

  @ApiProperty({ description: 'Module position within the course', minimum: 0 })
  @IsInt()
  @Min(0)
  order: number;
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
  @IsEnum(CourseLevel)
  level: CourseLevel;

  @ApiProperty({ description: 'User ID (creator)' })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Community ID' })
  @IsNotEmpty()
  @IsUUID()
  communityId: string;

  @ApiProperty({
    description: 'Modules assigned to the course and their order',
    type: [CourseModuleItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CourseModuleItemDto)
  modules: CourseModuleItemDto[];
}