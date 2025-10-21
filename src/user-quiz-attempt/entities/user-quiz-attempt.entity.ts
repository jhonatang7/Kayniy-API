import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Quiz } from '../../quiz/entities/quiz.entity';
import { UserAnswer } from '../../user-answer/entities/user-answer.entity';

@Entity('user_quiz_attempts')
export class UserQuizAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'scoreGotten', type: 'numeric', precision: 5, scale: 2, nullable: true })
  scoreGotten: number;

  @Column({ type: 'boolean', nullable: true })
  aprobed: boolean;

  @CreateDateColumn({
    name: 'attemptDate',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  attemptDate: Date;

  @ManyToOne(() => User, user => user.quizAttempts, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Quiz, quiz => quiz.attempts, { onDelete: 'CASCADE' })
  quiz: Quiz;

  @OneToMany(() => UserAnswer, answer => answer.attempt)
  answers: UserAnswer[];
}