import { PartialType } from '@nestjs/swagger';
import { CreateLiveClassDto } from './create-live-class.dto';

export class UpdateLiveClassDto extends PartialType(CreateLiveClassDto) {}