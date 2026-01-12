import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany, CreateDateColumn } from 'typeorm';
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

  @Column({ name: 'passingScore', type: 'smallint', nullable: false })
  passingScore: number;

  @CreateDateColumn({
    name: 'registeredDate',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  registeredDate: Date;

  @OneToOne(() => Module, module => module.quiz, { onDelete: 'CASCADE' })
  @JoinColumn()
  module: Module;

  @OneToMany(() => Question, question => question.quiz)
  questions: Question[];

  @OneToMany(() => UserQuizAttempt, attempt => attempt.quiz)
  attempts: UserQuizAttempt[];
}