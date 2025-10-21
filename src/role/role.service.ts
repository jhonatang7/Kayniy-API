import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from '../permission/entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const role = this.roleRepository.create({
      name: createRoleDto.name,
    });

    if (createRoleDto.permissionIds?.length > 0) {
      const permissions = await this.permissionRepository.findByIds(createRoleDto.permissionIds);
      role.permissions = permissions;
    }

    return await this.roleRepository.save(role);
  }

  async findAll(): Promise<Role[]> {
    return await this.roleRepository.find({
      relations: ['permissions', 'users'],
    });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions', 'users'],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    if (updateRoleDto.permissionIds) {
      const permissions = await this.permissionRepository.findByIds(updateRoleDto.permissionIds);
      role.permissions = permissions;
    }

    Object.assign(role, updateRoleDto);
    return await this.roleRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    await this.roleRepository.remove(role);
  }

  async addPermissions(id: string, permissionIds: string[]): Promise<Role> {
    const role = await this.findOne(id);
    const permissions = await this.permissionRepository.findByIds(permissionIds);
    role.permissions = [...(role.permissions || []), ...permissions];
    return await this.roleRepository.save(role);
  }

  async removePermissions(id: string, permissionIds: string[]): Promise<Role> {
    const role = await this.findOne(id);
    role.permissions = role.permissions.filter(
      permission => !permissionIds.includes(permission.id),
    );
    return await this.roleRepository.save(role);
  }
}