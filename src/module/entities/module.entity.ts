import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { Community } from '../../community/entities/community.entity';
import { Lesson } from '../../lesson/entities/lesson.entity';
import { Quiz } from '../../quiz/entities/quiz.entity';
import { UserModuleProgress } from '../../user-module-progress/entities/user-module-progress.entity';
import { ModuleState } from '../types/state.enum';

@Entity('module')
export class Module {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: false, default: ModuleState.NOT_VERIFIED })
  state: string;

  @CreateDateColumn({
    name: 'registeredDate',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  registeredDate: Date;

  @ManyToOne(() => Course, course => course.modules, { onDelete: 'CASCADE' })
  course: Course;

  @ManyToOne(() => Community, community => community.modules)
  community: Community;

  @OneToMany(() => Lesson, lesson => lesson.module)
  lessons: Lesson[];

  @OneToMany(() => Quiz, quiz => quiz.module)
  quizzes: Quiz[];

  @OneToMany(() => UserModuleProgress, progress => progress.module)
  userProgress: UserModuleProgress[];
}