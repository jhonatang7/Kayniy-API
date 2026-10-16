import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseModule } from './entities/course-module.entity';
import { CourseModuleService } from './course-module.service';
import { CourseModuleController } from './course-module.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CourseModule])],
  controllers: [CourseModuleController],
  providers: [CourseModuleService],
  exports: [CourseModuleService],
})
export class CourseModuleModule {}