import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../course/entities/course.entity';
import { User } from '../user/entities/user.entity';
import { CourseEnrollmentController } from './course-enrollment.controller';
import { CourseEnrollmentService } from './course-enrollment.service';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { UserProgress } from '../user-progress/entities/user-progress.entity';
import { UserQuizAttempt } from '../user-quiz-attempt/entities/user-quiz-attempt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseEnrollment,
      User,
      Course,
      UserProgress,
      UserQuizAttempt,
    ]),
  ],
  controllers: [CourseEnrollmentController],
  providers: [CourseEnrollmentService],
  exports: [CourseEnrollmentService],
})
export class CourseEnrollmentModule {}
