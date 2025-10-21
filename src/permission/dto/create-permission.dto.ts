import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({
    description: 'The name of the permission',
    example: 'CREATE_USER'
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}