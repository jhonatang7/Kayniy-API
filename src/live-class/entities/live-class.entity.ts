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

  @Column({ nullable: true })
  transmitionLink: string;

  @ManyToOne(() => Community, community => community.liveClasses, { onDelete: 'CASCADE' })
  community: Community;

  @ManyToOne(() => User, user => user.liveClasses, { onDelete: 'SET NULL' })
  professor: User;
}