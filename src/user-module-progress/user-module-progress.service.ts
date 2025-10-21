import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserModuleProgress } from './entities/user-module-progress.entity';
import { CreateUserModuleProgressDto } from './dto/create-user-module-progress.dto';

@Injectable()
export class UserModuleProgressService {
  constructor(
    @InjectRepository(UserModuleProgress)
    private readonly userModuleProgressRepository: Repository<UserModuleProgress>,
  ) {}

  async create(createDto: CreateUserModuleProgressDto): Promise<UserModuleProgress> {
    const progress = this.userModuleProgressRepository.create(createDto);
    return await this.userModuleProgressRepository.save(progress);
  }

  async findAll(): Promise<UserModuleProgress[]> {
    return await this.userModuleProgressRepository.find({
      relations: ['user', 'module'],
    });
  }

  async findOne(id: string): Promise<UserModuleProgress> {
    const progress = await this.userModuleProgressRepository.findOne({
      where: { id },
      relations: ['user', 'module'],
    });

    if (!progress) {
      throw new NotFoundException(`User module progress with ID ${id} not found`);
    }

    return progress;
  }

  async update(id: string, updateDto: Partial<CreateUserModuleProgressDto>): Promise<UserModuleProgress> {
    const progress = await this.findOne(id);
    Object.assign(progress, updateDto);
    return await this.userModuleProgressRepository.save(progress);
  }

  async remove(id: string): Promise<void> {
    const progress = await this.findOne(id);
    await this.userModuleProgressRepository.remove(progress);
  }
}