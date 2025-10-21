import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Permission } from '../../permission/entities/permission.entity';

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: false })
  name: string;

  @OneToMany(() => User, user => user.role)
  users: User[];

  @ManyToMany(() => Permission)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: {
      name: 'rolID',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'permissionID',
      referencedColumnName: 'id',
    },
  })
  permissions: Permission[];
}