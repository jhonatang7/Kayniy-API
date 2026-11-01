import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProgressService } from './user-progress.service';
import { UserProgressController } from './user-progress.controller';
import { UserProgress } from './entities/user-progress.entity';
import { Lesson } from '../lesson/entities/lesson.entity';
import { User } from '../user/entities/user.entity';
import { CourseEnrollment } from '../course_enrollment/entities/course-enrollment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserProgress, Lesson, User, CourseEnrollment]),
  ],
  controllers: [UserProgressController],
  providers: [UserProgressService],
  exports: [UserProgressService],
})
export class UserProgressModule {}