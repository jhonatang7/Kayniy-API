import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, ManyToMany } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { Module } from '../../module/entities/module.entity';
import { LiveClass } from '../../live-class/entities/live-class.entity';

@Entity('community')
export class Community {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'userID', nullable: true })
  userId: string;

  @CreateDateColumn({ 
    name: 'registeredDate',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP' 
  })
  registeredDate: Date;

  @OneToMany(() => Course, course => course.community)
  courses: Course[];

  @OneToMany(() => Module, module => module.community)
  modules: Module[];

  @OneToMany(() => LiveClass, liveClass => liveClass.community)
  liveClasses: LiveClass[];

  @ManyToMany(() => User, user => user.teachingCommunities)
  professors: User[];

  @ManyToMany(() => User, user => user.enrolledCommunities)
  students: User[];
}