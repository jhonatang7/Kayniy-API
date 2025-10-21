import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveClass } from './entities/live-class.entity';
import { CreateLiveClassDto } from './dto/create-live-class.dto';
import { UpdateLiveClassDto } from './dto/update-live-class.dto';

@Injectable()
export class LiveClassService {
  constructor(
    @InjectRepository(LiveClass)
    private readonly liveClassRepository: Repository<LiveClass>,
  ) {}

  async create(createLiveClassDto: CreateLiveClassDto): Promise<LiveClass> {
    const liveClass = this.liveClassRepository.create({
      title: createLiveClassDto.title,
      description: createLiveClassDto.description,
      startedDate: createLiveClassDto.startedDate,
      transmitionLink: createLiveClassDto.transmitionLink,
      community: { id: createLiveClassDto.communityId },
      professor: { id: createLiveClassDto.professorId },
    });

    return await this.liveClassRepository.save(liveClass);
  }

  async findAll(): Promise<LiveClass[]> {
    return await this.liveClassRepository.find({
      relations: ['community', 'professor'],
    });
  }

  async findOne(id: string): Promise<LiveClass> {
    const liveClass = await this.liveClassRepository.findOne({
      where: { id },
      relations: ['community', 'professor'],
    });

    if (!liveClass) {
      throw new NotFoundException(`Live class with ID ${id} not found`);
    }

    return liveClass;
  }

  async update(id: string, updateLiveClassDto: UpdateLiveClassDto): Promise<LiveClass> {
    const liveClass = await this.findOne(id);

    if (updateLiveClassDto.communityId) {
      liveClass.community = { id: updateLiveClassDto.communityId } as any;
    }

    if (updateLiveClassDto.professorId) {
      liveClass.professor = { id: updateLiveClassDto.professorId } as any;
    }

    Object.assign(liveClass, {
      ...updateLiveClassDto,
      community: liveClass.community,
      professor: liveClass.professor,
    });

    return await this.liveClassRepository.save(liveClass);
  }

  async remove(id: string): Promise<void> {
    const liveClass = await this.findOne(id);
    await this.liveClassRepository.remove(liveClass);
  }

  async findByCommunity(communityId: string): Promise<LiveClass[]> {
    return await this.liveClassRepository.find({
      where: { community: { id: communityId } },
      relations: ['community', 'professor'],
    });
  }

  async findByProfessor(professorId: string): Promise<LiveClass[]> {
    return await this.liveClassRepository.find({
      where: { professor: { id: professorId } },
      relations: ['community', 'professor'],
    });
  }
}