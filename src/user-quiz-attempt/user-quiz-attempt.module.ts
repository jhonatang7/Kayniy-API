import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserQuizAttemptService } from './user-quiz-attempt.service';
import { UserQuizAttemptController } from './user-quiz-attempt.controller';
import { UserQuizAttempt } from './entities/user-quiz-attempt.entity';
import { CourseEnrollment } from '../course_enrollment/entities/course-enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserQuizAttempt, CourseEnrollment])],
  controllers: [UserQuizAttemptController],
  providers: [UserQuizAttemptService],
  exports: [UserQuizAttemptService],
})
export class UserQuizAttemptModule {}