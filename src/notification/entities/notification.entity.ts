import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('notification')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  title: string;

  @Column({ nullable: false })
  message: string;

  @Column({ nullable: false })
  type: string;

  @CreateDateColumn({
    name: 'sentDate',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  sentDate: Date;

  @ManyToOne(() => User, user => user.notifications, { onDelete: 'CASCADE' })
  user: User;
}