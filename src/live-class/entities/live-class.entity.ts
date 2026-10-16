import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Community } from '../../community/entities/community.entity';
import { User } from '../../user/entities/user.entity';

@Entity('live_class')
export class LiveClass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'timestamp', nullable: false })
  startedDate: Date;

  @Column({ type: 'integer', nullable: false })
  duration: number;

  @Column({ type: 'timestamp', nullable: false })
  expiresAt: Date;

  @Column({ nullable: true })
  transmitionLink: string;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn({
    name: 'registeredDate',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  registeredDate: Date;

  @ManyToOne(() => Community, community => community.liveClasses, { onDelete: 'CASCADE' })
  community: Community;

  @ManyToOne(() => User, user => user.liveClasses, { onDelete: 'SET NULL' })
  professor: User;
}