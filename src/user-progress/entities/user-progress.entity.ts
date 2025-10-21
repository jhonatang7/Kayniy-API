import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Lesson } from '../../lesson/entities/lesson.entity';

@Entity('user_progress')
export class UserProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'boolean', nullable: false })
  isCompleted: boolean;

  @Column({ name: 'completed_date', type: 'timestamp', nullable: true })
  completedDate: Date;

  @ManyToOne(() => User, user => user.progress, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Lesson, lesson => lesson.userProgress, { onDelete: 'CASCADE' })
  lesson: Lesson;
}