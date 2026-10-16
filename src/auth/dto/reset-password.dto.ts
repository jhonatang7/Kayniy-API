import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token de recuperación recibido en el enlace del correo' })
  @IsNotEmpty()
  @IsJWT()
  token: string;

  @ApiProperty({ description: 'Nueva contraseña del usuario', minLength: 8 })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}
