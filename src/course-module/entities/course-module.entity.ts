import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { Module } from '../../module/entities/module.entity';

@Entity('course_module')
@Unique(['course', 'module'])
export class CourseModule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Course, course => course.courseModules, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'courseID' })
  course: Course;

  @ManyToOne(() => Module, module => module.courseModules, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'moduleID' })
  module: Module;

  @Column({ type: 'integer', name: 'order', nullable: false })
  order: number;
}