import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Community } from '../../community/entities/community.entity';
import { Module } from '../../module/entities/module.entity';

@Entity('course')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: false })
  level: string;

  @CreateDateColumn({
    name: 'registeredDate',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  registeredDate: Date;

  @Column({ nullable: true })
  isDeleted: boolean;

  @ManyToOne(() => User, user => user.courses, { onDelete: 'SET NULL' })
  user: User;

  @ManyToOne(() => Community, community => community.courses)
  community: Community;

  @OneToMany(() => Module, module => module.course)
  modules: Module[];
}