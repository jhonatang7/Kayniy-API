import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateTeacherProfileDto {
  @ApiPropertyOptional({ description: 'Teacher first name' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Teacher last name' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Teacher phone number' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  phoneNumber?: string;
}