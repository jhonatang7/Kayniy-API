import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { UserQuizAttempt } from '../../user-quiz-attempt/entities/user-quiz-attempt.entity';
import { Question } from '../../question/entities/question.entity';
import { Option } from '../../option/entities/option.entity';

@Entity('user_answers')
export class UserAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserQuizAttempt, attempt => attempt.answers, { onDelete: 'CASCADE' })
  attempt: UserQuizAttempt;

  @ManyToOne(() => Question, question => question.userAnswers, { onDelete: 'CASCADE' })
  question: Question;

  @ManyToOne(() => Option, option => option.userAnswers, { onDelete: 'SET NULL' })
  option: Option;
}