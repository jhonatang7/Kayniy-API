import { IsNotEmpty, IsString, IsEmail, IsOptional, IsUUID, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'User name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'User last name' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'User email' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({ description: 'User phone number' })
  @IsNotEmpty()
  @IsNumber()
  phoneNumber: number;

  @ApiPropertyOptional({ description: 'User avatar path' })
  @IsOptional()
  @IsString()
  avatarPath?: string;

  @ApiPropertyOptional({ description: 'Is user deleted?' })
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean = false;
}