import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Question } from '../../question/entities/question.entity';
import { UserAnswer } from '../../user-answer/entities/user-answer.entity';

@Entity('option')
export class Option {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  content: string;

  @Column({ name: 'isCorrect', type: 'boolean', nullable: false })
  isCorrect: boolean;

  @ManyToOne(() => Question, question => question.options, { onDelete: 'CASCADE' })
  question: Question;

  @OneToMany(() => UserAnswer, answer => answer.option)
  userAnswers: UserAnswer[];
}