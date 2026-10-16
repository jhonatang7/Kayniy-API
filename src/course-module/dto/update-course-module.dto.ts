import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCourseModuleDto {
	@ApiPropertyOptional({ description: 'Module position within the course', minimum: 0 })
	@IsOptional()
	@IsInt()
	@Min(0)
	order?: number;
}