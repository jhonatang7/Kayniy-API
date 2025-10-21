import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserQuizAttemptService } from './user-quiz-attempt.service';
import { UserQuizAttemptController } from './user-quiz-attempt.controller';
import { UserQuizAttempt } from './entities/user-quiz-attempt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserQuizAttempt])],
  controllers: [UserQuizAttemptController],
  providers: [UserQuizAttemptService],
  exports: [UserQuizAttemptService],
})
export class UserQuizAttemptModule {}