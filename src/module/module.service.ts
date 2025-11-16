import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Module } from './entities/module.entity';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

@Injectable()
export class ModuleService {
  constructor(
    @InjectRepository(Module)
    private readonly moduleRepository: Repository<Module>,
  ) {}

  async create(createModuleDto: CreateModuleDto): Promise<Module> {
    const module = this.moduleRepository.create({
      title: createModuleDto.title,
      description: createModuleDto.description,
      community: { id: createModuleDto.communityId },
    });

    return await this.moduleRepository.save(module);
  }

  async findAll(): Promise<Module[]> {
    return await this.moduleRepository.find({
      relations: ['course', 'community', 'lessons', 'quizzes', 'userProgress'],
      order:{
        title: "ASC"
      }
    });
  }

  async findOne(id: string): Promise<Module> {
    const module = await this.moduleRepository.findOne({
      where: { id },
      relations: ['course', 'community', 'lessons', 'quizzes', 'userProgress'],
    });

    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    return module;
  }

  async update(id: string, updateModuleDto: UpdateModuleDto): Promise<Module> {
    const module = await this.findOne(id);

    if (updateModuleDto.communityId) {
      module.community = { id: updateModuleDto.communityId } as any;
    }

    Object.assign(module, updateModuleDto);
    return await this.moduleRepository.save(module);
  }

  async remove(id: string): Promise<void> {
    const module = await this.findOne(id);
    await this.moduleRepository.remove(module);
  }

  async findByCourse(courseId: string): Promise<Module[]> {
    return await this.moduleRepository.find({
      where: { course: { id: courseId } },
      relations: ['course', 'community', 'lessons', 'quizzes'],
    });
  }

  async findByCommunity(communityId: string): Promise<Module[]> {
    return await this.moduleRepository.find({
      where: { community: { id: communityId } },
      relations: ['course', 'community', 'lessons', 'quizzes'],
    });
  }
}