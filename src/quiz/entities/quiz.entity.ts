import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { Module } from '../../module/entities/module.entity';
import { Question } from '../../question/entities/question.entity';
import { UserQuizAttempt } from '../../user-quiz-attempt/entities/user-quiz-attempt.entity';

@Entity('quiz')
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'passingScore', type: 'numeric', precision: 5, scale: 2, nullable: false })
  passingScore: number;

  @Column({ name: 'responseTime', type: 'numeric', precision: 5, scale: 2, nullable: false })
  responseTime: number;

  @CreateDateColumn({
    name: 'registeredDate',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  registeredDate: Date;

  @ManyToOne(() => Module, module => module.quizzes, { onDelete: 'CASCADE' })
  module: Module;

  @OneToMany(() => Question, question => question.quiz)
  questions: Question[];

  @OneToMany(() => UserQuizAttempt, attempt => attempt.quiz)
  attempts: UserQuizAttempt[];
}