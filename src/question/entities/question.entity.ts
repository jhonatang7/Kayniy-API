import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Quiz } from '../../quiz/entities/quiz.entity';
import { Option } from '../../option/entities/option.entity';
import { UserAnswer } from '../../user-answer/entities/user-answer.entity';

@Entity('question')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: false })
  type: string;

  @Column({ type: 'integer', nullable: false })
  order: number;

  @ManyToOne(() => Quiz, quiz => quiz.questions, { onDelete: 'CASCADE' })
  quiz: Quiz;

  @OneToMany(() => Option, option => option.question)
  options: Option[];

  @OneToMany(() => UserAnswer, answer => answer.question)
  userAnswers: UserAnswer[];
}