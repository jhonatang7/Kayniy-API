import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { Lesson } from './entities/lesson.entity';
import { CloudflareModule } from '../cloudflare/cloudflare.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lesson]),
    CloudflareModule,
  ],
  controllers: [LessonController],
  providers: [LessonService],
  exports: [LessonService],
})
export class LessonModule {}