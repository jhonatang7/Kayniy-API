import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityMember } from '../community-member/entities/community-member.entity';
import { CourseEnrollment } from '../course_enrollment/entities/course-enrollment.entity';
import { Course } from '../course/entities/course.entity';
import { Community } from '../community/entities/community.entity';
import { UserModuleProgress } from '../user-module-progress/entities/user-module-progress.entity';
import { UserProgress } from '../user-progress/entities/user-progress.entity';
import { UserQuizAttempt } from '../user-quiz-attempt/entities/user-quiz-attempt.entity';
import { User } from '../user/entities/user.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommunityMember,
      CourseEnrollment,
      Course,
      Community,
      UserProgress,
      UserQuizAttempt,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
