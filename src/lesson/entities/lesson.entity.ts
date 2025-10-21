import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Module } from '../../module/entities/module.entity';
import { UserProgress } from '../../user-progress/entities/user-progress.entity';

@Entity('lesson')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column({ nullable: false })
  title: string;
  
  @Column({ nullable: true })
  description: string;
  
  @Column({ name: 'urlContent', nullable: true })
  urlContent: string;
  
  @Column({ type: 'integer', nullable: true })
  duration: number;

  @Column({ nullable: false })
  type: string;
  
  @ManyToOne(() => Module, module => module.lessons, { onDelete: 'CASCADE' })
  module: Module;

  @OneToMany(() => UserProgress, progress => progress.lesson)
  userProgress: UserProgress[];
}