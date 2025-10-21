import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Module } from '../../module/entities/module.entity';

@Entity('user_module_progress')
export class UserModuleProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  isCompleted: boolean;

  @ManyToOne(() => User, user => user.moduleProgress, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Module, module => module.userProgress, { onDelete: 'CASCADE' })
  module: Module;
}