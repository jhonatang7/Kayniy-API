import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModuleProgressService } from './user-module-progress.service';
import { UserModuleProgressController } from './user-module-progress.controller';
import { UserModuleProgress } from './entities/user-module-progress.entity';
import { Module as CourseModuleEntity } from '../module/entities/module.entity';
import { Lesson } from '../lesson/entities/lesson.entity';
import { Quiz } from '../quiz/entities/quiz.entity';
import { UserProgress } from '../user-progress/entities/user-progress.entity';
import { UserQuizAttempt } from '../user-quiz-attempt/entities/user-quiz-attempt.entity';
import { CourseEnrollment } from '../course_enrollment/entities/course-enrollment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserModuleProgress,
      CourseModuleEntity,
      Lesson,
      Quiz,
      UserProgress,
      UserQuizAttempt,
      CourseEnrollment,
    ]),
  ],
  controllers: [UserModuleProgressController],
  providers: [UserModuleProgressService],
  exports: [UserModuleProgressService],
})
export class UserModuleProgressModule {}