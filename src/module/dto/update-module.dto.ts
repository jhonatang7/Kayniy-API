import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateModuleDto } from './create-module.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ModuleState } from '../types/state.enum';

export class UpdateModuleDto extends PartialType(CreateModuleDto) {
  @ApiProperty({ description: 'Module state' })
  @IsOptional()
  @IsEnum(ModuleState, {
    message: 'El estado solo puede ser "NOT_VERIFIED" o "VERIFIED"',
  })
  state?: ModuleState;
}
