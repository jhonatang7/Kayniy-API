import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Lesson } from '../../lesson/entities/lesson.entity';
import { CourseEnrollment } from '../../course_enrollment/entities/course-enrollment.entity';

@Entity('user_progress')
@Unique('UQ_user_progress_user_lesson_enrollment', [
  'user',
  'lesson',
  'courseEnrollment',
])
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

  @ManyToOne(() => CourseEnrollment, { onDelete: 'CASCADE', nullable: false })
  courseEnrollment: CourseEnrollment;
}