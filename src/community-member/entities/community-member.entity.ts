import { Community } from "src/community/entities/community.entity";
import { User } from "src/user/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

export enum CommunityRole {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

@Entity('community_member')
export class CommunityMember {
  // Según tu código anterior usas UUID
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: CommunityRole,
    default: CommunityRole.STUDENT,
    name: 'communityRole'
  })
  communityRole: CommunityRole;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedDate: Date;

  // Relación con Comunidad
  @ManyToOne(() => Community, (community) => community.members, { 
    onDelete: 'CASCADE' // Si se borra la comunidad, se borran sus miembros
  })
  @JoinColumn({ name: 'communityID' }) // Forzamos el nombre exacto de tu DB Diagram
  community: Community;

  // Relación con Usuario
  @ManyToOne(() => User, (user) => user.communityMemberships, {
    onDelete: 'CASCADE' // Si se borra el usuario, se borra de la comunidad
  })
  @JoinColumn({ name: 'userID' })
  user: User;
}
