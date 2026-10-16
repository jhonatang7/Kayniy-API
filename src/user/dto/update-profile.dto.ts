import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Nombre del usuario' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Apellido del usuario' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Número de teléfono del usuario' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  phoneNumber?: string;
}
