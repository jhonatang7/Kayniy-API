import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { Role } from '../../role/entities/role.entity';
import { Community } from '../../community/entities/community.entity';
import { Course } from '../../course/entities/course.entity';
import { LiveClass } from '../../live-class/entities/live-class.entity';
import { Notification } from '../../notification/entities/notification.entity';
import { UserProgress } from '../../user-progress/entities/user-progress.entity';
import { UserModuleProgress } from '../../user-module-progress/entities/user-module-progress.entity';
import { UserQuizAttempt } from '../../user-quiz-attempt/entities/user-quiz-attempt.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  firstName: string;

  @Column({ nullable: false })
  lastName: string;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ nullable: false })
  password: string;

  @Column({ nullable: false })
  phoneNumber: number;

  @Column({ nullable: true })
  avatarPath: string;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({ nullable: false })
  isDeleted: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  registerDate: Date;

  @ManyToOne(() => Role, { onDelete: 'SET NULL' })
  role: Role;

  @OneToMany(() => Course, course => course.user)
  courses: Course[];

  @OneToMany(() => LiveClass, liveClass => liveClass.professor)
  liveClasses: LiveClass[];

  @OneToMany(() => Notification, notification => notification.user)
  notifications: Notification[];

  @OneToMany(() => UserProgress, progress => progress.user)
  progress: UserProgress[];

  @OneToMany(() => UserModuleProgress, progress => progress.user)
  moduleProgress: UserModuleProgress[];

  @OneToMany(() => UserQuizAttempt, attempt => attempt.user)
  quizAttempts: UserQuizAttempt[];

  @ManyToMany(() => Community)
  @JoinTable({
    name: 'community_professors',
    joinColumn: {
      name: 'professorID',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'communityID',
      referencedColumnName: 'id'
    }
  })
  teachingCommunities: Community[];

  @ManyToMany(() => Community)
  @JoinTable({
    name: 'community_students',
    joinColumn: {
      name: 'studentID',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'communityID',
      referencedColumnName: 'id'
    }
  })
  enrolledCommunities: Community[];
}