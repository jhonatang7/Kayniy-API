import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteModuleDto {
  @ApiProperty({ description: 'Module ID' })
  @IsNotEmpty()
  @IsUUID()
  moduleId: string;

  @ApiProperty({ description: 'Course enrollment ID' })
  @IsNotEmpty()
  @IsUUID()
  courseEnrollmentId: string;
}
