import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { User } from '../../user/entities/user.entity';

@Entity('course_enrollment')
@Unique('UQ_course_enrollment_user_course', ['user', 'course'])
export class CourseEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({
    name: 'enrollmentDate',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  enrollmentDate: Date;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ name: 'completedDate', type: 'timestamp', nullable: true })
  completedDate: Date | null;

  @ManyToOne(() => User, (user) => user.courseEnrollments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userID' })
  user: User;

  @ManyToOne(() => Course, (course) => course.enrollments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'courseID' })
  course: Course;
}
