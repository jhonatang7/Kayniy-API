import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Correo electrónico de la cuenta' })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
