import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { Quiz } from './entities/quiz.entity';
import { Question } from '../question/entities/question.entity';
import { Option } from '../option/entities/option.entity';
import { UserQuizAttempt } from '../user-quiz-attempt/entities/user-quiz-attempt.entity';
import { UserAnswer } from '../user-answer/entities/user-answer.entity';
import { CourseEnrollment } from '../course_enrollment/entities/course-enrollment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quiz,
      Question,
      Option,
      UserQuizAttempt,
      UserAnswer,
      CourseEnrollment,
    ]),
  ],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}