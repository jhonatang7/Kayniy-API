import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, DeleteDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { Module } from '../../module/entities/module.entity';
import { LiveClass } from '../../live-class/entities/live-class.entity';
import { CommunityMember } from 'src/community-member/entities/community-member.entity';

@Entity('community')
export class Community {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn({ 
    name: 'registeredDate',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP' 
  })
  registeredDate: Date;

  @DeleteDateColumn({ name: 'deletedAt', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => Course, course => course.community)
  courses: Course[];

  @OneToMany(() => Module, module => module.community)
  modules: Module[];

  @OneToMany(() => LiveClass, liveClass => liveClass.community)
  liveClasses: LiveClass[];

  @OneToMany(() => CommunityMember, (communityMember) => communityMember.community)
  members: CommunityMember[];
}