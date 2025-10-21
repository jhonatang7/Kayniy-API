import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProgress } from './entities/user-progress.entity';
import { CreateUserProgressDto } from './dto/create-user-progress.dto';

@Injectable()
export class UserProgressService {
  constructor(
    @InjectRepository(UserProgress)
    private readonly userProgressRepository: Repository<UserProgress>,
  ) {}

  async create(createDto: CreateUserProgressDto): Promise<UserProgress> {
    const progress = this.userProgressRepository.create(createDto);
    return await this.userProgressRepository.save(progress);
  }

  async findAll(): Promise<UserProgress[]> {
    return await this.userProgressRepository.find({
      relations: ['user', 'lesson'],
    });
  }

  async findOne(id: string): Promise<UserProgress> {
    const progress = await this.userProgressRepository.findOne({
      where: { id },
      relations: ['user', 'lesson'],
    });

    if (!progress) {
      throw new NotFoundException(`User progress with ID ${id} not found`);
    }

    return progress;
  }

  async update(id: string, updateDto: Partial<CreateUserProgressDto>): Promise<UserProgress> {
    const progress = await this.findOne(id);
    Object.assign(progress, updateDto);
    return await this.userProgressRepository.save(progress);
  }

  async remove(id: string): Promise<void> {
    const progress = await this.findOne(id);
    await this.userProgressRepository.remove(progress);
  }
}